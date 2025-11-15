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
      throw new Error('Failed to search books');
    }
    
    const data = await response.json();
    
    if (data.items) {
      return data.items.map((item: any): GoogleBookResult => ({
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