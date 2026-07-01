"use client"

import React, { useState } from 'react';
import { WatchlistItem as WatchlistItemType } from '@/lib/types';
import { Check, Trash2, Film, Tv, Book, Popcorn, Clock, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

interface WatchlistItemProps {
  item: WatchlistItemType;
  isOwner: boolean;
  onToggle: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
}

export function WatchlistItem({ item, isOwner, onToggle, onDelete }: WatchlistItemProps) {
  const [imgError, setImgError] = useState(false);

  const getIcon = () => {
    switch (item.type as string) {
      case 'movie': return <Film className="w-3.5 h-3.5" />;
      case 'series': return <Tv className="w-3.5 h-3.5" />;
      case 'anime': return <Popcorn className="w-3.5 h-3.5" />;
      case 'books': return <Book className="w-3.5 h-3.5" />;
      case 'comics': return <BookOpen className="w-3.5 h-3.5" />;
      default: return <Film className="w-3.5 h-3.5" />;
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={`group relative flex flex-col rounded-2xl border transition-all overflow-hidden h-full ${
        item.watched 
          ? 'bg-neutral-50 dark:bg-neutral-900/30 border-neutral-100 dark:border-neutral-800/40 opacity-50 grayscale-[0.3]' 
          : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md hover:-translate-y-1'
      }`}
    >
      {/* Poster Image */}
      <div className="w-full aspect-[2/3] bg-neutral-100 dark:bg-neutral-800/40 flex-shrink-0 flex items-center justify-center relative overflow-hidden">
        {item.imageUrl && !imgError ? (
          <img 
            src={item.imageUrl} 
            alt="" 
            onError={() => setImgError(true)}
            className={`w-full h-full object-cover transition-transform duration-300 ${!item.watched && 'group-hover:scale-105'}`} 
          />
        ) : (
          <div className="text-neutral-400 opacity-50">
            {getIcon()}
          </div>
        )}
        
        {/* Hover Actions Overlay */}
        {isOwner && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={() => onToggle(item.id, item.watched)}
              className={`p-3 rounded-full transition-transform hover:scale-110 ${
                item.watched 
                  ? 'bg-green-500 text-white' 
                  : 'bg-white/20 text-white hover:bg-green-500'
              }`}
              title={item.watched ? "Mark as pending" : "Mark as finished"}
            >
              <Check className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => onDelete(item.id)}
              className="p-3 rounded-full bg-white/20 text-white hover:bg-red-500 transition-transform hover:scale-110"
              title="Delete item"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 relative z-10">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <h3 className={`font-semibold line-clamp-2 leading-tight ${item.watched ? 'line-through decoration-neutral-300 dark:decoration-neutral-600 decoration-[0.5px] text-neutral-400/80 font-normal' : 'text-neutral-900 dark:text-white'}`}>
            {item.name}
          </h3>
        </div>
        
        {((item.type !== 'anime' && (item.director || item.leadActor || item.author)) || item.releaseYear) && (
          <div className="flex flex-col gap-1 mt-1 mb-2 text-[11px] text-neutral-600 dark:text-neutral-400 font-medium leading-tight">
            {item.releaseYear && <span className="text-neutral-500 dark:text-neutral-500 font-normal">{item.releaseYear}</span>}
            {item.type !== 'anime' && item.author && <span className="line-clamp-1 truncate text-indigo-600 dark:text-indigo-400/90">{item.author}</span>}
            {item.type !== 'anime' && item.director && <span className="line-clamp-1 truncate"><span className="text-neutral-400 dark:text-neutral-500 font-normal mr-1">Dir</span>{item.director}</span>}
            {item.type !== 'anime' && item.leadActor && <span className="line-clamp-1 truncate"><span className="text-neutral-400 dark:text-neutral-500 font-normal mr-1">With</span>{item.leadActor}</span>}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between text-[10px] font-bold text-neutral-400 pt-3 border-t border-neutral-100 dark:border-neutral-800/60">
          <span className="flex items-center gap-1 uppercase tracking-wider">
            {item.type === 'books' || (item.type as string) === 'comics' ? <Book className="w-3.5 h-3.5" /> : getIcon()}
            {(item.type as string) === 'comics' ? 'books' : item.type}
          </span>
          <span className="flex items-center gap-1 opacity-70">
            {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
