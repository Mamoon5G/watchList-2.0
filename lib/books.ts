import { SearchResult } from './types';
import { cleanQuery, searchTMDBOptions } from './tmdb';

export async function searchBookOptions(query: string): Promise<SearchResult[]> {
  if (!query) return [];
  const cleanedQuery = cleanQuery(query);
  let results: SearchResult[] = [];

  try {
    const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(cleanedQuery)}&limit=3`);
    if (response.ok) {
      const data = await response.json();
      if (data.docs && data.docs.length > 0) {
        const olResults = data.docs.map((doc: any) => ({
          id: doc.key, // e.g. /works/OL123456W
          title: doc.title,
          releaseYear: doc.first_publish_year ? doc.first_publish_year.toString() : undefined,
          imageUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-S.jpg` : null,
          source: 'Open Library',
          type: 'books' as const,
          author: doc.author_name && doc.author_name.length > 0 ? doc.author_name[0] : undefined,
        }));
        results = [...results, ...olResults];
      }
    }
  } catch (err) {
    console.error("OpenLibrary API error:", err);
  }

  try {
    const mdResponse = await fetch(`https://api.mangadex.org/manga?title=${encodeURIComponent(cleanedQuery)}&includes[]=cover_art&includes[]=author&limit=3`);
    if (mdResponse.ok) {
      const data = await mdResponse.json();
      if (data.data && data.data.length > 0) {
        const mdResults = data.data.map((manga: any) => {
          let author = undefined;
          let imageUrl = null;
          
          const coverArt = manga.relationships.find((r: any) => r.type === 'cover_art');
          if (coverArt && coverArt.attributes && coverArt.attributes.fileName) {
            imageUrl = `https://uploads.mangadex.org/covers/${manga.id}/${coverArt.attributes.fileName}.256.jpg`;
          }
          
          const authorRel = manga.relationships.find((r: any) => r.type === 'author');
          if (authorRel && authorRel.attributes && authorRel.attributes.name) {
            author = authorRel.attributes.name;
          }

          const title = manga.attributes.title.en || manga.attributes.title['ja-ro'] || Object.values(manga.attributes.title)[0] || 'Unknown';

          return {
            id: manga.id,
            title,
            releaseYear: manga.attributes.year ? manga.attributes.year.toString() : undefined,
            imageUrl,
            source: 'MangaDex',
            type: 'books' as const,
            author,
          };
        });
        results = [...results, ...mdResults];
      }
    }
  } catch (err) {
    console.error("MangaDex API error:", err);
  }

  try {
    // Also search TMDB for comics/manga which might be registered as TV/Movie
    const tmdbResults = await searchTMDBOptions(cleanedQuery, 'series');
    // Map them to say source is TMDB but type is still 'books' or 'comics'
    const tmdbMapped = tmdbResults.slice(0, 3).map(r => ({ ...r, type: 'books' as const }));
    results = [...results, ...tmdbMapped];
  } catch (err) {
    console.error("TMDB fallback error for books:", err);
  }

  return results;
}

export async function getBookDetails(id: string): Promise<{ imageUrl: string | null; author?: string; releaseYear?: string }> {
  return { imageUrl: null };
}

export async function searchGoogleBooksImage(query: string): Promise<string | null> {
  const options = await searchBookOptions(query);
  if (options.length > 0 && options[0].imageUrl) {
    return options[0].imageUrl.replace('-S.jpg', '-M.jpg');
  }
  return null;
}
