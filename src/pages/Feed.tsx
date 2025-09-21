import { useEffect, useState } from "react";
import { hasSupabase, supabase } from "@/lib/supabase";

type ProgressItem = {
  kind: "progress";
  id: string;
  created_at: string;
  user_id: string;
  display_name: string | null;
  book_title: string | null;
  book_author: string | null;
  from_page: number | null;
  to_page: number;
};

type ReviewItem = {
  kind: "review";
  id: string;
  created_at: string;
  user_id: string;
  display_name: string | null;
  book_title: string | null;
  book_author: string | null;
  rating: number;
  review: string | null;
};

type FeedItem = ProgressItem | ReviewItem;

export default function Feed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!hasSupabase || !supabase) { setLoading(false); return; }

      // who am I
      const { data: me } = await supabase.auth.getUser();
      const myId = me?.user?.id;
      if (!myId) { setItems([]); setLoading(false); return; }

      // ids I follow
      const { data: followRows } = await supabase
        .from("follows").select("following_id").eq("follower_id", myId);
      const followingIds = (followRows ?? []).map(r => r.following_id);
      if (followingIds.length === 0) { setItems([]); setLoading(false); return; }

      // PROGRESS events
      const { data: progress } = await supabase
        .from("reading_progress")
        .select(`
          id, created_at, user_id, from_page, to_page, book_id,
          books:book_id ( title, author ),
          profiles:user_id ( display_name )
        `)
        .in("user_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(100);

      const pItems: ProgressItem[] = (progress ?? []).map((r: any) => ({
        kind: "progress",
        id: r.id,
        created_at: r.created_at,
        user_id: r.user_id,
        display_name: r.profiles?.display_name ?? null,
        book_title: r.books?.title ?? null,
        book_author: r.books?.author ?? null,
        from_page: r.from_page ?? null,
        to_page: r.to_page,
      }));

      // REVIEWS
      const { data: reviews } = await supabase
        .from("reviews")
        .select(`
          id, created_at, user_id, rating, review, book_id,
          books:book_id ( title, author ),
          profiles:user_id ( display_name )
        `)
        .in("user_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(100);

      const rItems: ReviewItem[] = (reviews ?? []).map((r: any) => ({
        kind: "review",
        id: r.id,
        created_at: r.created_at,
        user_id: r.user_id,
        display_name: r.profiles?.display_name ?? null,
        book_title: r.books?.title ?? null,
        book_author: r.books?.author ?? null,
        rating: r.rating,
        review: r.review,
      }));

      // merge + sort newest-first
      const merged = [...pItems, ...rItems].sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
      );

      setItems(merged);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>;

  return (
    <div className="container mx-auto px-4 py-6 space-y-3">
      <h1 className="text-2xl font-bold mb-2">Your Feed</h1>
      {items.length === 0 && (
        <div className="text-muted-foreground">
          No activity yet. Follow readers in the <a href="/people" className="underline">People</a> tab.
        </div>
      )}

      {items.map((it) =>
        it.kind === "progress" ? (
          <div key={`p-${it.id}`} className="bg-card p-4 rounded border">
            <div className="text-sm text-muted-foreground">
              {new Date(it.created_at).toLocaleString()}
            </div>
            <div className="font-medium">
              {it.display_name || "Reader"} read to page {it.to_page}
              {typeof it.from_page === "number" && it.from_page >= 0 ? ` (from ${it.from_page})` : ""} of{" "}
              <em>{it.book_title ?? "Untitled"}</em>
              {it.book_author ? ` by ${it.book_author}` : ""}
            </div>
          </div>
        ) : (
          <div key={`r-${it.id}`} className="bg-card p-4 rounded border">
            <div className="text-sm text-muted-foreground">
              {new Date(it.created_at).toLocaleString()}
            </div>
            <div className="font-medium">
              {it.display_name || "Reader"} reviewed <em>{it.book_title ?? "Untitled"}</em>
              {it.book_author ? ` by ${it.book_author}` : ""}: ⭐ {it.rating}/5
            </div>
            {it.review && <p className="mt-2">{it.review}</p>}
          </div>
        )
      )}
    </div>
  );
}
