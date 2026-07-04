"use client"

import React, { useState } from 'react';
import { WatchlistItem as WatchlistItemType } from '@/lib/types';
import { Check, Trash2, Film, Tv, Book, Popcorn, Clock, BookOpen, Calendar } from 'lucide-react';
import { motion } from 'motion/react';

interface WatchlistItemProps {
  item: WatchlistItemType;
  isOwner: boolean;
  onToggle: (id: string, current: boolean) => void;
  onDelete: (id: string, name?: string) => void;
}

export const WatchlistItem = React.memo(function WatchlistItem({ item, isOwner, onToggle, onDelete }: WatchlistItemProps) {
  const [imgError, setImgError] = useState(false);

  const getIcon = () => {
    switch (item.type as string) {
      case 'movie': return <Film className="w-6 h-6" />;
      case 'series': return <Tv className="w-6 h-6" />;
      case 'anime': return <Popcorn className="w-6 h-6" />;
      case 'books': return <Book className="w-6 h-6" />;
      case 'comics': return <BookOpen className="w-6 h-6" />;
      default: return <Film className="w-6 h-6" />;
    }
  };

  const getFormattedDate = () => {
    if (!item.createdAt) return '';
    const d = new Date(item.createdAt);
    return `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'long' })} ${d.getFullYear()}`;
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
      className={`group relative flex flex-col rounded-2xl border transition-all duration-300 ease-out overflow-hidden h-full shadow-sm hover:shadow-md hover:-translate-y-1.5 bg-white dark:bg-[#121316] text-neutral-900 dark:text-white ${
        item.watched 
          ? 'border-emerald-500/20 dark:border-emerald-500/30 hover:border-emerald-500/40 dark:hover:border-emerald-500/50 hover:shadow-emerald-500/5' 
          : 'border-amber-500/20 dark:border-amber-500/30 hover:border-amber-500/40 dark:hover:border-amber-500/50 hover:shadow-amber-500/5'
      }`}
    >
      {/* Poster Image */}
      <div className="w-full aspect-[2/3] bg-neutral-950 flex-shrink-0 flex items-center justify-center relative overflow-hidden">
        {item.imageUrl && !imgError ? (
          <img 
            src={item.imageUrl} 
            alt={item.name} 
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105" 
          />
        ) : (
          <div className="text-neutral-500 opacity-50 flex flex-col items-center justify-center gap-2 p-4 text-center">
            {getIcon()}
            <span className="text-xs font-semibold line-clamp-2">{item.name}</span>
          </div>
        )}
        
        {/* Date Badge Top-Left */}
        <div className={`absolute top-3 left-3 z-10 px-2 py-0.5 rounded backdrop-blur-md font-semibold text-[10px] flex items-center gap-1 shadow-sm border ${
          item.watched 
            ? 'bg-neutral-950/80 text-emerald-400 border-emerald-500/50' 
            : 'bg-neutral-950/80 text-amber-400 border-amber-500/50'
        }`}>
          <Calendar className="w-3 h-3 shrink-0" />
          <span className="whitespace-nowrap">{getFormattedDate()}</span>
        </div>

        {/* Checkbox Top-Right */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isOwner) onToggle(item.id, item.watched);
          }}
          disabled={!isOwner}
          className={`absolute top-3 right-3 z-10 w-5 h-5 rounded-md border-2 backdrop-blur-md transition-all duration-200 flex items-center justify-center shadow-md ${
            isOwner ? 'cursor-pointer hover:scale-110' : 'cursor-default'
          } ${
            item.watched
              ? 'border-emerald-500 bg-neutral-950/80 text-emerald-400 hover:bg-emerald-900/80'
              : 'border-amber-500 bg-neutral-950/80 text-amber-400 hover:bg-amber-900/80 hover:border-amber-400'
          }`}
          title={isOwner ? (item.watched ? "Mark as pending" : "Mark as watched") : undefined}
        >
          {item.watched && <Check className="w-4 h-4 stroke-[3]" />}
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 justify-start gap-3 relative z-10">
        <div className="flex flex-col space-y-1">
          <h3 
            className="font-bold text-neutral-900 dark:text-white text-base leading-snug line-clamp-2 tracking-tight h-12" 
            title={item.name}
          >
            {item.name}
          </h3>
          
          {(isOwner || (item.type !== 'anime' && (item.director || item.leadActor || item.author)) || item.releaseYear) && (
            <div className="flex flex-col space-y-1 text-xs text-neutral-500 dark:text-neutral-400 font-normal pt-1 leading-tight">
              <div className="flex items-center justify-between gap-2 min-h-[28px]">
                <span className="text-neutral-500 dark:text-neutral-400 font-normal">{item.releaseYear || ''}</span>
                {isOwner && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id, item.name);
                    }}
                    className="p-1 rounded-lg text-red-500/70 hover:text-red-500 hover:bg-red-500/10 opacity-70 group-hover:opacity-100 transition-all duration-200 hover:scale-110 cursor-pointer shrink-0 z-20 md:hidden"
                    title="Delete item"
                    aria-label="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {item.type !== 'anime' && item.author && (
                <span className="truncate">
                  <span className="text-neutral-400 dark:text-neutral-500 mr-1.5 font-normal">By</span>
                  <span className="text-neutral-600 dark:text-neutral-300">{item.author}</span>
                </span>
              )}
              {item.type !== 'anime' && item.director && (
                <span className="truncate">
                  <span className="text-neutral-400 dark:text-neutral-500 mr-1.5 font-normal">Dir</span>
                  <span className="text-neutral-600 dark:text-neutral-300">{item.director}</span>
                </span>
              )}
              {item.type !== 'anime' && item.leadActor && (
                <span className="truncate">
                  <span className="text-neutral-400 dark:text-neutral-500 mr-1.5 font-normal">With</span>
                  <span className="text-neutral-600 dark:text-neutral-300">{item.leadActor}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Absolute Delete Button for PC screen */}
        {isOwner && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id, item.name);
            }}
            className="absolute bottom-3 right-3 p-1.5 rounded-lg text-red-500/70 hover:text-red-500 hover:bg-red-500/10 opacity-70 group-hover:opacity-100 transition-all duration-200 hover:scale-110 cursor-pointer z-20 hidden md:block"
            title="Delete item"
            aria-label="Delete item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
});
