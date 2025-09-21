import { useEffect, useState } from "react";
import { hasSupabase, supabase } from "@/lib/supabase";

type FinishedBook = {
  id: string;
  title: string;
  author: string;
  total_pages: number;
  current_page: number;
  created_at: string;
};

type MyReview = {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  books: { title: string | null; author: string | null } | null;
};

export default function Reviews() {
  const [userId, setUserId] = useState<string | null>(null);
  const [finished, setFinished] = useState<FinishedBook[]>([]);
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabase || !supabase) return;
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    (async () => {
      if (!hasSupabase || !supabase || !userId) {
        setLoading(false);
        return;
      }
      setLoading(true);

      // Finished books (current_page === total_pages)
      const { data: finishedBooks } = await supabase
        .from("books")
        .select("id,title,author,total_pages,current_page,created_at")
        .eq("user_id", userId)
        .filter("current_page", "eq", "total_pages" as any) // fallback if needed
        .or(`current_page.eq.total_pages`) // some PostgREST versions
        .order("created_at", { ascending: false });

      // Your reviews (joined with books for title/author)
      const { data: myReviews } = await supabase
        .from("reviews")
        .select("id,rating,review,created_at,books:book_id(title,author)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      setFinished((finishedBooks ?? []) as FinishedBook[]);
      setReviews((myReviews ?? []) as MyReview[]);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!userId) return <div className="p-8">Sign in to view your finished books and reviews.</div>;

  return (
    <div className="container mx-auto px-4 py-8 grid gap-10">
      <section>
        <h1 className="text-2xl font-bold mb-4">Finished Books</h1>
        {finished.length === 0 ? (
          <p className="text-muted-foreground">No finished books yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {finished.map((b) => (
              <div key={b.id} className="bg-card p-4 rounded border">
                <div className="font-semibold">{b.title}</div>
                <div className="text-sm text-muted-foreground">{b.author}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Completed • {new Date(b.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">My Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-muted-foreground">You haven’t left any reviews yet.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="bg-card p-4 rounded border">
                <div className="font-semibold">{r.books?.title ?? "Untitled"}</div>
                <div className="text-sm text-muted-foreground">{r.books?.author ?? "Unknown author"}</div>
                <div className="mt-2">⭐ {r.rating}/5</div>
                {r.review && <p className="mt-2">{r.review}</p>}
                <div className="mt-1 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
