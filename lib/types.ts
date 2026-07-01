export type Category = 'movie' | 'series' | 'anime' | 'books';

export interface WatchlistItem {
  id: string;
  name: string;
  type: Category;
  watched: boolean;
  createdAt: number;
  imageUrl?: string | null;
  director?: string | null;
  leadActor?: string | null;
  releaseYear?: string | null;
  author?: string | null;
}

export interface UserDoc {
  username: string;
}

export interface SearchResult {
  id: string; // API ID
  title: string;
  releaseYear?: string;
  imageUrl?: string | null;
  source: string;
  type: Category;
  author?: string | null;
}