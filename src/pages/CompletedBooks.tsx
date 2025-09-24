import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Trash2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BookEditionSelector } from "@/components/BookEditionSelector";

type CompletedBook = {
  id: string;
  title: string;
  author: string;
  total_pages: number;
  current_page: number;
  created_at: string;
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
        .select(`
          id, title, author, total_pages, current_page, created_at, user_id, cover_url
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      console.log("CompletedBooks - books query:", { books, booksError });

      // Get reviews for these books
      const bookIds = (books ?? []).map(book => book.id);
      let reviewsData = [];
      if (bookIds.length > 0) {
        const { data: reviews, error: reviewsError } = await supabase
          .from("reviews")
          .select("id, rating, review, book_id")
          .in("book_id", bookIds);
        console.log("Reviews query:", { reviews, reviewsError });
        reviewsData = reviews ?? [];
      }

      const completed = (books ?? [])
        .filter((b: any) => (b.current_page ?? 0) >= (b.total_pages ?? Number.MAX_SAFE_INTEGER))
        .map((book: any) => {
          const review = reviewsData.find((r: any) => r.book_id === book.id);
          return {
            ...book,
            review,
          } as CompletedBook;
        });

      setCompletedBooks(completed);
      setLoading(false);
    })();
  }, [userId]);

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
              <div key={book.id} className="bg-card p-6 rounded-lg border shadow-soft">
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
                      {book.total_pages} pages • Completed {new Date(book.created_at).toLocaleDateString()}
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

                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkUnread(book)}
                    aria-label={`Mark ${book.title} as unread`}
                  >
                    Mark as unread
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAsFavorite(book.id)}
                    aria-label={`Mark ${book.title} as favorite`}
                  >
                    ⭐ Favorite
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteBook(book)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
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