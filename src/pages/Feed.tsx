import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { BookOpen, RefreshCw } from "lucide-react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useToast } from "@/hooks/use-toast";
import { usePlatform } from "@/hooks/usePlatform";

type Post = {
  kind: "post";
  id: string;
  created_at: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  content: string;
  book_id?: string | null;
  book_title?: string | null;
  book_author?: string | null;
  book_cover_url?: string | null;
};

type ProgressItem = {
  kind: "progress";
  id: string;
  created_at: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  book_title: string | null;
  book_author: string | null;
  book_cover_url?: string | null;
  from_page: number | null;
  to_page: number;
};

type ReviewItem = {
  kind: "review";
  id: string;
  created_at: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  book_title: string | null;
  book_author: string | null;
  book_cover_url?: string | null;
  rating: number;
  review: string | null;
};

type FeedItem = Post | ProgressItem | ReviewItem;

export default function Feed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isIOS, isReadReceiptApp } = usePlatform();

  const loadFeed = async () => {
      

      // who am I
      const { data: me, error: userError } = await supabase.auth.getUser();
      const myId = me?.user?.id;
      console.log("Feed user check:", { myId, userError });
      if (!myId) { setItems([]); setLoading(false); return; }

      // ids I follow
      const { data: followRows, error: followError } = await supabase
        .from("follows").select("following_id").eq("follower_id", myId);
      const followingIds = (followRows ?? []).map(r => r.following_id);
      console.log("Following check:", { followingIds, followError });

      // Always include my own id so I see my activity too
      const targetIds = [myId, ...followingIds.filter((id: string) => id !== myId)];

      // PROGRESS events - simplified without profile joins
      const { data: progress, error: progressError } = await supabase
        .from("reading_progress")
        .select(`
          id, created_at, user_id, from_page, to_page, book_id,
          books!reading_progress_book_id_fkey ( title, author, cover_url )
        `)
        .in("user_id", targetIds)
        .order("created_at", { ascending: false })
        .limit(100);

      console.log("Progress query:", { progress, progressError, targetIds });

      // Get profile information separately
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", targetIds);

      const profileMap = new Map(profiles?.map(p => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }]) || []);

      // POSTS
      const { data: posts, error: postsError } = await supabase
        .from("posts")
        .select(`
          id, created_at, user_id, content, book_id
        `)
        .in("user_id", targetIds)
        .order("created_at", { ascending: false })
        .limit(100);
      
      // Fetch book details separately for posts that have book_id
      const postBookIds = (posts ?? []).filter((p: any) => p.book_id).map((p: any) => p.book_id);
      const { data: postBooks } = postBookIds.length > 0 
        ? await supabase.from("books").select("id, title, author, cover_url").in("id", postBookIds)
        : { data: [] };
      
      const postBookMap = new Map<string, any>();
      (postBooks || []).forEach((b: any) => {
        postBookMap.set(b.id, b);
      });

      console.log("Posts query:", { posts, postsError });

      const postItems: Post[] = (posts ?? []).map((r: any) => {
        const book: any = r.book_id ? postBookMap.get(r.book_id) : null;
        return {
          kind: "post",
          id: r.id,
          created_at: r.created_at,
          user_id: r.user_id,
          display_name: profileMap.get(r.user_id)?.display_name ?? null,
          avatar_url: profileMap.get(r.user_id)?.avatar_url ?? null,
          content: r.content,
          book_id: r.book_id,
          book_title: book?.title ?? null,
          book_author: book?.author ?? null,
          book_cover_url: book?.cover_url ?? null,
        };
      });

      const pItems: ProgressItem[] = (progress ?? []).map((r: any) => ({
        kind: "progress",
        id: r.id,
        created_at: r.created_at,
        user_id: r.user_id,
        display_name: profileMap.get(r.user_id)?.display_name ?? null,
        avatar_url: profileMap.get(r.user_id)?.avatar_url ?? null,
        book_title: r.books?.title ?? null,
        book_author: r.books?.author ?? null,
        book_cover_url: r.books?.cover_url ?? null,
        from_page: r.from_page ?? null,
        to_page: r.to_page,
      }));

      // REVIEWS - simplified without profile joins
      const { data: reviews, error: reviewsError } = await supabase
        .from("reviews")
        .select(`
          id, created_at, user_id, rating, review, book_id,
          books!reviews_book_id_fkey ( title, author, cover_url )
        `)
        .in("user_id", targetIds)
        .order("created_at", { ascending: false })
        .limit(100);

      console.log("Reviews query:", { reviews, reviewsError });

      const rItems: ReviewItem[] = (reviews ?? []).map((r: any) => ({
        kind: "review",
        id: r.id,
        created_at: r.created_at,
        user_id: r.user_id,
        display_name: profileMap.get(r.user_id)?.display_name ?? null,
        avatar_url: profileMap.get(r.user_id)?.avatar_url ?? null,
        book_title: r.books?.title ?? null,
        book_author: r.books?.author ?? null,
        book_cover_url: r.books?.cover_url ?? null,
        rating: r.rating,
        review: r.review,
      }));

      // merge + sort newest-first
      const merged = [...postItems, ...pItems, ...rItems].sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
      );

      console.log("Final merged feed items:", merged);

      setItems(merged);
      setLoading(false);
  };

  const { scrollableRef, pullDistance, isRefreshing, showPullIndicator } = usePullToRefresh({
    onRefresh: async () => {
      // Show success immediately
      toast({
        title: "Refreshed!",
        description: "Updating your feed...",
      });
      // Load in background
      loadFeed();
    },
  });

  useEffect(() => {
    loadFeed();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gradient-soft">
      <Navigation />
      <div className="p-6 text-muted-foreground">Loading…</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Navigation />
      <div 
        ref={scrollableRef}
        className="relative overflow-y-auto"
        style={{ height: (isIOS || isReadReceiptApp) ? 'calc(100dvh - 64px)' : 'calc(100dvh - 64px)' }}
      >
        {/* Pull-to-refresh indicator */}
        {showPullIndicator && (
          <div 
            className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 z-10"
            style={{ 
              height: `${pullDistance}px`,
              opacity: Math.min(pullDistance / 80, 1),
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <RefreshCw 
                className={`w-6 h-6 text-primary ${isRefreshing ? 'animate-spin' : ''}`}
                style={{
                  transform: `rotate(${pullDistance * 3}deg)`,
                }}
              />
              <span className="text-xs text-muted-foreground">
                {isRefreshing ? 'Refreshing...' : pullDistance >= 80 ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </div>
          </div>
        )}

      <div className="container mx-auto px-4 py-6 space-y-3"
        style={{ paddingTop: showPullIndicator ? `${pullDistance + 24}px` : undefined }}
      >
      <h1 className="text-2xl font-bold mb-2">Your Feed</h1>
      {items.length === 0 && (
        <div className="text-muted-foreground">
          No activity yet. Follow readers in the <a href="/people" className="underline">People</a> tab.
        </div>
      )}

      {items.map((it) =>
        it.kind === "post" ? (
          <div key={`post-${it.id}`} className="bg-card p-4 rounded border">
            <div className="flex items-start gap-3 mb-3">
              <img
                src={it.avatar_url || "/assets/default-avatar.png"}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{it.display_name || "Reader"}</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(it.created_at).toLocaleString()}
                </div>
              </div>
            </div>
            
            {/* Post Content */}
            <div className="mb-2">
              {it.book_title && (
                <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  About: <em>{it.book_title}</em> {it.book_author && `by ${it.book_author}`}
                </div>
              )}
              <p className="whitespace-pre-wrap">{it.content}</p>
            </div>
          </div>
        ) : it.kind === "progress" ? (
          <div key={`p-${it.id}`} className="bg-card p-4 rounded border">
            <div className="flex items-start gap-3 mb-3">
              <img
                src={it.avatar_url || "/assets/default-avatar.png"}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{it.display_name || "Reader"}</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(it.created_at).toLocaleString()}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              {/* Book Cover */}
              {it.book_cover_url ? (
                <img 
                  src={it.book_cover_url} 
                  alt={it.book_title || "Book cover"}
                  className="w-12 h-16 object-contain rounded shadow-sm flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-16 bg-muted rounded flex items-center justify-center shadow-sm flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              
              {/* Progress Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium mb-1">Reading Progress</div>
                <div>
                  Read to page {it.to_page}
                  {typeof it.from_page === "number" && it.from_page >= 0 ? ` (from ${it.from_page})` : ""} of{" "}
                  <em className="truncate">{it.book_title ?? "Untitled"}</em>
                  {it.book_author ? ` by ${it.book_author}` : ""}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div key={`r-${it.id}`} className="bg-card p-4 rounded border">
            <div className="flex items-start gap-3 mb-3">
              <img
                src={it.avatar_url || "/assets/default-avatar.png"}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{it.display_name || "Reader"}</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(it.created_at).toLocaleString()}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              {/* Book Cover */}
              {it.book_cover_url ? (
                <img 
                  src={it.book_cover_url} 
                  alt={it.book_title || "Book cover"}
                  className="w-12 h-16 object-contain rounded shadow-sm flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-16 bg-muted rounded flex items-center justify-center shadow-sm flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              
              {/* Review Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium mb-1">
                  Reviewed <em className="truncate">{it.book_title ?? "Untitled"}</em>
                  {it.book_author ? ` by ${it.book_author}` : ""}: ⭐ {it.rating}/5
                </div>
                {it.review && <p className="text-sm text-muted-foreground">{it.review}</p>}
              </div>
            </div>
          </div>
        )
      )}
      </div>
      </div>
    </div>
  );
}
