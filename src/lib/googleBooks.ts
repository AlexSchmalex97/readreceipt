import { supabase } from "@/integrations/supabase/client";

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

  const { data, error } = await supabase.functions.invoke('search-books', {
    body: { query, maxResults: 15 },
  });

  if (error) {
    console.error('Error searching Google Books:', error);
    throw new Error('Failed to search books');
  }

  if (data.error) {
    throw new Error(data.error);
  }

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
};

export const searchBooks = searchGoogleBooks;

/**
 * Find the original/earliest publication year for a work by searching
 * across multiple editions returned by the Google Books API.
 */
export const getOriginalPublishedYear = async (title: string, author: string): Promise<number | undefined> => {
  try {
    const query = `intitle:${title}+inauthor:${author}`;
    const { data, error } = await supabase.functions.invoke('search-books', {
      body: { query, maxResults: 40 },
    });

    if (error || !data || data.error || !data.items) return undefined;

    const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');

    let earliest: number | undefined;
    for (const item of data.items) {
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
