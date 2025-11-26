import { useState, useEffect, useRef } from "react";
import { AddBookDialog } from "@/components/AddBookDialog";
import { BookCard } from "@/components/BookCard";
import { TBRList } from "@/components/TBRList";
import { TrendingUp, Target, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ReviewDialog } from "@/components/ReviewDialog";
import { Navigation } from "@/components/Navigation";
import { ReadingGoals } from "@/components/ReadingGoals";
import { HomeReadingGoals } from "@/components/HomeReadingGoals";
import { BookDatesDialog } from "@/components/BookDatesDialog";
import { DNFTypeDialog } from "@/components/DNFTypeDialog";
import { BookMoveMenu } from "@/components/BookMoveMenu";
import { Link } from "react-router-dom";
import { searchGoogleBooks } from "@/lib/googleBooks";
import { useToast } from "@/hooks/use-toast";
import { usePlatform } from "@/hooks/usePlatform";
import { Button } from "@/components/ui/button";
import { SortableBookGrid } from "@/components/SortableBookGrid";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useUserAccent } from "@/hooks/useUserAccent";

interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
  coverUrl?: string;
  started_at?: string;
  finished_at?: string;
  status?: 'in_progress' | 'completed' | 'dnf';
  dnf_type?: 'soft' | 'hard' | null;
  display_order?: number;
}

const Index = () => {
  const { isIOS, isReadReceiptApp } = usePlatform();
  const { accentCardColor, accentTextColor } = useUserAccent();
  const [userId, setUserId] = useState<string | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewFor, setReviewFor] = useState<{ bookId: string } | null>(null);
  const [dnfDialogFor, setDnfDialogFor] = useState<{ bookId: string; bookTitle: string } | null>(null);
  const [completedBooksThisYear, setCompletedBooksThisYear] = useState(0);
  const [headerOpacity, setHeaderOpacity] = useState(1);
  const { toast } = useToast();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Pull-to-refresh
  const { scrollableRef, pullDistance, isRefreshing, showPullIndicator } = usePullToRefresh({
    onRefresh: async () => {
      // Show success immediately for better UX
      toast({
        title: "Refreshed!",
        description: "Updating your books...",
      });
      // Load in background
      loadBooks();
    },
  });

  // Scroll detection for header fade effect (iOS only)
  useEffect(() => {
    const isIOSPlatform = isIOS || isReadReceiptApp || (typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent));
    if (!isIOSPlatform) return;

    const handleScroll = () => {
      const container = scrollContainerRef.current;
      if (!container) return;
      
      const scrollY = container.scrollTop;
      const fadeStart = 0;
      const fadeEnd = 150;
      
      if (scrollY <= fadeStart) {
        setHeaderOpacity(1);
      } else if (scrollY >= fadeEnd) {
        setHeaderOpacity(0);
      } else {
        const opacity = 1 - (scrollY - fadeStart) / (fadeEnd - fadeStart);
        setHeaderOpacity(opacity);
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [isIOS, isReadReceiptApp]);

  // Watch auth state
  useEffect(() => {
    

    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setUserId(sess?.user?.id ?? null);
    });

    return () => {
      try {
        sub?.subscription?.unsubscribe();
      } catch {}
    };
  }, []);

  // Load books: Supabase when logged in, otherwise localStorage
  const loadBooks = async () => {
    if (books.length === 0) setLoading(true);
    try {
      if (userId) {
        const { data, error } = await supabase
          .from("books")
          .select("id,title,author,total_pages,current_page,cover_url,started_at,finished_at,created_at,status,dnf_type,display_order")
          .eq("user_id", userId)  // Only fetch current user's books
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: true });

          if (error) throw error;

          const saved = localStorage.getItem("reading-tracker-books");
          if ((!data || data.length === 0) && saved) {
            const parsed: Array<{
              title: string;
              author: string;
              totalPages: number;
              currentPage: number;
            }> = JSON.parse(saved);

            if (parsed?.length) {
              const rows = parsed.map((b) => ({
                user_id: userId,
                title: b.title,
                author: b.author,
                total_pages: b.totalPages,
                current_page: b.currentPage,
              }));
              const { error: insErr } = await supabase.from("books").insert(rows);
              if (!insErr) {
                localStorage.removeItem("reading-tracker-books");
                const { data: migrated } = await supabase
                  .from("books")
                  .select("id,title,author,total_pages,current_page,cover_url,started_at,finished_at,created_at,status,dnf_type,display_order")
                  .eq("user_id", userId)  // Only fetch current user's books
                  .order("display_order", { ascending: true })
                  .order("created_at", { ascending: true });
                setBooks(
                  (migrated ?? []).map((r: any) => ({
                    id: r.id,
                    title: r.title,
                    author: r.author,
                    totalPages: r.total_pages,
                    currentPage: r.current_page,
                    coverUrl: r.cover_url,
                    status: r.status,
                    dnf_type: r.dnf_type,
                    started_at: r.started_at,
                    finished_at: r.finished_at,
                    display_order: r.display_order ?? 0,
                  }))
                );
                setLoading(false);
                return;
              }
            }
          }

          setBooks(
            (data ?? []).map((r: any) => ({
              id: r.id,
              title: r.title,
              author: r.author,
              totalPages: r.total_pages,
              currentPage: r.current_page,
              coverUrl: r.cover_url,
              started_at: r.started_at,
              finished_at: r.finished_at,
              status: r.status,
              dnf_type: r.dnf_type,
              display_order: r.display_order ?? 0,
            }))
          );
          console.log('Books with covers:', data?.map(r => ({ title: r.title, coverUrl: r.cover_url })));
          
          // Auto-populate covers for books without them
          if (data?.length) {
            populateCoversForBooksWithoutThem(data, userId);
          }
      } else {
        const saved = localStorage.getItem("reading-tracker-books");
        setBooks(saved ? JSON.parse(saved) : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, [userId]);

  // Fetch completed entries count for the current year (counts re-reads) + fallback to books without entries
  useEffect(() => {
    const fetchCompletedCount = async () => {
      if (!userId) { setCompletedBooksThisYear(0); return; }
      const y = new Date().getFullYear();
      const start = `${y}-01-01`;
      const end = `${y}-12-31`;

      const [
        { data: entries, error: entriesError },
        { data: books, error: booksError }
      ] = await Promise.all([
        supabase
          .from('reading_entries')
          .select('id, book_id')
          .eq('user_id', userId)
          .not('finished_at', 'is', null)
          .gte('finished_at', start)
          .lte('finished_at', end),
        supabase
          .from('books')
          .select('id, current_page, total_pages, finished_at, created_at, status')
          .eq('user_id', userId)
      ]);

      const entryCount = entries?.length ?? 0;
      const booksWithEntry = new Set((entries ?? []).map((e: any) => e.book_id));
      let extra = 0;
      if (books) {
        extra = books.filter((b: any) => {
          if (booksWithEntry.has(b.id)) return false;
          if (b.status === 'dnf' || b.status === 'top_five') return false;
          const completedFlag = (b.status === 'completed') || ((b.current_page ?? 0) >= (b.total_pages ?? 0));
          if (!completedFlag) return false;
          if (b.finished_at) {
            const fy = new Date(b.finished_at).getFullYear();
            return fy === y;
          }
          if (b.status === 'completed' && b.created_at) {
            const cy = new Date(b.created_at).getFullYear();
            return cy === y;
          }
          return false;
        }).length;
      }

      setCompletedBooksThisYear(entryCount + extra);
      console.log('Home completed count:', { entryCount, extra, total: entryCount + extra, entriesError, booksError });
    };
    fetchCompletedCount();

    // Refresh when reading entries change
    const onEntriesChanged = () => fetchCompletedCount();
    window.addEventListener('reading-entries-changed', onEntriesChanged);
    return () => window.removeEventListener('reading-entries-changed', onEntriesChanged);
  }, [userId]);

  // Function to populate covers for existing books without covers
  const populateCoversForBooksWithoutThem = async (books: any[], userId: string) => {
    const booksWithoutCovers = books.filter(book => !book.cover_url);
    
    for (const book of booksWithoutCovers) {
      try {
        // Search for the book to get cover URL
        const searchQuery = `${book.title} ${book.author}`;
        const results = await searchGoogleBooks(searchQuery);
        
        if (results.length > 0 && results[0].imageLinks?.thumbnail) {
          // Update the book with the cover URL
          const { error } = await supabase
            .from('books')
            .update({ cover_url: results[0].imageLinks.thumbnail })
            .eq('id', book.id);
            
          if (!error) {
            console.log(`Updated cover for "${book.title}" by ${book.author}`);
            // Update local state
            setBooks(prevBooks => 
              prevBooks.map(b => 
                b.id === book.id 
                  ? { ...b, coverUrl: results[0].imageLinks.thumbnail }
                  : b
              )
            );
          }
        }
      } catch (error) {
        console.log(`Failed to fetch cover for "${book.title}":`, error);
      }
      
      // Add delay to avoid hitting Google Books API rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  };

  // Persist to localStorage when logged out
  useEffect(() => {
    if (!userId) {
      localStorage.setItem("reading-tracker-books", JSON.stringify(books));
    }
  }, [books, userId]);

  const handleAddBook = async (bookData: Omit<Book, "id" | "currentPage">) => {
    if (userId) {
      const { data, error } = await supabase
        .from("books")
        .insert([
          {
            user_id: userId,
            title: bookData.title,
            author: bookData.author,
            total_pages: bookData.totalPages,
            current_page: 0,
            cover_url: bookData.coverUrl || null,
          },
        ])
        .select();

      if (!error && data?.length) {
        const r = data[0] as any;
        setBooks((prev) => [
          ...prev,
          {
            id: r.id,
            title: r.title,
            author: r.author,
            totalPages: r.total_pages,
            currentPage: r.current_page,
            coverUrl: r.cover_url,
            started_at: r.started_at,
            finished_at: r.finished_at,
          },
        ]);
      }
    } else {
      const newBook: Book = {
        id: Date.now().toString(),
        ...bookData,
        currentPage: 0,
      };
      setBooks((prev) => [...prev, newBook]);
    }
  };

  const handleUpdateProgress = async (id: string, currentPage: number) => {
    if (userId) {
      const prev = books.find((b) => b.id === id)?.currentPage ?? 0;

      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase.from("books").update({ current_page: currentPage }).eq("id", id),
        supabase.from("reading_progress").insert([
          { user_id: userId, book_id: id, from_page: prev, to_page: currentPage },
        ]),
      ]);

      if (!e1 && !e2) {
        setBooks((prevBooks) =>
          prevBooks.map((b) => (b.id === id ? { ...b, currentPage } : b))
        );
        const book = books.find((b) => b.id === id);
        // Fix completion logic: book is complete when current page >= total pages
        if (book && currentPage >= book.totalPages && prev < book.totalPages) {
          setReviewFor({ bookId: id });
        }
      }
    } else {
      setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, currentPage } : b)));
      const book = books.find((b) => b.id === id);
      if (book && currentPage >= book.totalPages && book.currentPage < book.totalPages) {
        setReviewFor({ bookId: id });
      }
    }
  };

  const handleUpdateDates = async (id: string, startedAt?: string, finishedAt?: string) => {
    if (userId) {
      const updateData: any = {};
      if (startedAt !== undefined) updateData.started_at = startedAt || null;
      if (finishedAt !== undefined) updateData.finished_at = finishedAt || null;

      const { error } = await supabase
        .from("books")
        .update(updateData)
        .eq("id", id);

      if (!error) {
        setBooks((prevBooks) =>
          prevBooks.map((b) => 
            b.id === id 
              ? { 
                  ...b, 
                  started_at: startedAt, 
                  finished_at: finishedAt 
                } 
              : b
          )
        );
      }
    } else {
      setBooks((prev) => 
        prev.map((b) => 
          b.id === id 
            ? { 
                ...b, 
                started_at: startedAt, 
                finished_at: finishedAt 
              } 
            : b
        )
      );
    }
  };

  const handleMarkAsDnf = async (id: string) => {
    const book = books.find(b => b.id === id);
    if (!book) return;
    
    setDnfDialogFor({ bookId: id, bookTitle: book.title });
  };

  const handleDnfTypeSelect = async (dnfType: 'soft' | 'hard') => {
    if (!dnfDialogFor) return;
    
    try {
      if (userId) {
        // Check if this is a TBR book being moved to DNF
        const pendingTBRBook = (window as any)._pendingTBRBook;
        if (pendingTBRBook && pendingTBRBook.id === dnfDialogFor.bookId) {
          // Create a new book entry with DNF status
          const { error } = await supabase
            .from("books")
            .insert({
              user_id: userId,
              title: pendingTBRBook.title,
              author: pendingTBRBook.author,
              total_pages: pendingTBRBook.total_pages || 0,
              current_page: 0,
              cover_url: pendingTBRBook.cover_url,
              status: 'dnf',
              dnf_type: dnfType,
            });

          if (error) throw error;

          // Clear the temporary data
          delete (window as any)._pendingTBRBook;

          toast({
            title: "Book marked as DNF",
            description: `"${pendingTBRBook.title}" has been marked as ${dnfType === 'soft' ? 'Soft' : 'Hard'} DNF`,
          });

          // Reload books
          loadBooks();
        } else {
          // Regular book being marked as DNF
          const { error } = await supabase
            .from("books")
            .update({ status: 'dnf', dnf_type: dnfType })
            .eq("id", dnfDialogFor.bookId);

          if (error) throw error;

          setBooks((prev) => prev.map(b => 
            b.id === dnfDialogFor.bookId 
              ? { ...b, status: 'dnf' as const, dnf_type: dnfType } 
              : b
          ));
          toast({
            title: "Book marked as DNF",
            description: `Book marked as ${dnfType === 'soft' ? 'Soft' : 'Hard'} DNF`,
          });
        }
      } else {
        setBooks((prev) => prev.map(b => 
          b.id === dnfDialogFor.bookId 
            ? { ...b, status: 'dnf' as const, dnf_type: dnfType } 
            : b
        ));
        toast({
          title: "Book marked as DNF",
          description: `Book marked as ${dnfType === 'soft' ? 'Soft' : 'Hard'} DNF`,
        });
      }
    } catch (error: any) {
      console.error("Error marking book as DNF:", error);
      toast({
        title: "Error updating book",
        description: error.message || "Failed to mark book as DNF",
        variant: "destructive",
      });
    } finally {
      setDnfDialogFor(null);
      delete (window as any)._pendingTBRBook;
    }
  };

  const handleMoveToInProgress = async (id: string) => {
    try {
      if (userId) {
        const { error } = await supabase
          .from("books")
          .update({ status: 'in_progress' })
          .eq("id", id);

        if (error) throw error;
      }
      
      setBooks((prev) => prev.map(b => 
        b.id === id ? { ...b, status: 'in_progress' as const } : b
      ));
      
      toast({
        title: "Book moved",
        description: "Book moved to In Progress",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to move book",
        variant: "destructive",
      });
    }
  };

  const handleMoveToCompleted = async (id: string) => {
    try {
      const book = books.find(b => b.id === id);
      if (!book) return;

      if (userId) {
        const { error } = await supabase
          .from("books")
          .update({ 
            status: 'completed',
            current_page: book.totalPages,
            finished_at: new Date().toISOString()
          })
          .eq("id", id);

        if (error) throw error;
      }
      
      setBooks((prev) => prev.map(b => 
        b.id === id 
          ? { 
              ...b, 
              status: 'completed' as const, 
              currentPage: b.totalPages,
              finished_at: new Date().toISOString() 
            } 
          : b
      ));
      
      toast({
        title: "Congratulations! 🎉",
        description: "Book marked as completed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to mark book as completed",
        variant: "destructive",
      });
    }
  };

  const handleMoveToDNF = async (id: string) => {
    const book = books.find(b => b.id === id);
    if (!book) return;
    
    setDnfDialogFor({ bookId: id, bookTitle: book.title });
  };

  const handleMoveToCompletedFromTBR = async (tbrBookId: string) => {
    try {
      if (!userId) return;

      // Get the TBR book details
      const { data: tbrBook, error: fetchError } = await supabase
        .from("tbr_books")
        .select("*")
        .eq("id", tbrBookId)
        .single();

      if (fetchError || !tbrBook) throw fetchError;

      // Create a book in the books table with completed status
      const { error: insertError } = await supabase
        .from("books")
        .insert({
          user_id: userId,
          title: tbrBook.title,
          author: tbrBook.author,
          total_pages: tbrBook.total_pages || 0,
          current_page: tbrBook.total_pages || 0,
          cover_url: tbrBook.cover_url,
          status: 'completed',
          finished_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      toast({
        title: "Book marked as completed",
        description: `"${tbrBook.title}" has been moved to completed books`,
      });

      // Reload books
      loadBooks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to move book to completed",
        variant: "destructive",
      });
    }
  };

  const handleMoveToDNFFromTBR = async (tbrBookId: string) => {
    try {
      if (!userId) return;

      // Get the TBR book details
      const { data: tbrBook, error: fetchError } = await supabase
        .from("tbr_books")
        .select("*")
        .eq("id", tbrBookId)
        .single();

      if (fetchError || !tbrBook) throw fetchError;

      // Show DNF type selection dialog
      setDnfDialogFor({ 
        bookId: tbrBookId, 
        bookTitle: tbrBook.title 
      });

      // Store TBR book data temporarily for later use
      (window as any)._pendingTBRBook = tbrBook;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to move book to DNF",
        variant: "destructive",
      });
    }
  };

  const handleReorderBook = async (bookId: string, direction: 'up' | 'down') => {
    if (!userId) return;

    const currentIndex = inProgressBooks.findIndex(b => b.id === bookId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= inProgressBooks.length) return;

    const currentBook = inProgressBooks[currentIndex];
    const targetBook = inProgressBooks[targetIndex];

    // Swap display orders
    const updates = [
      supabase.from('books').update({ display_order: targetBook.display_order || targetIndex }).eq('id', currentBook.id),
      supabase.from('books').update({ display_order: currentBook.display_order || currentIndex }).eq('id', targetBook.id)
    ];

    await Promise.all(updates);
    loadBooks();

    toast({
      title: "Books reordered",
      description: "Reading order updated",
    });
  };

  const handleReorderInProgress = async (newOrder: Book[]) => {
    try {
      if (userId) {
        await Promise.all(
          newOrder.map((b, i) =>
            supabase.from('books').update({ display_order: i }).eq('id', b.id)
          )
        );
      }
      // Update local state order and display_order values
      setBooks((prev) => {
        const inProgIds = newOrder.map((b) => b.id);
        const inProgSet = new Set(inProgIds);
        const inProgPrev = prev.filter((b) => b.currentPage < b.totalPages && b.status !== 'dnf');
        const others = prev.filter((b) => !(b.currentPage < b.totalPages && b.status !== 'dnf'));
        const updatedInProg = newOrder.map((o, i) => {
          const found = inProgPrev.find((b) => b.id === o.id)!;
          return { ...found, display_order: i };
        });
        return [...updatedInProg, ...others];
      });
      toast({ title: 'Order updated', description: 'Reordered your in-progress books.' });
    } catch (e) {
      console.error('Reorder error', e);
      toast({ title: 'Reorder failed', description: 'Could not update order', variant: 'destructive' });
    }
  };

  const handleMoveToTBR = async (id: string) => {
    try {
      const book = books.find(b => b.id === id);
      if (!book) return;

      if (userId) {
        // Insert into TBR table
        const { error: insertError } = await supabase
          .from("tbr_books")
          .insert({
            user_id: userId,
            title: book.title,
            author: book.author,
            total_pages: book.totalPages,
            cover_url: book.coverUrl,
          });

        if (insertError) throw insertError;

        // Delete from books table
        const { error: deleteError } = await supabase
          .from("books")
          .delete()
          .eq("id", id);

        if (deleteError) throw deleteError;
      }
      
      setBooks((prev) => prev.filter(b => b.id !== id));
      
      toast({
        title: "Book moved",
        description: "Book moved to TBR list",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to move book to TBR",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (userId) {
      const { error } = await supabase.from("books").delete().eq("id", id);
      if (!error) {
        setBooks((prev) => prev.filter((b) => b.id !== id));
      } else {
        console.error("Failed to delete book:", error);
      }
    } else {
      setBooks((prev) => prev.filter((b) => b.id !== id));
    }
  };

  const handleCoverUpdate = (bookId: string, newCoverUrl: string) => {
    setBooks((prevBooks) =>
      prevBooks.map((book) =>
        book.id === bookId ? { ...book, coverUrl: newCoverUrl } : book
      )
    );
  };

  const booksInProgress = books.filter(
    (b) => b.currentPage < b.totalPages && b.status !== 'dnf' && String(b.status) !== 'top_five'
  ).length;
  const completedBooks = books.filter((b) => b.currentPage >= b.totalPages && b.status !== 'dnf').length;
  const dnfBooks = books.filter((b) => b.status === 'dnf').length;
  
  // Load completed entries (supports re-reads) for current year from reading_entries
  const currentYear = new Date().getFullYear();
  
  // Lists for rendering
  const inProgressBooks = books.filter((b) => b.currentPage < b.totalPages && b.status !== 'dnf' && String(b.status) !== 'top_five');
  const completedBookItems = books.filter((b) => b.currentPage >= b.totalPages && b.status !== 'dnf');
  const dnfBookItems = books.filter((b) => b.status === 'dnf');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  const isIOSPlatform = isIOS || isReadReceiptApp || (typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent));

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Navigation />

      {/* iOS Header - Only on Home page */}
      {isIOSPlatform && (
        <header 
          className="bg-card border-b border-border transition-opacity duration-300 px-4 py-3"
          style={{ 
            opacity: headerOpacity,
            pointerEvents: headerOpacity < 0.1 ? 'none' : 'auto'
          }}
        >
          <div className="flex items-center justify-center">
            <img
              src="/assets/readreceipt-header-ios.png"
              alt="ReadReceipt"
              className="h-12"
            />
          </div>
        </header>
      )}

      <div 
        ref={(el) => {
          if (scrollableRef) scrollableRef.current = el;
          scrollContainerRef.current = el;
        }}
        className="relative overflow-y-auto"
        style={{ 
          height: isIOSPlatform ? 'calc(100dvh - 4rem)' : 'auto',
          paddingTop: isIOSPlatform ? 'calc(env(safe-area-inset-top, 0px) + 12px)' : undefined,
          paddingBottom: isIOSPlatform ? 'calc(4rem + env(safe-area-inset-bottom, 0px) + 16px)' : undefined,
          marginTop: showPullIndicator ? `${pullDistance}px` : undefined
        }}
      >
        {/* Pull-to-refresh indicator */}
        {showPullIndicator && (
          <div 
            className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200"
            style={{ 
              height: `${pullDistance}px`,
              opacity: Math.min(pullDistance / 80, 1),
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <RefreshCw 
                className={`w-6 h-6 text-primary ${isRefreshing ? 'animate-spin' : ''}`}
                style={{
                  transform: `rotate(${pullDistance * 3}deg)`,
                }}
              />
              <span className="text-xs text-muted-foreground">
                {isRefreshing ? 'Refreshing...' : pullDistance >= 80 ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </div>
          </div>
        )}

      <main className="container mx-auto px-2 sm:px-4 py-3 sm:py-8"
        style={{ paddingTop: showPullIndicator ? `${pullDistance + 12}px` : undefined }}
      >
        {/* Header with Add Book button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-3 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Your Reading Journey</h1>
          <AddBookDialog onAddBook={handleAddBook} />
        </div>

        {/* Main Content Area */}
        {books.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <img
                src="/assets/readreceipt-logo.png"
                alt="ReadReceipt logo"
                className="w-24 h-24"
              />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Start Your Reading Journey
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Add your first book to begin tracking your reading progress and stay motivated with encouraging messages.
            </p>
            <AddBookDialog onAddBook={handleAddBook} />
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-8">
            {/* Reading Goals Section - Moved to top and made larger */}
            <div className="max-w-2xl mx-auto">
              <HomeReadingGoals userId={userId} completedBooksThisYear={completedBooksThisYear} accentColor={accentCardColor} accentTextColor={accentTextColor} />
            </div>

            {/* Currently Reading Section */}
            {inProgressBooks.length > 0 && (
              <section>
                <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4" style={{ color: accentTextColor }}>
                  Currently Reading
                </h2>
                 <SortableBookGrid
                   items={inProgressBooks}
                   className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6"
                   onReorder={handleReorderInProgress}
                   renderItem={(book) => (
                     <BookCard
                       book={book}
                       onUpdateProgress={handleUpdateProgress}
                       onDeleteBook={handleDeleteBook}
                       onCoverUpdate={handleCoverUpdate}
                       onUpdateDates={handleUpdateDates}
                       onMoveToInProgress={handleMoveToInProgress}
                       onMoveToCompleted={handleMoveToCompleted}
                       onMoveToDNF={handleMoveToDNF}
                       onMoveToTBR={handleMoveToTBR}
                       onBookUpdated={loadBooks}
                       accentColor={accentCardColor}
                       accentTextColor={accentTextColor}
                     />
                   )}
                 />
              </section>
            )}

            {/* Stats Grid - Now 2 columns */}
            <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4 items-start">
              <div
                className="rounded-lg p-2.5 sm:p-3 shadow-soft border self-start"
                style={{ backgroundColor: accentCardColor, borderColor: accentCardColor }}
              >
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: accentTextColor }}
                  >
                    <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: accentCardColor }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-lg sm:text-xl font-bold" style={{ color: accentTextColor }}>{booksInProgress}</p>
                    <p className="text-[10px] sm:text-xs opacity-80" style={{ color: accentTextColor }}>In Progress</p>
                  </div>
                </div>
                {inProgressBooks.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {inProgressBooks.map((book) => (
                      <div key={`progress-cover-${book.id}`} className="flex-shrink-0">
                        {book.coverUrl ? (
                          <img 
                            src={book.coverUrl} 
                            alt={book.title}
                            className="w-6 h-8 object-contain rounded shadow-sm"
                            title={`${book.title} by ${book.author}`}
                          />
                        ) : (
                          <div className="w-6 h-8 bg-muted rounded flex items-center justify-center shadow-sm" title={`${book.title} by ${book.author}`}>
                            <TrendingUp className="w-3 h-3 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Link
                to="/completed"
                className="rounded-lg p-2.5 sm:p-3 shadow-soft border hover:shadow-lg transition-shadow cursor-pointer self-start"
                style={{ backgroundColor: accentCardColor, borderColor: accentCardColor }}
              >
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: accentTextColor }}
                  >
                    <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: accentCardColor }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-lg sm:text-xl font-bold" style={{ color: accentTextColor }}>{completedBooks}</p>
                    <p className="text-[10px] sm:text-xs opacity-80" style={{ color: accentTextColor }}>Completed</p>
                  </div>
                </div>
                {completedBookItems.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {completedBookItems.slice(0, 12).map((book) => (
                      <div key={`completed-cover-${book.id}`} className="flex-shrink-0">
                        {book.coverUrl ? (
                          <img 
                            src={book.coverUrl} 
                            alt={book.title}
                            className="w-6 h-8 object-contain rounded shadow-sm"
                            title={`${book.title} by ${book.author}`}
                          />
                        ) : (
                          <div className="w-6 h-8 bg-muted rounded flex items-center justify-center shadow-sm" title={`${book.title} by ${book.author}`}>
                            <Target className="w-3 h-3 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Link>
            </div>

            {/* TBR and DNF Lists side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 items-start">
              {/* TBR List */}
              <div>
                {userId && (
                  <TBRList 
                    userId={userId} 
                    onMoveToReading={handleAddBook}
                    onMoveToCompleted={handleMoveToCompletedFromTBR}
                    onMoveToDNF={handleMoveToDNFFromTBR}
                    accentColor={accentCardColor}
                    accentTextColor={accentTextColor}
                  />
                )}
              </div>

              {/* DNF Books Section */}
              <div 
                className="rounded-lg p-3 sm:p-6 shadow-soft border"
                style={{ 
                  backgroundColor: accentCardColor,
                  borderColor: accentCardColor
                }}
              >
                <h2 
                  className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2"
                  style={{ color: accentTextColor }}
                >
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  Did Not Finish ({dnfBooks})
                </h2>
                {dnfBookItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <XCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No DNF books. Every book deserves a chance!</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {dnfBookItems.map((book) => (
                      <div key={book.id} className="border border-border rounded-lg p-3 pr-10 hover:bg-accent/5 transition-colors relative">
                        <div className="flex items-start gap-3">
                          {/* Book Cover */}
                          <div className="flex-shrink-0">
                            {book.coverUrl ? (
                              <img 
                                src={book.coverUrl} 
                                alt={book.title}
                                className="w-12 h-16 object-contain rounded shadow-sm"
                              />
                            ) : (
                              <div className="w-12 h-16 bg-muted rounded flex items-center justify-center shadow-sm">
                                <XCircle className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Book Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-foreground truncate">{book.title}</h3>
                              {book.dnf_type && (
                                <span className="text-xs px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-700 dark:text-orange-300 whitespace-nowrap">
                                  {book.dnf_type === 'soft' ? 'Soft DNF' : 'Hard DNF'}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">by {book.author}</p>
                            {book.totalPages && (
                              <p className="text-xs text-muted-foreground">{book.totalPages} pages</p>
                            )}
                          </div>
                        </div>
                        {/* Actions: Move menu */}
                        <div className="absolute top-1 right-1">
                          <BookMoveMenu
                            bookId={book.id}
                            currentStatus={'dnf'}
                            onMoveToInProgress={handleMoveToInProgress}
                            onMoveToCompleted={handleMoveToCompleted}
                            onMoveToDNF={handleMoveToDNF}
                            onMoveToTBR={handleMoveToTBR}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Show message if no books in progress */}
            {inProgressBooks.length === 0 && (
              <div className="text-center py-12 bg-card rounded-lg border">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No books in progress
                </h3>
                <p className="text-muted-foreground mb-4">
                  Start reading a new book to track your progress!
                </p>
              </div>
            )}
          </div>
        )}
      </main>
      </div>

      {/* Review modal */}
      {reviewFor && userId && (
        <ReviewDialog
          open={true}
          onClose={() => setReviewFor(null)}
          userId={userId}
          bookId={reviewFor.bookId}
        />
      )}

      {/* DNF Type Dialog */}
      {dnfDialogFor && (
        <DNFTypeDialog
          open={true}
          onClose={() => setDnfDialogFor(null)}
          onSelect={handleDnfTypeSelect}
          bookTitle={dnfDialogFor.bookTitle}
        />
      )}
    </div>
  );
};

export default Index;

