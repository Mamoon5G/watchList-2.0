import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type');
  
  const TMDB_API_KEY = process.env.TMDB_API_KEY;

  if (!TMDB_API_KEY) {
    return NextResponse.json({ error: "TMDB API key not configured" }, { status: 500 });
  }

  if (!id || !type) {
    return NextResponse.json({ error: "Missing id or type" }, { status: 400 });
  }

  if (type === 'books') {
    return NextResponse.json({ imageUrl: null });
  }

  try {
    const searchType = type === 'movie' ? 'movie' : 'tv';
    
    const response = await axios.get(
      `https://api.themoviedb.org/3/${searchType}/${id}?api_key=${TMDB_API_KEY}&append_to_response=credits`,
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
    
    let director = undefined;
    let leadActor = undefined;
    
    if (data.credits) {
      if (data.credits.crew) {
        const dir = data.credits.crew.find((c: any) => c.job === 'Director' || (searchType === 'tv' && c.job === 'Executive Producer'));
        if (dir) director = dir.name;
        if (!director && data.created_by && data.created_by.length > 0) {
          director = data.created_by[0].name;
        }
      }
      if (data.credits.cast && data.credits.cast.length > 0) {
        leadActor = data.credits.cast[0].name;
      }
    }
    
    return NextResponse.json({ imageUrl, director, leadActor, releaseYear });
  } catch (error: any) {
    console.error('TMDB details error:', error.response?.data || error.message);
    return NextResponse.json({ imageUrl: null });
  }
}
