"use client"

import * as React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Category, WatchlistItem as WatchlistItemType } from '@/lib/types';
import { WatchlistItem } from './WatchlistItem';
import { AddItemComposer } from './AddItemComposer';
import { ThemeToggle } from './ThemeToggle';
import { searchTMDBOptions, getTMDBDetails } from '@/lib/tmdb';
import { searchBookOptions } from '@/lib/books';
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
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const deleteTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const router = useRouter();

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      deleteTimeoutsRef.current.forEach((timeout, id) => {
        clearTimeout(timeout);
        const itemRef = doc(db, 'users', profileUid, 'watchlist', id);
        deleteDoc(itemRef).catch(console.error);
      });
    };
  }, [profileUid]);

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

  // Backfill metadata for existing items
  useEffect(() => {
    if (!isOwner || items.length === 0) return;

    const backfillMetadata = async () => {
      // Find items missing releaseYear and not already backfilled
      const itemsToUpdate = items.filter(item => item.releaseYear === undefined && item.imageUrl !== null);
      if (itemsToUpdate.length === 0) return;

      for (const item of itemsToUpdate) {
        try {
          let metadata = { imageUrl: null as string | null, director: null as string | null, leadActor: null as string | null, releaseYear: null as string | null, author: null as string | null };
          
          if (item.type === 'books' || (item.type as string) === 'comics') {
            const options = await searchBookOptions(item.name);
            if (options.length > 0) {
              const option = options[0];
              if (option.imageUrl) {
                if (option.source === 'Open Library') {
                  metadata.imageUrl = option.imageUrl.replace('-S.jpg', '-M.jpg');
                } else if (option.source === 'MangaDex') {
                  metadata.imageUrl = option.imageUrl.replace('.256.jpg', '');
                }
              }
              metadata.releaseYear = option.releaseYear || null;
              metadata.author = option.author || null;
            }
          } else {
            const options = await searchTMDBOptions(item.name, item.type);
            if (options.length > 0 && options[0].id) {
              const option = options[0];
              const details = await getTMDBDetails(option.id, item.type);
              metadata.imageUrl = details.imageUrl || null;
              metadata.director = details.director || null;
              metadata.leadActor = details.leadActor || null;
              metadata.releaseYear = details.releaseYear || option.releaseYear || null;
            }
          }
          
          const itemRef = doc(db, 'users', profileUid, 'watchlist', item.id);
          await updateDoc(itemRef, { 
            imageUrl: metadata.imageUrl !== null ? metadata.imageUrl : (item.imageUrl || null),
            director: metadata.director,
            leadActor: metadata.leadActor,
            releaseYear: metadata.releaseYear,
            author: metadata.author
          });
        } catch (error) {
          console.error(`Failed to backfill metadata for ${item.name}:`, error);
        }
      }
    };

    backfillMetadata();
  }, [items, isOwner, profileUid]);

  const handleAdd = async (data: { name: string, type: Category, watched: boolean, imageUrl?: string | null, director?: string | null, leadActor?: string | null, releaseYear?: string | null, author?: string | null }) => {
    if (!isOwner) return;
    try {
      const itemsRef = collection(db, 'users', profileUid, 'watchlist');
      await addDoc(itemsRef, {
        name: data.name,
        type: data.type,
        watched: data.watched,
        createdAt: Date.now(),
        imageUrl: data.imageUrl || null,
        director: data.director || null,
        leadActor: data.leadActor || null,
        releaseYear: data.releaseYear || null,
        author: data.author || null
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

  const handleDelete = (id: string, name?: string) => {
    if (!isOwner) return;
    
    const targetItem = items.find(i => i.id === id);
    const itemName = name || targetItem?.name || 'Item';

    // Hide immediately from UI
    setPendingDeleteIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    // Schedule actual Firestore deletion
    const timeoutId = setTimeout(async () => {
      try {
        const itemRef = doc(db, 'users', profileUid, 'watchlist', id);
        await deleteDoc(itemRef);
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete item');
      } finally {
        setPendingDeleteIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        deleteTimeoutsRef.current.delete(id);
      }
    }, 3000);

    deleteTimeoutsRef.current.set(id, timeoutId);

    // Show Gmail-style Undo toast
    toast(`${itemName} deleted`, {
      duration: 3000,
      action: {
        label: 'Undo',
        onClick: () => {
          const timeout = deleteTimeoutsRef.current.get(id);
          if (timeout) {
            clearTimeout(timeout);
            deleteTimeoutsRef.current.delete(id);
          }
          setPendingDeleteIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        },
      },
    });
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
      if (pendingDeleteIds.has(item.id)) return false;
      const typeStr = (item.type as string) === 'comics' ? 'books' : item.type;
      const key = `${item.name.toLowerCase().trim()}-${typeStr}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [items, pendingDeleteIds]);

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
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap capitalize shrink-0 ${
              activeTab === tab 
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm' 
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
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
                    <div className="flex flex-col gap-2 mb-6">
                      <div className="inline-flex items-center gap-2 self-start px-2 py-0.5 rounded bg-amber-100/50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-500 border border-amber-500/20 dark:border-amber-500/35">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                        <h3 className="text-[10px] font-extrabold uppercase tracking-widest">Pending</h3>
                      </div>
                      <div className="h-[2px] w-full bg-amber-500/30 dark:bg-amber-500/20 rounded-full"></div>
                    </div>
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
                    <div className="flex flex-col gap-2 mb-6">
                      <div className="inline-flex items-center gap-2 self-start px-2 py-0.5 rounded bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-500 border border-emerald-500/20 dark:border-emerald-500/35">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        <h3 className="text-[10px] font-extrabold uppercase tracking-widest">Finished</h3>
                      </div>
                      <div className="h-[2px] w-full bg-emerald-500/30 dark:bg-emerald-500/20 rounded-full"></div>
                    </div>
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
              <div className="flex flex-col gap-2 mb-6">
                <div className="inline-flex items-center gap-2 self-start px-2 py-0.5 rounded bg-amber-100/50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-500 border border-amber-500/20 dark:border-amber-500/35">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                  <h2 className="text-[10px] font-extrabold uppercase tracking-widest">Pending</h2>
                </div>
                <div className="h-[2px] w-full bg-amber-500/30 dark:bg-amber-500/20 rounded-full"></div>
              </div>
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
              <div className="flex flex-col gap-2 mb-6">
                <div className="inline-flex items-center gap-2 self-start px-2 py-0.5 rounded bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-500 border border-emerald-500/20 dark:border-emerald-500/35">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <h2 className="text-[10px] font-extrabold uppercase tracking-widest">Finished</h2>
                </div>
                <div className="h-[2px] w-full bg-emerald-500/30 dark:bg-emerald-500/20 rounded-full"></div>
              </div>
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
