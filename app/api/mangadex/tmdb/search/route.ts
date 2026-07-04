import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

function cleanQuery(query: string) {
  return query
    .replace(/(?:till |until )?season\s*\d+/gi, '')
    .replace(/part\s*\d+/gi, '')
    .trim() || query;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query');
  const type = searchParams.get('type');
  
  const TMDB_API_KEY = process.env.TMDB_API_KEY;

  if (!TMDB_API_KEY) {
    return NextResponse.json({ error: "TMDB API key not configured" }, { status: 500 });
  }

  if (!query || !type) {
    return NextResponse.json({ error: "Missing query or type" }, { status: 400 });
  }

  try {
    const searchType = type === 'movie' ? 'movie' : 'tv';
    const cleanedQuery = cleanQuery(query);
    
    const response = await axios.get(
      `https://api.themoviedb.org/3/search/${searchType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanedQuery)}&include_adult=false&language=en-US&page=1`,
      {
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${TMDB_API_KEY}`
        }
      }
    );
    
    const data = response.data;
    if (data.results && data.results.length > 0) {
      const results = data.results.slice(0, 5).map((item: any) => ({
        id: item.id.toString(),
        title: item.title || item.name,
        releaseYear: (item.release_date || item.first_air_date || '').split('-')[0],
        imageUrl: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : null,
        source: 'TMDB',
        type: type,
      }));
      return NextResponse.json(results);
    }
    return NextResponse.json([]);
  } catch (error: any) {
    console.error('TMDB search error:', error.response?.data || error.message);
    return NextResponse.json({ error: "TMDB API error" }, { status: 500 });
  }
}
