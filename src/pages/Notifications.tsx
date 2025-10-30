import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Bell, UserPlus, Heart, MessageSquare, BookOpen, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { searchGoogleBooks, GoogleBookResult } from "@/lib/googleBooks";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { usePlatform } from "@/hooks/usePlatform";

type Notification = {
  id: string;
  type: "follower" | "like" | "comment" | "recommendation";
  created_at: string;
  data: any;
};

export default function Notifications() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [recommendations, setRecommendations] = useState<GoogleBookResult[]>([]);
  const { isIOS, isReadReceiptApp } = usePlatform();

  const loadNotifications = async () => {
    if (!userId) return;
    setLoading(true);

    try {
      // Load new followers
      const { data: followers } = await supabase
        .from("follows")
        .select("follower_id, created_at, profiles:follower_id(display_name, username, avatar_url)")
        .eq("following_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      const followerNotifs: Notification[] = (followers || []).map((f: any) => ({
        id: `follower-${f.follower_id}`,
        type: "follower" as const,
        created_at: f.created_at,
        data: {
          profile: f.profiles,
        },
      }));

      // Load likes on user's posts
      const { data: userPosts } = await supabase
        .from("posts")
        .select("id")
        .eq("user_id", userId);

      const postIds = (userPosts || []).map((p) => p.id);

      const { data: likes } = await supabase
        .from("likes")
        .select("user_id, created_at, target_id, profiles:user_id(display_name, username, avatar_url)")
        .eq("target_type", "post")
        .in("target_id", postIds)
        .order("created_at", { ascending: false })
        .limit(10);

      const likeNotifs: Notification[] = (likes || []).map((l: any) => ({
        id: `like-${l.target_id}-${l.user_id}`,
        type: "like" as const,
        created_at: l.created_at,
        data: {
          profile: l.profiles,
          postId: l.target_id,
        },
      }));

      // Load comments on user's posts
      const { data: comments } = await supabase
        .from("comments")
        .select("user_id, created_at, target_id, content, profiles:user_id(display_name, username, avatar_url)")
        .eq("target_type", "post")
        .in("target_id", postIds)
        .order("created_at", { ascending: false })
        .limit(10);

      const commentNotifs: Notification[] = (comments || []).map((c: any) => ({
        id: `comment-${c.target_id}-${c.user_id}`,
        type: "comment" as const,
        created_at: c.created_at,
        data: {
          profile: c.profiles,
          postId: c.target_id,
          content: c.content,
        },
      }));

      // Merge and sort
      const allNotifs = [...followerNotifs, ...likeNotifs, ...commentNotifs].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setNotifications(allNotifs);

      // Generate book recommendations
      await generateRecommendations(userId);
    } catch (error) {
      console.error("Error loading notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = async (uid: string) => {
    try {
      // Get finished books and in-progress books >= 50%
      const { data: books } = await supabase
        .from("books")
        .select("id, title, author, total_pages, current_page, status")
        .eq("user_id", uid);

      if (!books || books.length === 0) return;

      const eligibleBooks = books.filter(
        (b) =>
          b.status === "completed" ||
          (b.status === "in_progress" && b.current_page >= b.total_pages * 0.5)
      );

      if (eligibleBooks.length === 0) return;

      // Pick a random book to base recommendations on
      const randomBook = eligibleBooks[Math.floor(Math.random() * eligibleBooks.length)];
      
      // Search Google Books for similar titles by same author
      const results = await searchGoogleBooks(`${randomBook.author} books`);
      
      // Filter out the book we already have
      const filtered = results.filter((r) => r.title !== randomBook.title).slice(0, 3);
      
      setRecommendations(filtered);
    } catch (error) {
      console.error("Error generating recommendations:", error);
    }
  };

  const { scrollableRef, pullDistance, isRefreshing, showPullIndicator } = usePullToRefresh({
    onRefresh: async () => {
      toast.success("Refreshed!");
      await loadNotifications();
    },
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setUserId(sess?.user?.id ?? null);
    });

    return () => {
      try {
        sub?.subscription?.unsubscribe();
      } catch {}
    };
  }, []);

  useEffect(() => {
    if (userId) {
      loadNotifications();
    }
  }, [userId]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "follower":
        return <UserPlus className="w-5 h-5 text-primary" />;
      case "like":
        return <Heart className="w-5 h-5 text-red-500" />;
      case "comment":
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case "recommendation":
        return <BookOpen className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getNotificationText = (notif: Notification) => {
    switch (notif.type) {
      case "follower":
        return `${notif.data.profile?.display_name || "Someone"} started following you`;
      case "like":
        return `${notif.data.profile?.display_name || "Someone"} liked your post`;
      case "comment":
        return `${notif.data.profile?.display_name || "Someone"} commented: "${notif.data.content?.slice(0, 50)}${notif.data.content?.length > 50 ? "..." : ""}"`;
      default:
        return "New notification";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navigation />
      
      <div
        ref={scrollableRef}
        className="relative overflow-y-auto"
        style={{ 
          height: (isIOS || isReadReceiptApp) ? 'calc(100dvh - 64px)' : 'auto',
          paddingBottom: (isIOS || isReadReceiptApp) ? 'calc(4rem + env(safe-area-inset-bottom, 0px))' : undefined,
        }}
      >
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

      <div 
        className="container mx-auto px-4 py-6 max-w-2xl"
        style={{ paddingTop: showPullIndicator ? `${pullDistance + 24}px` : undefined }}
      >
        <h1 className="text-3xl font-bold mb-6">Notifications</h1>

        {/* Recent Activity */}
        <div className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          {notifications.length === 0 ? (
            <p className="text-muted-foreground text-sm">No recent activity</p>
          ) : (
            notifications.map((notif) => (
              <Card key={notif.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notif.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{getNotificationText(notif)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notif.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {notif.data.profile?.avatar_url && (
                    <img
                      src={notif.data.profile.avatar_url}
                      alt="Avatar"
                      className="w-10 h-10 rounded-full flex-shrink-0"
                    />
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Book Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Recommended for You</h2>
            <p className="text-sm text-muted-foreground">
              Based on your reading history
            </p>
            <div className="grid gap-3">
              {recommendations.map((book) => (
                <Card key={book.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex gap-3">
                    {book.imageLinks?.thumbnail && (
                      <img
                        src={book.imageLinks.thumbnail}
                        alt={book.title}
                        className="w-16 h-24 object-cover rounded flex-shrink-0"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{book.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {book.authors?.join(", ")}
                      </p>
                      {book.pageCount && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {book.pageCount} pages
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
