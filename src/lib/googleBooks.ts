export interface GoogleBookResult {
  id: string;
  title: string;
  authors?: string[];
  pageCount?: number;
  imageLinks?: {
    thumbnail?: string;
  };
  description?: string;
  publishedDate?: string;
  publisher?: string;
}

export const searchGoogleBooks = async (query: string): Promise<GoogleBookResult[]> => {
  if (!query.trim()) return [];
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=15`
    );
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Google Books API rate limit exceeded. Please try again later.');
      }
      throw new Error('Failed to search books');
    }
    
    const data = await response.json();
    
    if (data.items) {
      return data.items
        .filter((item: any) => item.volumeInfo)
        .map((item: any): GoogleBookResult => ({
          id: item.id,
          title: item.volumeInfo.title || "Unknown Title",
          authors: item.volumeInfo.authors || [],
          pageCount: item.volumeInfo.pageCount,
          imageLinks: item.volumeInfo.imageLinks,
          description: item.volumeInfo.description,
          publishedDate: item.volumeInfo.publishedDate,
          publisher: item.volumeInfo.publisher,
        }));
    }
    
    return [];
  } catch (error) {
    console.error('Error searching Google Books:', error);
    throw error;
  }
};

export const searchBooks = searchGoogleBooks;

/**
 * Find the original/earliest publication year for a work by searching
 * across multiple editions returned by the Google Books API.
 */
export const getOriginalPublishedYear = async (title: string, author: string): Promise<number | undefined> => {
  try {
    // Use intitle/inauthor qualifiers for more precise matching
    const query = `intitle:${title}+inauthor:${author}`;
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=40&orderBy=relevance`
    );
    if (!response.ok) return undefined;
    const data = await response.json();
    if (!data.items) return undefined;

    // Normalize title for fuzzy matching
    const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');

    let earliest: number | undefined;
    for (const item of data.items) {
      // Only consider results that reasonably match the title
      const volTitle = (item.volumeInfo?.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!volTitle.includes(normTitle) && !normTitle.includes(volTitle)) continue;

      const pd = item.volumeInfo?.publishedDate;
      if (pd) {
        const year = parseInt(pd.substring(0, 4), 10);
        if (!isNaN(year) && (earliest === undefined || year < earliest)) {
          earliest = year;
        }
      }
    }
    return earliest;
  } catch {
    return undefined;
  }
};