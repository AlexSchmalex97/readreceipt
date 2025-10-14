import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Trash2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BookEditionSelector } from "@/components/BookEditionSelector";
import { ReadingEntriesDialog } from "@/components/ReadingEntriesDialog";

type CompletedBook = {
  id: string;
  title: string;
  author: string;
  total_pages: number;
  current_page: number;
  created_at: string;
  finished_at?: string | null;
  // Computed from latest reading_entries.finished_at (falls back to book.finished_at)
  computed_finished_at?: string | null;
  status?: string | null;
  user_id: string;
  cover_url?: string;
  review?: {
    id: string;
    rating: number;
    review: string | null;
  };
};

export default function CompletedBooks() {
  const [userId, setUserId] = useState<string | null>(null);
  const [completedBooks, setCompletedBooks] = useState<CompletedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [reloadCounter, setReloadCounter] = useState(0);

  // Format Supabase date-only (YYYY-MM-DD) as local date to avoid timezone shift
  const toLocalDateString = (dateLike?: string | null) => {
    if (!dateLike) return "";
    // If it's a date-only string, build a local Date; otherwise parse normally
    const d = /\d{4}-\d{2}-\d{2}$/.test(dateLike)
      ? new Date(dateLike + "T00:00:00")
      : new Date(dateLike);
    return d.toLocaleDateString();
  };

  const handleMarkUnread = async (book: CompletedBook) => {
    if (!userId) return;
    try {
      // Reset progress
      const { error: upErr } = await supabase
        .from("books")
        .update({ current_page: 0 })
        .eq("id", book.id);

      // Log progress reset (optional, for feed visibility)
      await supabase.from("reading_progress").insert([
        { user_id: userId, book_id: book.id, from_page: book.current_page ?? book.total_pages, to_page: 0 },
      ]);

      if (!upErr) {
        // Remove from completed list locally
        setCompletedBooks((prev) => prev.filter((b) => b.id !== book.id));
      }
    } catch (e) {
      console.error("Failed to mark unread", e);
    }
  };

  const handleDeleteBook = async (book: CompletedBook) => {
    if (!userId) return;
    try {
      const { error } = await supabase.from("books").delete().eq("id", book.id);
      if (!error) {
        setCompletedBooks((prev) => prev.filter((b) => b.id !== book.id));
        toast({
          title: "Book deleted",
          description: `"${book.title}" has been removed from your library.`,
        });
      }
    } catch (e) {
      console.error("Failed to delete book", e);
    }
  };

  const markAsFavorite = async (bookId: string) => {
    try {
      if (!userId) return;

      const { error } = await supabase
        .from('profiles')
        .update({ favorite_book_id: bookId })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Favorite book updated",
        description: "This book has been marked as your favorite.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // Refresh this page when reading entries change (e.g., Edit dates saved)
  useEffect(() => {
    const handler = () => setReloadCounter((c) => c + 1);
    window.addEventListener('reading-entries-changed', handler);
    return () => window.removeEventListener('reading-entries-changed', handler);
  }, []);

  useEffect(() => {
    (async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      setLoading(true);

      // Get all books for user and filter completed client-side (current_page >= total_pages)
      const { data: books, error: booksError } = await supabase
        .from("books")
        .select(`id, title, author, total_pages, current_page, created_at, finished_at, status, user_id, cover_url`)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      console.log("CompletedBooks - books query:", { books, booksError });

      const bookIds = (books ?? []).map((book: any) => book.id);

      // Get reviews for these books
      let reviewsData: any[] = [];
      if (bookIds.length > 0) {
        const { data: reviews, error: reviewsError } = await supabase
          .from("reviews")
          .select("id, rating, review, book_id")
          .in("book_id", bookIds);
        console.log("Reviews query:", { reviews, reviewsError });
        reviewsData = reviews ?? [];
      }

      // Get latest finished_at per book from reading_entries
      let latestFinishedByBookId: Record<string, string> = {};
      if (bookIds.length > 0) {
        const { data: entries, error: entriesError } = await supabase
          .from("reading_entries")
          .select("book_id, finished_at")
          .in("book_id", bookIds)
          .not("finished_at", "is", null);
        console.log("Reading entries query:", { entries, entriesError });
        (entries ?? []).forEach((e: any) => {
          if (!e.finished_at) return;
          const prev = latestFinishedByBookId[e.book_id];
          if (!prev || new Date(e.finished_at) > new Date(prev)) {
            latestFinishedByBookId[e.book_id] = e.finished_at;
          }
        });
      }

      const completed = (books ?? [])
        .filter((b: any) => (b.current_page ?? 0) >= (b.total_pages ?? Number.MAX_SAFE_INTEGER))
        .map((book: any) => {
          const review = reviewsData.find((r: any) => r.book_id === book.id);
          const computed_finished_at = latestFinishedByBookId[book.id] ?? book.finished_at ?? null;
          return {
            ...book,
            review,
            computed_finished_at,
          } as CompletedBook;
        });

      setCompletedBooks(completed);
      setLoading(false);
    })();
  }, [userId, reloadCounter]);

  if (loading) return (
    <div className="min-h-screen bg-gradient-soft">
      <Navigation />
      <div className="p-8 text-muted-foreground">Loading…</div>
    </div>
  );
  
  if (!userId) return (
    <div className="min-h-screen bg-gradient-soft">
      <Navigation />
      <div className="p-8">Sign in to view your completed books.</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Completed Books</h1>
        
        {completedBooks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">No completed books yet.</p>
            <a href="/" className="text-primary underline">Start reading a book</a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedBooks.map((book) => (
              <div key={book.id} className="bg-card p-6 rounded-lg border shadow-soft flex flex-col h-full">
                <div className="flex gap-4 mb-4">
                  {/* Book Cover */}
                  <div className="relative flex-shrink-0">
                    {book.cover_url ? (
                      <img 
                        src={book.cover_url} 
                        alt={book.title}
                        className="w-20 h-28 object-cover rounded shadow-sm"
                      />
                    ) : (
                      <div className="w-20 h-28 bg-muted rounded flex items-center justify-center shadow-sm">
                        <BookOpen className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    {/* Edition selector overlay */}
                    <div className="absolute -top-2 -right-2">
                      <BookEditionSelector
                        bookId={book.id}
                        bookTitle={book.title}
                        bookAuthor={book.author}
                        currentCoverUrl={book.cover_url}
                        onCoverUpdate={(newCoverUrl) => {
                          setCompletedBooks(prev => 
                            prev.map(b => 
                              b.id === book.id 
                                ? { ...b, cover_url: newCoverUrl }
                                : b
                            )
                          );
                        }}
                      />
                    </div>
                  </div>

                  {/* Book Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-2 truncate">{book.title}</h3>
                    <p className="text-muted-foreground mb-2">by {book.author}</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {book.total_pages} pages • Completed {toLocalDateString(book.computed_finished_at ?? book.finished_at ?? book.created_at)}
                    </p>
                  </div>
                </div>
                
                {book.review ? (
                  <div className="border-t pt-4">
                    <div className="flex items-center mb-2">
                      <span className="text-sm font-medium">Your Review:</span>
                      <span className="ml-2">⭐ {book.review.rating}/5</span>
                    </div>
                    {book.review.review && (
                      <p className="text-sm">{book.review.review}</p>
                    )}
                  </div>
                ) : (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground italic">No review yet</p>
                  </div>
                )}

                 <div className="mt-auto flex flex-wrap items-center justify-end gap-2 pt-4">
                   <ReadingEntriesDialog bookId={book.id} bookTitle={book.title} onChanged={() => setReloadCounter((c) => c + 1)} />
                   <Button
                     variant="outline"
                     size="sm"
                     className="shrink-0 whitespace-nowrap"
                     onClick={() => handleMarkUnread(book)}
                     aria-label={`Mark ${book.title} as unread`}
                   >
                     Mark as unread
                   </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 whitespace-nowrap"
                    onClick={() => markAsFavorite(book.id)}
                    aria-label={`Mark ${book.title} as favorite`}
                  >
                    ⭐ Favorite
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteBook(book)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    aria-label={`Delete ${book.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}