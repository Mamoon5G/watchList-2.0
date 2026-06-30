"use client"

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Send, X, Film, Tv, Book, Popcorn, BookOpen } from 'lucide-react';
import { Category } from '@/lib/types';
import { motion, AnimatePresence } from 'motion/react';

interface AddItemComposerProps {
  onAdd: (name: string, type: Category, watched: boolean) => void;
  activeTab: Category | 'all';
}

export function AddItemComposer({ onAdd, activeTab }: AddItemComposerProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<Category>('movie');
  const [status, setStatus] = useState<'pending' | 'finished'>('pending');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync type with activeTab if it's not 'all'
  useEffect(() => {
    if (activeTab !== 'all') {
      setType(activeTab);
    }
  }, [activeTab]);

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

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) return;
    
    onAdd(name.trim(), type, status === 'finished');
    setName('');
    // Keep focus
    inputRef.current?.focus();
  };

  const showOptions = isFocused || name.length > 0;

  return (
    <div 
      ref={containerRef}
      className="relative w-full rounded-xl transition-all duration-300 group"
    >
      <form onSubmit={handleSubmit} className="relative flex flex-col">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="What's next on your list?"
            className="w-full bg-neutral-100/50 dark:bg-neutral-800/40 border-2 border-neutral-200/40 dark:border-neutral-800/40 focus:border-indigo-500 py-3.5 pl-4 pr-12 rounded-xl text-sm outline-none transition-all placeholder:text-neutral-400/50 dark:placeholder:text-neutral-500/50 font-medium"
          />
          <AnimatePresence>
            {showOptions ? (
              <motion.button
                key="active"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                type="submit"
                disabled={!name.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-neutral-400 hover:text-indigo-500 disabled:opacity-30 transition-colors"
              >
                <Send className="w-5 h-5" />
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
          {showOptions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-neutral-900 border border-neutral-200/40 dark:border-neutral-800/40 rounded-xl shadow-xl"
            >
              <div className="pt-4 pb-4 px-4 flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  
                  {/* Category Selection */}
                  {activeTab === 'all' && (
                    <div className="flex overflow-x-auto hide-scrollbar items-center gap-1 bg-neutral-100 dark:bg-neutral-800/50 p-1 rounded-xl w-full">
                      <CategoryButton selected={type === 'movie'} onClick={() => setType('movie')} icon={<Film className="w-4 h-4 whitespace-nowrap shrink-0" />} label="Movie" />
                      <CategoryButton selected={type === 'series'} onClick={() => setType('series')} icon={<Tv className="w-4 h-4 whitespace-nowrap shrink-0" />} label="Series" />
                      <CategoryButton selected={type === 'anime'} onClick={() => setType('anime')} icon={<Popcorn className="w-4 h-4 whitespace-nowrap shrink-0" />} label="Anime" />
                      <CategoryButton selected={type === 'books'} onClick={() => setType('books')} icon={<Book className="w-4 h-4 whitespace-nowrap shrink-0" />} label="Books & Comics" />
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
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}

function CategoryButton({ selected, onClick, icon, label }: { selected: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex-shrink-0 whitespace-nowrap ${
        selected 
          ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' 
          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function StatusButton({ selected, onClick, label }: { selected: boolean, onClick: () => void, label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        selected 
          ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' 
          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}
