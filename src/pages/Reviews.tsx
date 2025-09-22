import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { BookOpen } from "lucide-react";
import { BookEditionSelector } from "@/components/BookEditionSelector";

type FinishedBook = {
  id: string;
  title: string;
  author: string;
  total_pages: number;
  current_page: number;
  created_at: string;
  cover_url?: string;
};

type MyReview = {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  book_id: string;
  books: { title: string; author: string; cover_url?: string } | null;
};

export default function Reviews() {
  const [userId, setUserId] = useState<string | null>(null);
  const [finished, setFinished] = useState<FinishedBook[]>([]);
  const [reviews, setReviews] = useState<MyReview[]>([]);
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

      // Load all books for user and filter completed client-side
      const { data: allBooks, error: booksError } = await supabase
        .from("books")
        .select("id,title,author,total_pages,current_page,created_at,cover_url")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      console.log("Reviews - books query:", { allBooks, booksError });

      const finishedBooks = (allBooks ?? []).filter(
        (b: any) => (b.current_page ?? 0) >= (b.total_pages ?? Number.MAX_SAFE_INTEGER)
      );

      // Your reviews (joined with books for title/author)
      const { data: myReviews, error: reviewsError } = await supabase
        .from("reviews")
        .select(`
          id, rating, review, created_at,
          book_id,
          books:book_id(title, author, cover_url)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      console.log("Reviews query result:", { myReviews, reviewsError });

      setFinished((finishedBooks ?? []) as FinishedBook[]);
      
      // Process reviews data more carefully
      const processedReviews = (myReviews ?? []).map(review => {
        // Handle the books relationship data
        let bookData = { title: 'Unknown', author: 'Unknown', cover_url: undefined };
        if (review.books) {
          if (Array.isArray(review.books) && review.books.length > 0) {
            bookData = { 
              title: review.books[0].title || 'Unknown', 
              author: review.books[0].author || 'Unknown',
              cover_url: review.books[0].cover_url
            };
          } else if (typeof review.books === 'object' && review.books !== null) {
            bookData = { 
              title: (review.books as any).title || 'Unknown', 
              author: (review.books as any).author || 'Unknown',
              cover_url: (review.books as any).cover_url
            };
          }
        }
        
        return {
          id: review.id,
          rating: review.rating,
          review: review.review,
          created_at: review.created_at,
          book_id: review.book_id,
          books: bookData
        };
      });
      
      setReviews(processedReviews);
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
      <div className="p-8">Sign in to view your finished books and reviews.</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-10">
        
        <section>
          <h1 className="text-2xl font-bold mb-6">Your Finished Books & Reviews</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Finished Books */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Finished Books ({finished.length})</h2>
              {finished.length === 0 ? (
                <div className="bg-card p-6 rounded-lg border text-center">
                  <p className="text-muted-foreground">No finished books yet.</p>
                  <a href="/" className="text-primary underline mt-2 inline-block">Start reading a book</a>
                </div>
              ) : (
                <div className="space-y-4">
                  {finished.map((b) => (
                    <div key={b.id} className="bg-card p-4 rounded-lg border">
                      <div className="flex gap-4 mb-3">
                        {/* Book Cover */}
                        <div className="relative flex-shrink-0">
                          {b.cover_url ? (
                            <img 
                              src={b.cover_url} 
                              alt={b.title}
                              className="w-16 h-24 object-cover rounded shadow-sm"
                            />
                          ) : (
                            <div className="w-16 h-24 bg-muted rounded flex items-center justify-center shadow-sm">
                              <BookOpen className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          {/* Edition selector overlay */}
                          <div className="absolute -top-2 -right-2">
                            <BookEditionSelector
                              bookId={b.id}
                              bookTitle={b.title}
                              bookAuthor={b.author}
                              currentCoverUrl={b.cover_url}
                              onCoverUpdate={(newCoverUrl) => {
                                setFinished(prev => 
                                  prev.map(book => 
                                    book.id === b.id 
                                      ? { ...book, cover_url: newCoverUrl }
                                      : book
                                  )
                                );
                              }}
                            />
                          </div>
                        </div>

                        {/* Book Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{b.title}</div>
                          <div className="text-sm text-muted-foreground">by {b.author}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {b.total_pages} pages • Completed {new Date(b.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      {/* Check if this book has a review */}
                      {(() => {
                        const bookReview = reviews.find(r => r.books?.title === b.title && r.books?.author === b.author);
                        return bookReview ? (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">Your Review:</span>
                              <span className="text-sm">⭐ {bookReview.rating}/5</span>
                            </div>
                            {bookReview.review && (
                              <p className="text-sm text-muted-foreground italic">"{bookReview.review}"</p>
                            )}
                          </div>
                        ) : (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm text-muted-foreground italic">No review yet</p>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Your Reviews */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Your Reviews ({reviews.length})</h2>
              {reviews.length === 0 ? (
                <div className="bg-card p-6 rounded-lg border text-center">
                  <p className="text-muted-foreground">You haven't left any reviews yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">Complete a book to add your first review!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="bg-card p-4 rounded-lg border">
                      <div className="flex gap-4 mb-3">
                        {/* Book Cover */}
                        <div className="relative flex-shrink-0">
                          {r.books?.cover_url ? (
                            <img 
                              src={r.books.cover_url} 
                              alt={r.books.title}
                              className="w-16 h-24 object-cover rounded shadow-sm"
                            />
                          ) : (
                            <div className="w-16 h-24 bg-muted rounded flex items-center justify-center shadow-sm">
                              <BookOpen className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          {/* Edition selector overlay */}
                          {r.book_id && (
                            <div className="absolute -top-2 -right-2">
                              <BookEditionSelector
                                bookId={r.book_id}
                                bookTitle={r.books?.title ?? "Untitled"}
                                bookAuthor={r.books?.author ?? "Unknown author"}
                                currentCoverUrl={r.books?.cover_url}
                                onCoverUpdate={(newCoverUrl) => {
                                  setReviews(prev => 
                                    prev.map(review => 
                                      review.id === r.id 
                                        ? { ...review, books: review.books ? { ...review.books, cover_url: newCoverUrl } : null }
                                        : review
                                    )
                                  );
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Book Info and Review */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{r.books?.title ?? "Untitled"}</div>
                          <div className="text-sm text-muted-foreground">by {r.books?.author ?? "Unknown author"}</div>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-sm font-medium">Rating:</span>
                            <span>⭐ {r.rating}/5</span>
                          </div>
                          {r.review && (
                            <div className="mt-2">
                              <span className="text-sm font-medium">Review:</span>
                              <p className="text-sm mt-1 italic">"{r.review}"</p>
                            </div>
                          )}
                          <div className="mt-2 text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}