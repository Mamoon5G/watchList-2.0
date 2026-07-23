import { SearchResult, Category } from './types';
import axios from 'axios';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

export function cleanQuery(query: string) {
  return query
    .replace(/(?:till |until )?season\s*\d+/gi, '')
    .replace(/part\s*\d+/gi, '')
    .trim() || query; // fallback to original if completely empty after replace
}

export async function searchTMDBOptions(query: string, type: Category): Promise<SearchResult[]> {
  if (!TMDB_API_KEY || !query) return [];

  try {
    const searchType = type === 'movie' ? 'movie' : 'tv';
    const cleanedQuery = cleanQuery(query);
    
    const response = await axios.get(
      `${BASE_URL}/search/${searchType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanedQuery)}&include_adult=false&language=en-US&page=1`,
      {
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${TMDB_API_KEY}`
        }
      }
    );
    
    const data = response.data;
    if (data.results && data.results.length > 0) {
      return data.results.slice(0, 5).map((item: any) => ({
        id: item.id.toString(),
        title: item.title || item.name,
        releaseYear: (item.release_date || item.first_air_date || '').split('-')[0],
        imageUrl: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : null,
        source: 'TMDB',
        type: type,
        rating: item.vote_average ? Math.round(item.vote_average * 10) / 10 : null,
      }));
    }
    return [];
  } catch (error) {
    console.error('TMDB search error:', error);
    return [];
  }
}

export async function getTMDBDetails(id: string, type: Category): Promise<{ imageUrl: string | null; director?: string; leadActor?: string; releaseYear?: string; rating?: number | null }> {
  if (!TMDB_API_KEY || !id || type === 'books') return { imageUrl: null };

  try {
    const searchType = type === 'movie' ? 'movie' : 'tv';
    
    const response = await axios.get(
      `${BASE_URL}/${searchType}/${id}?api_key=${TMDB_API_KEY}&append_to_response=credits`,
      {
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${TMDB_API_KEY}`
        }
      }
    );
    
    const data = response.data;
    
    const imageUrl = data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null;
    const releaseYear = (data.release_date || data.first_air_date || '').split('-')[0];
    const rating = data.vote_average ? Math.round(data.vote_average * 10) / 10 : null;
    
    let director = undefined;
    let leadActor = undefined;
    
    if (data.credits) {
      if (data.credits.crew) {
        const dir = data.credits.crew.find((c: any) => c.job === 'Director' || (searchType === 'tv' && c.job === 'Executive Producer'));
        if (dir) director = dir.name;
        // For TV shows, sometimes creator is preferred, but let's just grab the first director or exec producer.
        if (!director && data.created_by && data.created_by.length > 0) {
          director = data.created_by[0].name;
        }
      }
      if (data.credits.cast && data.credits.cast.length > 0) {
        leadActor = data.credits.cast[0].name;
      }
    }
    
    return { imageUrl, director, leadActor, releaseYear, rating };
  } catch (error) {
    console.error('TMDB details error:', error);
    return { imageUrl: null };
  }
}

export async function searchTMDBImage(query: string, type: 'movie' | 'series' | 'anime' | 'books'): Promise<string | null> {
  const options = await searchTMDBOptions(query, type);
  if (options.length > 0 && options[0].id) {
    const details = await getTMDBDetails(options[0].id, type);
    return details.imageUrl;
  }
  return null;
}

