import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { searchGoogleBooks } from "@/lib/googleBooks";

// Lightweight notifications popover powered by client-only queries.
// Unread count is computed relative to localStorage timestamp.

export default function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [followers, setFollowers] = useState<any[]>([]);
  const [likes, setLikes] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [recs, setRecs] = useState<any[]>([]);
  const [dismissedRecKeys, setDismissedRecKeys] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('dismissedRecs') || '[]'); } catch { return []; }
  });
  const dismissedSet = useMemo(() => new Set(dismissedRecKeys), [dismissedRecKeys]);
  const saveDismissed = (keys: string[]) => {
    setDismissedRecKeys(keys);
    localStorage.setItem('dismissedRecs', JSON.stringify(keys));
  };

  const lastSeen = useMemo(() => {
    const ts = localStorage.getItem("notificationsLastSeen");
    return ts ? new Date(ts) : null;
  }, []);

  const unreadCount = useMemo(() => {
    const isUnread = (d?: string) => (lastSeen ? (d ? new Date(d) > lastSeen : false) : false);
    return (
      followers.filter((f) => isUnread(f.created_at)).length +
      likes.filter((l) => isUnread(l.created_at)).length +
      comments.filter((c) => isUnread(c.created_at)).length +
      recs.filter((r) => isUnread(r.created_at)).length
    );
  }, [followers, likes, comments, recs, lastSeen]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const u = sess.session?.user;
      if (!u) return;
      if (!mounted) return;
      setUserId(u.id);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        // Followers (new people following me)
        const { data: fData } = await supabase
          .from("follows")
          .select("follower_id, created_at, profiles: follower_id (display_name, username, avatar_url)")
          .eq("following_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);
        if (!cancelled) setFollowers(fData || []);

        // Fetch my posts
        const { data: myPosts } = await supabase
          .from("posts")
          .select("id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);
        const postIds = (myPosts || []).map((p: any) => p.id);

        // Likes on my posts
        let likeRows: any[] = [];
        if (postIds.length) {
          const { data: lData } = await supabase
            .from("likes")
            .select("user_id, target_id, created_at, profiles: user_id (display_name, username, avatar_url)")
            .eq("target_type", "post")
            .in("target_id", postIds)
            .order("created_at", { ascending: false })
            .limit(10);
          likeRows = lData || [];
        }
        if (!cancelled) setLikes(likeRows);

        // Comments on my posts
        let commentRows: any[] = [];
        if (postIds.length) {
          const { data: cData } = await supabase
            .from("comments")
            .select("user_id, target_id, content, created_at, profiles: user_id (display_name, username, avatar_url)")
            .eq("target_type", "post")
            .in("target_id", postIds)
            .order("created_at", { ascending: false })
            .limit(10);
          commentRows = cData || [];
        }
        if (!cancelled) setComments(commentRows);

        // Simple Google Books recs based on finished or >=50% in-progress
        const { data: myBooks } = await supabase
          .from("books")
          .select("title, author, current_page, total_pages, status, finished_at, updated_at")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(30);

        const candidates = (myBooks || []).filter((b: any) => {
          const half = (b.total_pages || 0) > 0 ? (b.current_page || 0) / b.total_pages >= 0.5 : false;
          const completed = b.status === "completed";
          return completed || half;
        });
        const queries = candidates.slice(0, 3).map((b: any) => `${b.title || ""} ${b.author || ""}`.trim());

        const seen = new Set<string>();
        const recsAccum: any[] = [];
        for (const q of queries) {
          if (!q) continue;
          const items = await searchGoogleBooks(q);
          for (const it of items.slice(0, 3)) {
            const key = `${it.title}-${(it.authors || [])[0] || ""}`;
            if (seen.has(key) || dismissedSet.has(key)) continue;
            seen.add(key);
            recsAccum.push({
              title: it.title,
              author: (it.authors || [])[0] || undefined,
              thumbnail: it.imageLinks?.thumbnail,
              created_at: new Date().toISOString(),
              key,
            });
          }
        }
        if (!cancelled) setRecs(recsAccum.slice(0, 6));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, dismissedRecKeys]);

  const markSeen = () => {
    localStorage.setItem("notificationsLastSeen", new Date().toISOString());
  };

  const clearAll = () => {
    setFollowers([]);
    setLikes([]);
    setComments([]);
    localStorage.setItem("notificationsLastSeen", new Date().toISOString());
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) markSeen(); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Notifications" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 h-4 min-w-4">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Notifications</h4>
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-[10px]">{unreadCount} new</Badge>
              <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs">Clear</Button>
            </div>
          </div>
        </div>
        <div className="max-h-96 overflow-auto divide-y">
          <Section title="New followers" loading={loading} empty="No new followers">
            {followers.map((f, i) => (
              <Row key={i} title={`${f.profiles?.display_name || f.profiles?.username || "Someone"} followed you`} time={f.created_at} />
            ))}
          </Section>
          <Section title="Likes" loading={loading} empty="No new likes">
            {likes.map((l, i) => (
              <Row key={i} title={`${l.profiles?.display_name || l.profiles?.username || "Someone"} liked your post`} time={l.created_at} />
            ))}
          </Section>
          <Section title="Comments" loading={loading} empty="No new comments">
            {comments.map((c, i) => (
              <Row key={i} title={`${c.profiles?.display_name || c.profiles?.username || "Someone"} commented: ${c.content || ""}`} time={c.created_at} />
            ))}
          </Section>
          <Section title="Recommendations" loading={loading} empty="No recommendations yet">
            {recs.map((r, i) => (
              <div key={i} className="flex items-start justify-between gap-2">
                <Row title={`${r.title}${r.author ? ` — ${r.author}` : ""}`} time={r.created_at} />
                <Button variant="ghost" size="sm" onClick={() => saveDismissed([...dismissedRecKeys, r.key])} className="text-xs">×</Button>
              </div>
            ))}
          </Section>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Section({ title, loading, empty, children }: { title: string; loading: boolean; empty: string; children: React.ReactNode; }) {
  return (
    <div>
      <div className="px-3 py-2 text-xs font-medium text-muted-foreground">{title}</div>
      <div className="px-3 pb-2 space-y-2">
        {loading ? <div className="text-xs text-muted-foreground">Loading…</div> : (Array.isArray(children) && children.length === 0) ? (
          <div className="text-xs text-muted-foreground">{empty}</div>
        ) : children}
      </div>
    </div>
  );
}

function Row({ title, time }: { title: string; time?: string; }) {
  const t = time ? new Date(time).toLocaleString() : "";
  return (
    <div className="text-sm">
      <div className="text-foreground">{title}</div>
      <div className="text-xs text-muted-foreground">{t}</div>
    </div>
  );
}
