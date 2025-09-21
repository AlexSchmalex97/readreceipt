import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";

type CompletedBook = {
  id: string;
  title: string;
  author: string;
  total_pages: number;
  created_at: string;
  user_id: string;
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

      // Get completed books (current_page >= total_pages) with reviews
      const { data: books, error: booksError } = await supabase
        .from("books")
        .select(`
          id, title, author, total_pages, current_page, created_at, user_id
        `)
        .eq("user_id", userId)
        .gte("current_page", "total_pages")
        .order("created_at", { ascending: false });

      console.log("Completed books query:", { books, booksError });

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

      const completed = (books ?? []).map(book => {
        const review = reviewsData.find(r => r.book_id === book.id);
        return {
          ...book,
          review
        };
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
                <h3 className="font-semibold text-lg mb-2">{book.title}</h3>
                <p className="text-muted-foreground mb-2">{book.author}</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {book.total_pages} pages • Completed {new Date(book.created_at).toLocaleDateString()}
                </p>
                
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}