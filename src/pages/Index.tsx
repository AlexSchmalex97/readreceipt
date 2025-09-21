import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { AddBookDialog } from "@/components/AddBookDialog";
import { BookCard } from "@/components/BookCard";
import { TrendingUp, Target } from "lucide-react";
import { hasSupabase, supabase } from "@/lib/supabase";
import { AuthButtons } from "@/components/AuthButtons";
import { ReviewDialog } from "@/components/ReviewDialog";

interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
}

const Index = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewFor, setReviewFor] = useState<{ bookId: string } | null>(null);

  const { pathname } = useLocation();

  // Watch auth state
  useEffect(() => {
    if (!hasSupabase || !supabase) return;

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
        if (hasSupabase && supabase && userId) {
          const { data, error } = await supabase
            .from("books")
            .select("id,title,author,total_pages,current_page,created_at")
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
                  .select("id,title,author,total_pages,current_page,created_at")
                  .order("created_at", { ascending: true });
                setBooks(
                  (migrated ?? []).map((r: any) => ({
                    id: r.id,
                    title: r.title,
                    author: r.author,
                    totalPages: r.total_pages,
                    currentPage: r.current_page,
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
            }))
          );
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

  // Persist to localStorage when logged out
  useEffect(() => {
    if (!(hasSupabase && supabase && userId)) {
      localStorage.setItem("reading-tracker-books", JSON.stringify(books));
    }
  }, [books, userId]);

  const handleAddBook = async (bookData: Omit<Book, "id" | "currentPage">) => {
    if (hasSupabase && supabase && userId) {
      const { data, error } = await supabase
        .from("books")
        .insert([
          {
            user_id: userId,
            title: bookData.title,
            author: bookData.author,
            total_pages: bookData.totalPages,
            current_page: 0,
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
    if (hasSupabase && supabase && userId) {
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
        const total = books.find((b) => b.id === id)?.totalPages ?? -1;
        if (currentPage === total) setReviewFor({ bookId: id });
      }
    } else {
      setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, currentPage } : b)));
    }
  };

  const totalBooks = books.length;
  const booksInProgress = books.filter(
    (b) => b.currentPage > 0 && b.currentPage < b.totalPages
  ).length;
  const completedBooks = books.filter((b) => b.currentPage === b.totalPages).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Header */}
      <header className="bg-card shadow-soft border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            {/* Left: Logo + Title + Nav */}
            <div className="flex items-center gap-3">
              <img
                src="/assets/readreceipt-logo.png"
                alt="ReadReceipt logo"
                className="w-14 h-14"
              />
              <div>
                <h1 className="text-2xl font-bold text-primary">ReadReceipt</h1>
                <p className="text-sm text-muted-foreground">
                  Track your reading progress and stay motivated
                </p>
              </div>

              <nav className="hidden sm:flex gap-6 ml-8">
                <Link
                  to="/people"
                  className={`text-sm ${
                    pathname === "/people"
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  People
                </Link>
                <Link
                  to="/feed"
                  className={`text-sm ${
                    pathname === "/feed"
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Feed
                </Link>
                <Link
                  to="/reviews"
                  className={`text-sm ${
                    pathname === "/reviews"
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Reviews
                </Link>
              </nav>
            </div>

            {/* Right: Auth */}
            <AuthButtons />
          </div>

          {/* Mobile nav */}
          <nav className="sm:hidden mt-4 flex gap-6">
            <Link
              to="/people"
              className={`text-sm ${
                pathname === "/people"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              People
            </Link>
            <Link
              to="/feed"
              className={`text-sm ${
                pathname === "/feed"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Feed
            </Link>
            <Link
              to="/reviews"
              className={`text-sm ${
                pathname === "/reviews"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Reviews
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        {totalBooks > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-card rounded-lg p-4 shadow-soft border border-border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                  <img
                    src="/assets/readreceipt-logo.png"
                    alt="ReadReceipt logo"
                    className="w-5 h-5"
                  />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalBooks}</p>
                  <p className="text-sm text-muted-foreground">Total Books</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg p-4 shadow-soft border border-border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{booksInProgress}</p>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg p-4 shadow-soft border border-border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{completedBooks}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Books Grid / Empty State */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onUpdateProgress={handleUpdateProgress}
              />
            ))}
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

