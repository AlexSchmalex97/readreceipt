import { useState, useEffect } from "react";
import { AddBookDialog } from "@/components/AddBookDialog";
import { BookCard } from "@/components/BookCard";
import { TrendingUp, Target } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AuthButtons } from "@/components/AuthButtons";

interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
}

const Index = () => {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  // Watch auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessionUserId(data.session?.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSessionUserId(sess?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load books (cloud if logged in, local otherwise)
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        if (sessionUserId) {
          // Cloud
          const { data, error } = await supabase
            .from("books")
            .select("*")
            .order("created_at", { ascending: true });
          if (error) throw error;

          // Optional one-time migration: if cloud empty but local has data, push it up
          const saved = localStorage.getItem("reading-tracker-books");
          if ((!data || data.length === 0) && saved) {
            const parsed: Omit<Book, "id">[] = JSON.parse(saved).map((b: any) => ({
              title: b.title, author: b.author, totalPages: b.totalPages, currentPage: b.currentPage
            }));
            if (parsed.length > 0) {
              const rows = parsed.map((b) => ({ ...b, user_id: sessionUserId }));
              await supabase.from("books").insert(rows);
              localStorage.removeItem("reading-tracker-books");
              const { data: migrated } = await supabase.from("books").select("*").order("created_at");
              setBooks((migrated ?? []) as Book[]);
              setLoading(false);
              return;
            }
          }

          setBooks((data ?? []) as Book[]);
        } else {
          // Local
          const saved = localStorage.getItem("reading-tracker-books");
          setBooks(saved ? JSON.parse(saved) : []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [sessionUserId]);

  // Local persistence (only when logged out)
  useEffect(() => {
    if (!sessionUserId) {
      localStorage.setItem("reading-tracker-books", JSON.stringify(books));
    }
  }, [books, sessionUserId]);

  const handleAddBook = async (bookData: Omit<Book, "id" | "currentPage">) => {
    if (sessionUserId) {
      const { data, error } = await supabase
        .from("books")
        .insert([{ user_id: sessionUserId, title: bookData.title, author: bookData.author, total_pages: bookData.totalPages, current_page: 0 }])
        .select();
      if (!error && data) {
        // normalize to frontend shape
        const mapped = data.map((r: any) => ({
          id: r.id, title: r.title, author: r.author, totalPages: r.total_pages, currentPage: r.current_page
        }));
        setBooks((prev) => [...prev, ...mapped]);
      }
    } else {
      const newBook: Book = { id: Date.now().toString(), ...bookData, currentPage: 0 };
      setBooks((prev) => [...prev, newBook]);
    }
  };

  const handleUpdateProgress = async (id: string, currentPage: number) => {
    if (sessionUserId) {
      const { error } = await supabase
        .from("books")
        .update({ current_page: currentPage })
        .eq("id", id);
      if (!error) {
        setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, currentPage } : b)));
      }
    } else {
      setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, currentPage } : b)));
    }
  };

  const totalBooks = books.length;
  const booksInProgress = books.filter((b) => b.currentPage > 0 && b.currentPage < b.totalPages).length;
  const completedBooks = books.filter((b) => b.currentPage === b.totalPages).length;

  // Header (unchanged except maybe your ReadReceipt text/logo)
  // ... keep your existing header JSX here ...

  // Gate: if not logged in, show signin + keep local mode working
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="bg-card shadow-soft border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="/readreceipt-logo.png" alt="ReadReceipt logo" className="w-14 h-14" />
              <div>
                <h1 className="text-2xl font-bold text-primary">ReadReceipt</h1>
                <p className="text-sm text-muted-foreground">Track your reading progress and stay motivated</p>
              </div>
            </div>
            <AuthButtons />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Your existing stats + grids, reusing handleAddBook / handleUpdateProgress */}
        {/* ... keep your previous JSX here ... */}
      </main>
    </div>
  );
};

export default Index;
