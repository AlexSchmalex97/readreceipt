import { useState, useEffect } from "react";
import { AddBookDialog } from "@/components/AddBookDialog";
import { BookCard } from "@/components/BookCard";
import { TBRList } from "@/components/TBRList";
import { TrendingUp, Target, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ReviewDialog } from "@/components/ReviewDialog";
import { Navigation } from "@/components/Navigation";
import { ReadingGoals } from "@/components/ReadingGoals";
import { HomeReadingGoals } from "@/components/HomeReadingGoals";
import { BookDatesDialog } from "@/components/BookDatesDialog";
import { DNFTypeDialog } from "@/components/DNFTypeDialog";
import { Link } from "react-router-dom";
import { searchGoogleBooks } from "@/lib/googleBooks";
import { useToast } from "@/hooks/use-toast";

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
}

const Index = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewFor, setReviewFor] = useState<{ bookId: string } | null>(null);
  const [dnfDialogFor, setDnfDialogFor] = useState<{ bookId: string; bookTitle: string } | null>(null);
  const [completedBooksThisYear, setCompletedBooksThisYear] = useState(0);
  const { toast } = useToast();

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
    setLoading(true);
    try {
      if (userId) {
        const { data, error } = await supabase
          .from("books")
          .select("id,title,author,total_pages,current_page,cover_url,started_at,finished_at,created_at,status,dnf_type")
          .eq("user_id", userId)  // Only fetch current user's books
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
                  .select("id,title,author,total_pages,current_page,cover_url,started_at,finished_at,created_at,status,dnf_type")
                  .eq("user_id", userId)  // Only fetch current user's books
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

      // 1) Completed reading entries this year (re-reads supported)
      const { data: entries, error: entriesError } = await supabase
        .from('reading_entries')
        .select('id, book_id')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('finished_at', start)
        .lte('finished_at', end);

      const entryCount = entries?.length ?? 0;
      const booksWithEntry = new Set((entries ?? []).map((e: any) => e.book_id));

      // 2) Fallback: completed books this year that have NO entry this year (avoid double count)
      const { data: books, error: booksError } = await supabase
        .from('books')
        .select('id, current_page, total_pages, finished_at, created_at, status')
        .eq('user_id', userId);

      let extra = 0;
      if (books) {
        extra = books.filter((b: any) => {
          if (booksWithEntry.has(b.id)) return false;
          if (b.status === 'dnf') return false;
          if ((b.current_page ?? 0) < (b.total_pages ?? 0)) return false;
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
    (b) => b.currentPage < b.totalPages && b.status !== 'dnf'
  ).length;
  const completedBooks = books.filter((b) => b.currentPage >= b.totalPages && b.status !== 'dnf').length;
  const dnfBooks = books.filter((b) => b.status === 'dnf').length;
  
  // Load completed entries (supports re-reads) for current year from reading_entries
  const currentYear = new Date().getFullYear();
  
  // Lists for rendering
  const inProgressBooks = books.filter((b) => b.currentPage < b.totalPages && b.status !== 'dnf');
  const completedBookItems = books.filter((b) => b.currentPage >= b.totalPages && b.status !== 'dnf');
  const dnfBookItems = books.filter((b) => b.status === 'dnf');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Navigation />

      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {/* Header with Add Book button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Your Reading Journey</h1>
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
          <div className="space-y-8">
            {/* Currently Reading Section - At the top */}
            {inProgressBooks.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">Currently Reading</h2>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                   {inProgressBooks.map((book) => (
                     <BookCard
                       key={book.id}
                       book={book}
                       onUpdateProgress={handleUpdateProgress}
                       onDeleteBook={handleDeleteBook}
                       onCoverUpdate={handleCoverUpdate}
                       onUpdateDates={handleUpdateDates}
                       onMoveToInProgress={handleMoveToInProgress}
                       onMoveToCompleted={handleMoveToCompleted}
                       onMoveToDNF={handleMoveToDNF}
                       onMoveToTBR={handleMoveToTBR}
                     />
                   ))}
                 </div>
              </section>
            )}

            {/* Reading Goals Section - Compact card style */}
            <HomeReadingGoals userId={userId} completedBooksThisYear={completedBooksThisYear} />

            {/* Stats Grid - Now 2 columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <div className="bg-card rounded-lg p-3 shadow-soft border border-border self-start">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xl font-bold text-foreground">{booksInProgress}</p>
                    <p className="text-xs text-muted-foreground">In Progress</p>
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
                            className="w-6 h-8 object-cover rounded shadow-sm"
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

              <Link to="/completed" className="bg-card rounded-lg p-3 shadow-soft border border-border hover:shadow-lg transition-shadow cursor-pointer self-start">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                    <Target className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xl font-bold text-foreground">{completedBooks}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
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
                            className="w-6 h-8 object-cover rounded shadow-sm"
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {/* TBR List */}
              <div>
                {userId && (
                  <TBRList 
                    userId={userId} 
                    onMoveToReading={handleAddBook}
                    onMoveToCompleted={handleMoveToCompletedFromTBR}
                    onMoveToDNF={handleMoveToDNFFromTBR}
                  />
                )}
              </div>

              {/* DNF Books Section */}
              <div className="bg-card rounded-lg p-6 shadow-soft border border-border">
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-orange-500" />
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
                      <div key={book.id} className="border border-border rounded-lg p-3 hover:bg-accent/5 transition-colors relative">
                        <div className="flex items-start gap-3">
                          {/* Book Cover */}
                          <div className="flex-shrink-0">
                            {book.coverUrl ? (
                              <img 
                                src={book.coverUrl} 
                                alt={book.title}
                                className="w-12 h-16 object-cover rounded shadow-sm"
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

