import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title');

  if (!title) {
    return NextResponse.json({ error: "Missing title parameter" }, { status: 400 });
  }

  try {
    const response = await axios.get(`https://api.mangadex.org/manga?title=${encodeURIComponent(title)}&includes[]=cover_art&includes[]=author&limit=3`);
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error("MangaDex API Proxy Error:", error);
    const status = error.response?.status || 500;
    return NextResponse.json({ error: "MangaDex API error" }, { status });
  }
}
