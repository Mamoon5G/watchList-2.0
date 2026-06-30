export async function searchGoogleBooksImage(query: string): Promise<string | null> {
  if (!query) return null;
  try {
    const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.docs && data.docs.length > 0) {
      const doc = data.docs[0];
      if (doc.cover_i) {
        return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`; // Using medium size for list view
      }
    }
  } catch (err) {
    console.error("OpenLibrary API error:", err);
  }
  return null;
}
