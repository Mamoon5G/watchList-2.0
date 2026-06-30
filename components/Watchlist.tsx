"use client"

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Category, WatchlistItem as WatchlistItemType } from '@/lib/types';
import { WatchlistItem } from './WatchlistItem';
import { AddItemComposer } from './AddItemComposer';
import { ThemeToggle } from './ThemeToggle';
import { searchTMDBImage } from '@/lib/tmdb';
import { searchGoogleBooksImage } from '@/lib/books';
import { toast } from 'sonner';
import { LogOut, Share2, Film, Tv, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';

export function Watchlist({ profileUid, profileUsername }: { profileUid: string, profileUsername: string }) {
  const [items, setItems] = useState<WatchlistItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState(false);
  
  const [activeTab, setActiveTab] = useState<Category | 'all'>('all');
  
  const router = useRouter();

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'mock-api-key' || !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      setFirebaseError(true);
      setAuthLoading(false);
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setIsOwner(user?.uid === profileUid);
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, [profileUid]);

  useEffect(() => {
    if (firebaseError) return;

    const itemsRef = collection(db, 'users', profileUid, 'watchlist');
    const q = query(itemsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WatchlistItemType));
      setItems(newItems);
      setLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      toast.error('Failed to load watchlist items.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profileUid, firebaseError]);

  // Backfill images for existing items
  useEffect(() => {
    if (!isOwner || items.length === 0) return;

    const backfillImages = async () => {
      const itemsToUpdate = items.filter(item => item.imageUrl === undefined);
      if (itemsToUpdate.length === 0) return;

      for (const item of itemsToUpdate) {
        try {
          let imageUrl = null;
          if (item.type === 'books' || (item.type as string) === 'comics') {
            imageUrl = await searchGoogleBooksImage(item.name);
          } else {
            imageUrl = await searchTMDBImage(item.name, item.type);
          }
          
          const itemRef = doc(db, 'users', profileUid, 'watchlist', item.id);
          // Set to null if not found so we don't keep retrying
          await updateDoc(itemRef, { imageUrl: imageUrl || null });
        } catch (error) {
          console.error(`Failed to backfill image for ${item.name}:`, error);
        }
      }
    };

    backfillImages();
  }, [items, isOwner, profileUid]);

  const handleAdd = async (name: string, type: Category, watched: boolean) => {
    if (!isOwner) return;
    try {
      // Async TMDB Search for Image without blocking the UI right away
      // Actually, doing it before addDoc is fine, but can delay UI. We'll do it before.
      let imageUrl = null;
      if (type === 'books') {
        imageUrl = await searchGoogleBooksImage(name);
      } else {
        imageUrl = await searchTMDBImage(name, type);
      }
      
      const itemsRef = collection(db, 'users', profileUid, 'watchlist');
      await addDoc(itemsRef, {
        name,
        type,
        watched,
        createdAt: Date.now(),
        imageUrl
      });
      toast.success('Added to watchlist');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add item');
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    if (!isOwner) return;
    try {
      const itemRef = doc(db, 'users', profileUid, 'watchlist', id);
      await updateDoc(itemRef, { watched: !current });
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!isOwner) return;
    try {
      const itemRef = doc(db, 'users', profileUid, 'watchlist', id);
      await deleteDoc(itemRef);
      toast.success('Item deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete item');
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const handleLogout = async () => {
    await signOut(auth);
    toast.success('Logged out');
    router.push('/');
  };

  const uniqueItems = useMemo(() => {
    const seen = new Set<string>();
    return items.filter(item => {
      const typeStr = (item.type as string) === 'comics' ? 'books' : item.type;
      const key = `${item.name.toLowerCase().trim()}-${typeStr}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    return uniqueItems.filter(item => activeTab === 'all' || item.type === activeTab || (activeTab === 'books' && (item.type as string) === 'comics'));
  }, [uniqueItems, activeTab]);

  const pendingItems = filteredItems.filter(item => !item.watched);
  const finishedItems = filteredItems.filter(item => item.watched);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (firebaseError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="p-8 text-center bg-red-50 dark:bg-red-950/30 rounded-2xl border border-red-200 dark:border-red-900/50 max-w-md w-full">
          <h3 className="text-red-800 dark:text-red-400 font-medium mb-2">Firebase Configuration Missing</h3>
          <p className="text-sm text-red-600 dark:text-red-500">Please add your Firebase config to the environment variables to view this watchlist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 flex flex-col min-h-screen">
      {/* Header */}
      <nav className="flex items-center justify-between border-b border-neutral-200/40 dark:border-neutral-800/40 pb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white">
            <Tv className="w-4 h-4" />
          </div>
          <span className="text-lg font-black tracking-tighter uppercase text-neutral-900 dark:text-white">Watchly</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={handleShare}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-all text-indigo-500"
            aria-label="Share link"
            title="Share link"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <ThemeToggle />
          {isOwner ? (
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-all"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => router.push('/')}
              className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-medium hover:bg-indigo-600 transition-colors shadow-sm"
            >
              Create Mine
            </button>
          )}
        </div>
      </nav>

      <header className="flex items-center gap-2 animate-slide-down">
        <h1 className="text-xl sm:text-2xl font-black tracking-tight whitespace-nowrap">
          <span className="uppercase text-neutral-900 dark:text-white">{profileUsername}'s</span>
          <span className="text-indigo-500 ml-1 italic uppercase">Watchlist</span>
        </h1>
        <div className="h-px flex-1 bg-neutral-200/40 dark:bg-neutral-800/40"></div>
        <div className="h-2 w-2 rounded-full bg-pink-400/80"></div>
      </header>

      {/* Composer */}
      {isOwner && (
        <div className="space-y-4 relative z-20">
          <AddItemComposer onAdd={handleAdd} activeTab={activeTab} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2 hide-scrollbar border-b border-neutral-200/40 dark:border-neutral-800/40 -mx-4 px-4 sm:mx-0 sm:px-0">
        {(['all', 'movie', 'series', 'anime', 'books'] as const).map((tab) => (
          <button
            key={tab}
            onMouseDown={(e) => {
              e.preventDefault();
              setActiveTab(tab as Category | 'all');
            }}
            onClick={() => setActiveTab(tab as Category | 'all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap capitalize shrink-0 ${
              activeTab === tab 
                ? 'bg-indigo-500 text-white shadow-md' 
                : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            {tab === 'books' ? 'books & comics' : tab}
          </button>
        ))}
      </div>

      {/* Lists */}
      <main className="space-y-6 pt-4 flex-1">
        {activeTab === 'all' ? (
          <div className="space-y-12">
            {(['movie', 'series', 'anime', 'books'] as Category[]).map(cat => {
              const catItems = uniqueItems.filter(i => i.type === cat || (cat === 'books' && (i.type as string) === 'comics'));
            if (catItems.length === 0) return null;
            
            const catPending = catItems.filter(i => !i.watched);
            const catFinished = catItems.filter(i => i.watched);
            
            return (
              <div key={cat} className="space-y-8">
                <h2 className="text-2xl font-bold capitalize text-neutral-900 dark:text-white mb-2 border-b border-neutral-200 dark:border-neutral-800 pb-4">
                  {cat === 'series' ? 'Series' : cat === 'movie' ? 'Movies' : cat === 'books' ? 'Books & Comics' : cat}
                </h2>
                
                {catPending.length > 0 && (
                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4 px-2">Pending</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      <AnimatePresence mode="popLayout">
                        {catPending.map(item => (
                          <WatchlistItem key={item.id} item={item} isOwner={isOwner} onToggle={handleToggle} onDelete={handleDelete} />
                        ))}
                      </AnimatePresence>
                    </div>
                  </section>
                )}
                
                {catFinished.length > 0 && (
                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4 px-2">Finished</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      <AnimatePresence mode="popLayout">
                        {catFinished.map(item => (
                          <WatchlistItem key={item.id} item={item} isOwner={isOwner} onToggle={handleToggle} onDelete={handleDelete} />
                        ))}
                      </AnimatePresence>
                    </div>
                  </section>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-12">
          {pendingItems.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4 px-2">Pending</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <AnimatePresence mode="popLayout">
                  {pendingItems.map(item => (
                    <WatchlistItem key={item.id} item={item} isOwner={isOwner} onToggle={handleToggle} onDelete={handleDelete} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {finishedItems.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4 px-2">Finished</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <AnimatePresence mode="popLayout">
                  {finishedItems.map(item => (
                    <WatchlistItem key={item.id} item={item} isOwner={isOwner} onToggle={handleToggle} onDelete={handleDelete} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}
        </div>
      )}

      {filteredItems.length === 0 && (
        <div className="py-12 border border-dashed border-neutral-200/40 dark:border-neutral-800/40 rounded-2xl text-center mt-4">
          <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest opacity-50 italic">No entries yet</p>
        </div>
      )}
      </main>

      <footer className="mt-auto flex flex-col gap-2 pt-6 text-[9px] font-bold text-neutral-400/50 dark:text-neutral-500/50 uppercase tracking-[0.2em] text-center border-t border-neutral-200/40 dark:border-neutral-800/40">
        <div>Watchly • Share your taste</div>
        <div>
          Created by{" "}
          <a 
            href="https://github.com/Mamoon5G" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-indigo-500 transition-colors"
          >
            Mamoon Siddiqui
          </a>.
        </div>
        <div>2026 &copy; All Rights Reserved</div>
      </footer>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
        active 
          ? 'bg-indigo-500 text-white shadow-sm' 
          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}
