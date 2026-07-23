import axios from 'axios';
import { SearchResult } from './types';
import { cleanQuery } from './tmdb';

const ANILIST_API_URL = 'https://graphql.anilist.co';

export async function searchAniListOptions(query: string, mediaType: 'ANIME' | 'MANGA' = 'ANIME'): Promise<SearchResult[]> {
  if (!query) return [];
  const cleanedQuery = cleanQuery(query);

  const graphqlQuery = `
    query ($search: String) {
      Page (page: 1, perPage: 3) {
        media (search: $search, type: ${mediaType}) {
          id
          title {
            romaji
            english
          }
          startDate {
            year
          }
          averageScore
          coverImage {
            large
          }
          staff(perPage: 3) {
            edges {
              role
              node {
                name {
                  full
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await axios.post(
      ANILIST_API_URL,
      {
        query: graphqlQuery,
        variables: { search: cleanedQuery },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    const mediaList = response.data?.data?.Page?.media || [];
    
    return mediaList.map((item: any) => {
      let author = undefined;
      if (item.staff && item.staff.edges) {
        const creatorEdge = item.staff.edges.find((edge: any) => 
          edge.role?.toLowerCase().includes('original creator') || 
          edge.role?.toLowerCase().includes('story') || 
          edge.role?.toLowerCase().includes('art') || 
          edge.role?.toLowerCase().includes('director')
        );
        if (creatorEdge && creatorEdge.node && creatorEdge.node.name) {
          author = creatorEdge.node.name.full;
        } else if (item.staff.edges.length > 0 && item.staff.edges[0].node && item.staff.edges[0].node.name) {
          author = item.staff.edges[0].node.name.full;
        }
      }

      return {
        id: item.id.toString(),
        title: item.title.english || item.title.romaji || 'Unknown Title',
        releaseYear: item.startDate?.year ? item.startDate.year.toString() : undefined,
        imageUrl: item.coverImage?.large || null,
        source: 'AniList',
        type: (mediaType === 'MANGA' ? 'books' : 'anime') as any,
        author,
        rating: item.averageScore ? item.averageScore / 10 : null,
      };
    });
  } catch (error) {
    console.error('AniList API error:', error);
    return [];
  }
}
