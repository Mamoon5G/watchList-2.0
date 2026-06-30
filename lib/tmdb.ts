const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

export async function searchTMDBImage(query: string, type: 'movie' | 'series' | 'anime' | 'books'): Promise<string | null> {
  if (!TMDB_API_KEY || !query) return null;
  if (type === 'books') return null; // TMDB doesn't do books

  try {
    const searchType = type === 'movie' ? 'movie' : 'tv';
    // For anime, it's usually categorized under 'tv' in TMDB, or we could add keywords, but basic search should work.
    
    const response = await fetch(
      `${BASE_URL}/search/${searchType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
      {
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${TMDB_API_KEY}`
        }
      }
    );
    
    if (!response.ok) {
      console.error('TMDB API error', response.statusText);
      return null;
    }
    
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const posterPath = data.results[0].poster_path;
      if (posterPath) {
        return `https://image.tmdb.org/t/p/w500${posterPath}`;
      }
    }
    return null;
  } catch (error) {
    console.error('TMDB search error:', error);
    return null;
  }
}
