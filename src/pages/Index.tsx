import { useState, useEffect } from "react";
import { AddBookDialog } from "@/components/AddBookDialog";
import { BookCard } from "@/components/BookCard";
import { TBRList } from "@/components/TBRList";
import { TrendingUp, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ReviewDialog } from "@/components/ReviewDialog";
import { Navigation } from "@/components/Navigation";
import { Link } from "react-router-dom";
import { searchGoogleBooks } from "@/lib/googleBooks";

interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
  coverUrl?: string;
}

const Index = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewFor, setReviewFor] = useState<{ bookId: string } | null>(null);

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
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (userId) {
          const { data, error } = await supabase
            .from("books")
            .select("id,title,author,total_pages,current_page,cover_url,created_at")
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
                  .select("id,title,author,total_pages,current_page,cover_url,created_at")
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
    })();
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
    (b) => b.currentPage < b.totalPages
  ).length;
  const completedBooks = books.filter((b) => b.currentPage >= b.totalPages).length;
  
  // Lists for rendering
  const inProgressBooks = books.filter((b) => b.currentPage < b.totalPages);
  const completedBookItems = books.filter((b) => b.currentPage >= b.totalPages);

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
            {/* Currently Reading Section - Now at the top */}
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
                     />
                   ))}
                </div>
              </section>
            )}

            {/* Stats Grid with TBR - Now below Currently Reading */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
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
                  <div className="flex gap-1 mt-2 overflow-hidden">
                    {inProgressBooks.slice(0, 5).map((book) => (
                      <div key={`progress-cover-${book.id}`} className="flex-shrink-0">
                        {book.coverUrl ? (
                          <img 
                            src={book.coverUrl} 
                            alt={book.title}
                            className="w-5 h-7 object-cover rounded shadow-sm"
                            title={`${book.title} by ${book.author}`}
                          />
                        ) : (
                          <div className="w-5 h-7 bg-muted rounded flex items-center justify-center shadow-sm" title={`${book.title} by ${book.author}`}>
                            <TrendingUp className="w-2 h-2 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                    {inProgressBooks.length > 5 && (
                      <div className="flex-shrink-0 w-5 h-7 bg-muted/50 rounded flex items-center justify-center text-xs text-muted-foreground">
                        +{inProgressBooks.length - 5}
                      </div>
                    )}
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
                  <div className="flex gap-1 mt-2 overflow-hidden">
                    {completedBookItems.slice(0, 5).map((book) => (
                      <div key={`completed-cover-${book.id}`} className="flex-shrink-0">
                        {book.coverUrl ? (
                          <img 
                            src={book.coverUrl} 
                            alt={book.title}
                            className="w-5 h-7 object-cover rounded shadow-sm"
                            title={`${book.title} by ${book.author}`}
                          />
                        ) : (
                          <div className="w-5 h-7 bg-muted rounded flex items-center justify-center shadow-sm" title={`${book.title} by ${book.author}`}>
                            <Target className="w-2 h-2 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                    {completedBookItems.length > 5 && (
                      <div className="flex-shrink-0 w-5 h-7 bg-muted/50 rounded flex items-center justify-center text-xs text-muted-foreground">
                        +{completedBookItems.length - 5}
                      </div>
                    )}
                  </div>
                )}
              </Link>

              {/* TBR List - positioned to the right */}
              <div className="lg:col-span-2">
                {userId && <TBRList userId={userId} onMoveToReading={handleAddBook} />}
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
    </div>
  );
};

export default Index;

