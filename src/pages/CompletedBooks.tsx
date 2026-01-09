import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Trash2, BookOpen, Edit, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BookEditionSelector } from "@/components/BookEditionSelector";
import { BookEditDialog } from "@/components/BookEditDialog";
import { ReadingEntriesDialog } from "@/components/ReadingEntriesDialog";
import { ReviewDialog } from "@/components/ReviewDialog";
import { usePlatform } from "@/hooks/usePlatform";
import { useUserAccent } from "@/hooks/useUserAccent";

type CompletedBook = {
  id: string;
  title: string;
  author: string;
  total_pages: number;
  current_page: number;
  created_at: string;
  finished_at?: string | null;
  completed_at?: string | null;
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
  const { isIOS, isReadReceiptApp } = usePlatform();
  const { accentCardColor, accentTextColor } = useUserAccent();
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedBookForReview, setSelectedBookForReview] = useState<CompletedBook | null>(null);
  // Format Supabase date-only (YYYY-MM-DD) as local date to avoid timezone shift
  const toLocalDateString = (dateLike?: string | null) => {
    if (!dateLike) return "";
    // If it's a date-only string, build a local Date; otherwise parse normally
    const d = /\d{4}-\d{2}-\d{2}$/.test(dateLike)
      ? new Date(dateLike + "T00:00:00")
      : new Date(dateLike);
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
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

      // Get all books for user
      const { data: books, error: booksError } = await supabase
        .from("books")
        .select(`id, title, author, total_pages, current_page, created_at, finished_at, completed_at, status, user_id, cover_url`)
        .eq("user_id", userId)
        .order("completed_at", { ascending: false, nullsFirst: false })
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

      // Backfill books.finished_at (and status) from private reading_entries so
      // public profile pages can sort/display correctly.
      const syncUpdates = (books ?? [])
        .map((b: any) => {
          const latest = latestFinishedByBookId[b.id];
          if (!latest) return null;
          const needsDate = (b.finished_at ?? null) !== latest;
          const needsStatus = (b.status ?? null) !== 'completed';
          if (!needsDate && !needsStatus) return null;
          return { id: b.id, finished_at: latest };
        })
        .filter(Boolean) as Array<{ id: string; finished_at: string }>;

      if (syncUpdates.length > 0) {
        // Fire-and-forget: don't block rendering if this takes a moment.
        Promise.all(
          syncUpdates.map((u) =>
            supabase
              .from('books')
              .update({ finished_at: u.finished_at, status: 'completed' })
              .eq('id', u.id)
          )
        ).catch((e) => console.warn('Failed syncing book finished_at from reading entries', e));
      }

      const completed = (books ?? [])
        .filter((b: any) => (b.status === 'completed') || ((b.current_page ?? 0) >= (b.total_pages ?? Number.MAX_SAFE_INTEGER)))
        .map((book: any) => {
          const review = reviewsData.find((r: any) => r.book_id === book.id);
          const computed_finished_at = latestFinishedByBookId[book.id] ?? book.finished_at ?? null;
          return {
            ...book,
            review,
            computed_finished_at,
          } as CompletedBook;
        })
        .sort((a, b) => {
          // First sort by date (day-level)
          const dateA = new Date(a.computed_finished_at ?? a.finished_at ?? a.created_at);
          const dateB = new Date(b.computed_finished_at ?? b.finished_at ?? b.created_at);
          const dateDiff = dateB.getTime() - dateA.getTime();
          if (dateDiff !== 0) return dateDiff;
          // For same-day completions, use completed_at timestamp for precise ordering
          const caTime = a.completed_at ? new Date(a.completed_at).getTime() : 0;
          const cbTime = b.completed_at ? new Date(b.completed_at).getTime() : 0;
          return cbTime - caTime;
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
        <h1 className="text-2xl font-bold mb-6 text-primary">Completed Books</h1>
        
        {completedBooks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">No completed books yet.</p>
            <a href="/" className="text-primary underline">Start reading a book</a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedBooks.map((book) => (
              <div
                key={book.id}
                className="relative overflow-hidden p-6 rounded-lg border shadow-soft flex flex-col h-full"
                style={{ backgroundColor: accentCardColor, borderColor: accentCardColor }}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-1"
                  style={{ backgroundColor: accentTextColor, opacity: 0.35 }}
                />
                <div className="flex gap-4 mb-4">
                  {/* Book Cover */}
                  <div className="relative flex-shrink-0">
                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={`Cover of ${book.title}`}
                        loading="lazy"
                        decoding="async"
                        className="w-20 h-28 object-contain rounded shadow-sm"
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
                    <h3 className="font-semibold text-lg mb-2 truncate" style={{ color: accentTextColor }}>
                      {book.title}
                    </h3>
                    <p className="mb-2" style={{ color: accentTextColor, opacity: 0.85 }}>
                      by {book.author}
                    </p>
                    <p className="text-sm mb-4" style={{ color: accentTextColor, opacity: 0.75 }}>
                      {book.total_pages} pages • Completed {toLocalDateString(book.computed_finished_at ?? book.finished_at ?? book.created_at)}
                    </p>
                  </div>
                </div>
                
                {book.review ? (
                  <div className="border-t border-border/30 pt-4" style={{ borderColor: accentTextColor, opacity: 0.95 }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className="text-sm font-medium" style={{ color: accentTextColor }}>Your Review:</span>
                        <span className="ml-2" style={{ color: accentTextColor }}>⭐ {book.review.rating}/5</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedBookForReview(book);
                          setReviewDialogOpen(true);
                        }}
                        className="h-7 px-2"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                    {book.review.review && (
                      <p className="text-sm">{book.review.review}</p>
                    )}
                  </div>
                ) : (
                  <div className="border-t border-border/30 pt-4" style={{ borderColor: accentTextColor, opacity: 0.95 }}>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedBookForReview(book);
                        setReviewDialogOpen(true);
                      }}
                      className="w-full hover:opacity-90"
                      style={{ backgroundColor: accentTextColor, color: accentCardColor }}
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Write a Review
                    </Button>
                  </div>
                )}

                 <div className="mt-auto flex flex-wrap items-center justify-end gap-2 pt-4">
                   <BookEditDialog
                     bookId={book.id}
                     bookTitle={book.title}
                     bookAuthor={book.author}
                     totalPages={book.total_pages}
                     currentCoverUrl={book.cover_url}
                     onUpdate={() => setReloadCounter((c) => c + 1)}
                     triggerVariant="button"
                   />
                   <ReadingEntriesDialog bookId={book.id} bookTitle={book.title} onChanged={() => setReloadCounter((c) => c + 1)} />
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 whitespace-nowrap border-primary/30 hover:bg-primary/10 hover:border-primary/50"
                      onClick={() => handleMarkUnread(book)}
                      aria-label={`Mark ${book.title} as unread`}
                    >
                      Mark as unread
                    </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 whitespace-nowrap border-primary/50 hover:bg-primary/10 hover:border-primary"
                    onClick={() => markAsFavorite(book.id)}
                    aria-label={`Mark ${book.title} as favorite`}
                  >
                    <Star className="w-4 h-4 mr-1 text-primary" /> Favorite
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
      
      {/* Review Dialog */}
      {selectedBookForReview && userId && (
        <ReviewDialog
          open={reviewDialogOpen}
          onClose={() => {
            setReviewDialogOpen(false);
            setSelectedBookForReview(null);
          }}
          userId={userId}
          bookId={selectedBookForReview.id}
          existingReview={selectedBookForReview.review}
          onSaved={() => setReloadCounter((c) => c + 1)}
        />
      )}
    </div>
  );
}