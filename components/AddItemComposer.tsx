"use client"

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Send, X, Search, Loader2 } from 'lucide-react';
import { Category, SearchResult } from '@/lib/types';
import { motion, AnimatePresence } from 'motion/react';
import { searchTMDBOptions, getTMDBDetails } from '@/lib/tmdb';
import { searchBookOptions, getBookDetails } from '@/lib/books';
import { searchAniListOptions } from '@/lib/anilist';

interface AddItemComposerProps {
  onAdd: (data: { name: string, type: Category, watched: boolean, imageUrl?: string | null, director?: string | null, leadActor?: string | null, releaseYear?: string | null, author?: string | null, rating?: number | null }) => void;
  activeTab: Category | 'all';
}

export function AddItemComposer({ onAdd, activeTab }: AddItemComposerProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<Category>('movie');
  const [status, setStatus] = useState<'pending' | 'finished'>('pending');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedOption, setSelectedOption] = useState<SearchResult | null>(null);

  // Sync type with activeTab if it's not 'all'
  useEffect(() => {
    if (activeTab !== 'all') {
      setType(activeTab);
      setSelectedOption(null);
    }
  }, [activeTab]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (name.trim().length > 2 && !selectedOption) {
        setIsSearching(true);
        let results: SearchResult[] = [];
        if (type === 'books') {
          const [bookResults, aniListResults] = await Promise.all([
            searchBookOptions(name),
            searchAniListOptions(name, 'MANGA')
          ]);
          results = [...aniListResults, ...bookResults];
        } else if (type === 'anime') {
          const [aniListResults, tmdbResults] = await Promise.all([
            searchAniListOptions(name),
            searchTMDBOptions(name, type)
          ]);
          results = [...aniListResults, ...tmdbResults.slice(0, 2)];
        } else {
          if (activeTab === 'all') {
            const [movieResults, seriesResults] = await Promise.all([
              searchTMDBOptions(name, 'movie'),
              searchTMDBOptions(name, 'series')
            ]);
            // Interleave results to show a mix
            const maxLength = Math.max(movieResults.length, seriesResults.length);
            for (let i = 0; i < maxLength; i++) {
              if (movieResults[i]) results.push(movieResults[i]);
              if (seriesResults[i]) results.push(seriesResults[i]);
            }
          } else {
            results = await searchTMDBOptions(name, type);
          }
        }
        setSearchResults(results);
        setIsSearching(false);
      } else if (!name.trim() || selectedOption) {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [name, type, selectedOption]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCustomSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim() || isAdding) return;
    
    setIsAdding(true);
    let targetOption = selectedOption;

    if (!targetOption) {
      // Auto-fetch if no option selected
      let results: SearchResult[] = [];
      if (type === 'books') {
        results = await searchBookOptions(name.trim());
      } else {
        results = await searchTMDBOptions(name.trim(), type);
      }
      if (results.length > 0) {
        targetOption = results[0];
      }
    }

    let metadata = { imageUrl: targetOption?.imageUrl || null, director: undefined as string | undefined, leadActor: undefined as string | undefined, releaseYear: targetOption?.releaseYear || null, author: targetOption?.author || null, rating: targetOption?.rating || null };
    
    if (targetOption) {
      if (type !== 'books' && targetOption.source !== 'AniList') {
        const details = await getTMDBDetails(targetOption.id, type);
        if (details.imageUrl) metadata.imageUrl = details.imageUrl;
        metadata.director = details.director;
        metadata.leadActor = details.leadActor;
        metadata.releaseYear = details.releaseYear || metadata.releaseYear;
      } else {
        if (targetOption.imageUrl) {
          if (targetOption.source === 'Open Library') {
            metadata.imageUrl = targetOption.imageUrl.replace('-S.jpg', '-M.jpg');
          } else if (targetOption.source === 'MangaDex') {
            metadata.imageUrl = targetOption.imageUrl.replace('.256.jpg', '');
          }
        }
      }
    }

    onAdd({
      name: name.trim(),
      type: type,
      watched: status === 'finished',
      imageUrl: metadata.imageUrl || null,
      director: metadata.director || null,
      leadActor: metadata.leadActor || null,
      releaseYear: metadata.releaseYear || null,
      author: metadata.author || null,
      rating: metadata.rating || null,
    });
    
    setName('');
    setSelectedOption(null);
    setSearchResults([]);
    setIsAdding(false);
    setIsFocused(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleSelectOption = (option: SearchResult) => {
    setSelectedOption(option);
    
    const currentName = name.trim().toLowerCase();
    const optionTitle = option.title.toLowerCase();
    
    if (optionTitle.includes(currentName) && currentName.length <= optionTitle.length) {
      setName(option.title + ' ');
    }
    
    setSearchResults([]);
    inputRef.current?.focus();
  };

  const showCard = isFocused;
  const showRocket = isFocused || name.length > 0;

  return (
    <div 
      ref={containerRef}
      className="relative w-full rounded-xl transition-all duration-300 group"
    >
      <form onSubmit={handleCustomSubmit} className={`relative flex flex-col transition-all ${selectedOption ? 'pt-7' : ''}`}>
        <div className="relative">
          {selectedOption && (
            <div className="absolute left-4 -top-[28px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 text-[10px] px-2.5 py-1 rounded-t-lg font-bold flex items-center gap-1 border border-b-0 border-indigo-200/50 dark:border-indigo-800/50 shadow-sm z-0 transition-all">
               <span>Matched: {selectedOption.title}</span>
               <button 
                 type="button" 
                 onClick={(e) => { e.preventDefault(); setSelectedOption(null); inputRef.current?.focus(); }}
                 className="ml-1 hover:bg-indigo-200 dark:hover:bg-indigo-800/60 rounded-full p-0.5 transition-colors"
               >
                 <X className="w-3 h-3" />
               </button>
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="What's next on your list?"
            className="w-full relative z-10 bg-neutral-100/50 dark:bg-neutral-800/40 border-2 border-neutral-200/40 dark:border-neutral-800/40 focus:border-indigo-500 py-3.5 pl-4 pr-12 rounded-xl text-sm outline-none transition-all placeholder:text-neutral-400/50 dark:placeholder:text-neutral-500/50 font-medium"
          />
          <AnimatePresence>
            {showRocket ? (
              <motion.button
                key="active"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                type="submit"
                disabled={!name.trim() || isAdding}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 z-20 text-neutral-400 hover:text-indigo-500 disabled:opacity-30 transition-colors"
              >
                {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </motion.button>
            ) : (
              <motion.div 
                key="inactive"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-neutral-300 dark:text-neutral-600 pointer-events-none"
              >
                <Send className="w-5 h-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showCard && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-neutral-900 border border-neutral-200/40 dark:border-neutral-800/40 rounded-xl shadow-xl flex flex-col max-h-[60vh]"
            >
              <div className="p-4 flex flex-col gap-4 border-b border-neutral-100 dark:border-neutral-800/60 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Category Selection */}
                  {activeTab === 'all' && (
                    <div className="flex overflow-x-auto hide-scrollbar items-center gap-1 bg-neutral-100 dark:bg-neutral-800/50 p-1 rounded-xl w-full">
                      <CategoryButton selected={type === 'movie'} onClick={() => setType('movie')} label="Movie" />
                      <CategoryButton selected={type === 'series'} onClick={() => setType('series')} label="Series" />
                      <CategoryButton selected={type === 'anime'} onClick={() => setType('anime')} label="Anime" />
                      <CategoryButton selected={type === 'books'} onClick={() => setType('books')} label="Books & Comics" />
                    </div>
                  )}

                  {/* Status Selection */}
                  <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/50 p-1 rounded-xl">
                    <StatusButton selected={status === 'pending'} onClick={() => setStatus('pending')} label="Pending" />
                    <StatusButton selected={status === 'finished'} onClick={() => setStatus('finished')} label="Finished" />
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setIsFocused(false);
                      setName('');
                    }}
                    className="ml-auto p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Search Results */}
              {name.trim().length > 2 && (
                <div className="overflow-y-auto p-2 flex flex-col gap-1 min-h-[100px]">
                  {isSearching ? (
                    <div className="flex items-center justify-center p-8 text-neutral-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        disabled={isAdding}
                        onClick={() => handleSelectOption(result)}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left disabled:opacity-50"
                      >
                        {result.imageUrl ? (
                          <img src={result.imageUrl} alt={result.title} className="w-10 h-14 object-cover rounded shadow-sm bg-neutral-200 dark:bg-neutral-700" />
                        ) : (
                          <div className="w-10 h-14 bg-neutral-100 dark:bg-neutral-800 rounded flex items-center justify-center text-neutral-400">
                            <Search className="w-4 h-4" />
                          </div>
                        )}
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-semibold text-sm truncate text-neutral-900 dark:text-white">{result.title}</span>
                          <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
                            <span className="text-neutral-500 truncate max-w-[200px]">
                              {[
                                result.releaseYear,
                                (type !== 'books' && (type as string) !== 'comics' && result.rating) ? `${result.rating}⭐` : null,
                                result.author
                              ].filter(Boolean).join(' • ')}
                            </span>
                            <span className="uppercase text-[9px] tracking-wider font-bold bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-indigo-500">
                              {result.source}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="flex items-center justify-center p-8 text-neutral-500 text-sm">
                      No matching {type === 'books' ? 'books' : type} found. Press enter to add custom.
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}

function CategoryButton({ selected, onClick, label }: { selected: boolean, onClick: () => void, label: string }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all flex-shrink-0 whitespace-nowrap ${
        selected 
          ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm ring-1 ring-neutral-200/50 dark:ring-neutral-600/50' 
          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-medium'
      }`}
    >
      <span>{label}</span>
    </button>
  );
}

function StatusButton({ selected, onClick, label }: { selected: boolean, onClick: () => void, label: string }) {
  const isPending = label.toLowerCase() === 'pending';
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md transition-all text-[11px] font-bold flex items-center gap-1.5 ${
        selected 
          ? (isPending ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400')
          : 'bg-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
      }`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${selected ? (isPending ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-neutral-300 dark:bg-neutral-600'}`} />
      {label}
    </button>
  );
}
