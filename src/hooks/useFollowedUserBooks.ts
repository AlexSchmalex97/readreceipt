import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FollowedUserBook {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: 'in_progress' | 'completed' | 'dnf' | 'tbr';
  bookTitle: string;
  bookAuthor: string;
}

export function useFollowedUserBooks() {
  const [followedUserBooks, setFollowedUserBooks] = useState<FollowedUserBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchFollowedUsersBooks = useCallback(async (title: string, author?: string) => {
    if (!title.trim()) {
      setFollowedUserBooks([]);
      return;
    }

    setIsLoading(true);
    try {
      // Get current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setFollowedUserBooks([]);
        setIsLoading(false);
        return;
      }

      // Get list of followed user IDs
      const { data: follows, error: followsError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followsError || !follows || follows.length === 0) {
        setFollowedUserBooks([]);
        setIsLoading(false);
        return;
      }

      const followedIds = follows.map(f => f.following_id);

      // Search for books in books table (in_progress, completed, dnf)
      const titleSearch = `%${title.toLowerCase()}%`;
      const authorSearch = author ? `%${author.toLowerCase()}%` : null;

      const { data: books, error: booksError } = await supabase
        .from('books')
        .select('user_id, title, author, status')
        .in('user_id', followedIds)
        .ilike('title', titleSearch);

      // Search for books in tbr_books table
      const { data: tbrBooks, error: tbrError } = await supabase
        .from('tbr_books')
        .select('user_id, title, author')
        .in('user_id', followedIds)
        .ilike('title', titleSearch);

      if (booksError) console.error('Error searching books:', booksError);
      if (tbrError) console.error('Error searching TBR books:', tbrError);

      // Collect all user IDs that have this book
      const userIdsWithBook = new Set<string>();
      const userBookMap = new Map<string, { status: string; title: string; author: string }[]>();

      (books || []).forEach(book => {
        // Additional author filter if provided
        if (authorSearch && !book.author.toLowerCase().includes(author!.toLowerCase())) {
          return;
        }
        userIdsWithBook.add(book.user_id);
        if (!userBookMap.has(book.user_id)) {
          userBookMap.set(book.user_id, []);
        }
        userBookMap.get(book.user_id)!.push({
          status: book.status === 'finished' ? 'completed' : book.status || 'in_progress',
          title: book.title,
          author: book.author
        });
      });

      (tbrBooks || []).forEach(book => {
        if (authorSearch && !book.author.toLowerCase().includes(author!.toLowerCase())) {
          return;
        }
        userIdsWithBook.add(book.user_id);
        if (!userBookMap.has(book.user_id)) {
          userBookMap.set(book.user_id, []);
        }
        userBookMap.get(book.user_id)!.push({
          status: 'tbr',
          title: book.title,
          author: book.author
        });
      });

      if (userIdsWithBook.size === 0) {
        setFollowedUserBooks([]);
        setIsLoading(false);
        return;
      }

      // Fetch profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', Array.from(userIdsWithBook));

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        setFollowedUserBooks([]);
        setIsLoading(false);
        return;
      }

      // Build the results
      const results: FollowedUserBook[] = [];
      (profiles || []).forEach(profile => {
        const userBooks = userBookMap.get(profile.id) || [];
        userBooks.forEach(book => {
          results.push({
            userId: profile.id,
            username: profile.username,
            displayName: profile.display_name,
            avatarUrl: profile.avatar_url,
            status: book.status as FollowedUserBook['status'],
            bookTitle: book.title,
            bookAuthor: book.author
          });
        });
      });

      setFollowedUserBooks(results);
    } catch (error) {
      console.error('Error searching followed users books:', error);
      setFollowedUserBooks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setFollowedUserBooks([]);
  }, []);

  return {
    followedUserBooks,
    isLoading,
    searchFollowedUsersBooks,
    clearResults
  };
}
