export type Category = 'movie' | 'series' | 'anime' | 'books';

export interface WatchlistItem {
  id: string;
  name: string;
  type: Category;
  watched: boolean;
  createdAt: number;
  imageUrl?: string | null;
}

export interface UserDoc {
  username: string;
}
