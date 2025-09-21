import { useEffect, useState } from "react";
import { hasSupabase, supabase } from "@/lib/supabase";

type FeedItem = {
  id: string; created_at: string; to_page: number; from_page: number;
  book_id: string; user_id: string; title: string; author: string; display_name: string | null;
};

export default function Feed() {
  const [items, setItems] = useState<FeedItem[]>([]);

  useEffect(() => {
    (async () => {
      if (!hasSupabase || !supabase) return;
      const { data: me } = await supabase.auth.getUser();
      if (!me?.user) return;

      const { data: followRows } = await supabase
        .from("follows").select("following_id").eq("follower_id", me.user.id);

      const ids = (followRows ?? []).map(r => r.following_id);
      if (!ids.length) { setItems([]); return; }

      const { data } = await supabase
        .from("reading_progress")
        .select(`
          id, created_at, to_page, from_page, book_id, user_id,
          books:book_id ( title, author ),
          profiles:user_id ( display_name )
        `)
        .in("user_id", ids)
        .order("created_at", { ascending: false })
        .limit(50);

      setItems((data ?? []).map((r: any) => ({
        id: r.id, created_at: r.created_at, to_page: r.to_page, from_page: r.from_page,
        book_id: r.book_id, user_id: r.user_id,
        title: r.books?.title, author: r.books?.author,
        display_name: r.profiles?.display_name
      })));
    })();
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 space-y-3">
      {items.map(it => (
        <div key={it.id} className="bg-card p-4 rounded border">
          <div className="text-sm text-muted-foreground">
            {new Date(it.created_at).toLocaleString()}
          </div>
          <div className="font-medium">
            {it.display_name || "Reader"} read to page {it.to_page} of <em>{it.title}</em> by {it.author}
          </div>
        </div>
      ))}
      {items.length === 0 && <div className="text-muted-foreground">No activity yet. Follow some readers!</div>}
    </div>
  );
}
