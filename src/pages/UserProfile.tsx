import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { FollowButton } from "@/components/FollowButton";
import { ArrowLeft, BookOpen } from "lucide-react";

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

type ActivityItem = ProgressItem | ReviewItem;

interface UserProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [canSeeProgress, setCanSeeProgress] = useState<boolean>(true);

  useEffect(() => {
    if (!userId) return;

    (async () => {
      try {
        // Get current user ID
        const { data: me } = await supabase.auth.getUser();
        setMyId(me?.user?.id || null);

        // Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url, bio, created_at")
          .eq("id", userId)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // Determine if viewer can see progress (own or following)
        let canSee = true;
        if (me?.user?.id && me.user.id !== userId) {
          const { data: followRow } = await supabase
            .from("follows")
            .select("follower_id")
            .eq("follower_id", me.user.id)
            .eq("following_id", userId)
            .maybeSingle();
          canSee = !!followRow;
        }
        setCanSeeProgress(canSee);

        // Get user's reading progress (respect RLS/visibility)
        let progress: any[] | null = [];
        if (canSee) {
          const { data, error: progressError } = await supabase
            .from("reading_progress")
            .select(`
              id, created_at, user_id, from_page, to_page, book_id,
              books:book_id ( title, author )
            `)
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(50);
          progress = data ?? [];
          if (progressError) {
            console.warn("UserProfile progress error", progressError);
            progress = [];
          }
        }

        // Get user's reviews (public)
        const { data: reviews, error: reviewsError } = await supabase
          .from("reviews")
          .select(`
            id, created_at, user_id, rating, review, book_id,
            books:book_id ( title, author )
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (reviewsError) {
          console.warn("UserProfile reviews error", reviewsError);
        }

        // Transform progress items
        const pItems: ProgressItem[] = (progress ?? []).map((r: any) => ({
          kind: "progress",
          id: r.id,
          created_at: r.created_at,
          user_id: r.user_id,
          display_name: profileData?.display_name ?? null,
          book_title: r.books?.title ?? null,
          book_author: r.books?.author ?? null,
          from_page: r.from_page ?? null,
          to_page: r.to_page,
        }));

        // Transform review items
        const rItems: ReviewItem[] = (reviews ?? []).map((r: any) => ({
          kind: "review",
          id: r.id,
          created_at: r.created_at,
          user_id: r.user_id,
          display_name: profileData?.display_name ?? null,
          book_title: r.books?.title ?? null,
          book_author: r.books?.author ?? null,
          rating: r.rating,
          review: r.review,
        }));

        // Merge and sort activity
        const merged = [...pItems, ...rItems].sort(
          (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
        );

        setActivity(merged);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-soft">
        <Navigation />
        <div className="container mx-auto px-4 py-6">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-soft">
        <Navigation />
        <div className="container mx-auto px-4 py-6">
          <div className="text-muted-foreground">User not found.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Navigation />
      <div className="container mx-auto px-4 py-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4 mb-6">
          <Link 
            to="/people" 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to People
          </Link>
        </div>

        {/* User Profile Card */}
        <div className="bg-card p-6 rounded-lg border shadow-soft mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src={profile.avatar_url || "/assets/readreceipt-logo.png"}
                alt="Profile"
                className="w-16 h-16 rounded-full object-cover"
              />
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {profile.display_name || "Reader"}
                </h1>
                <p className="text-muted-foreground">
                  @{profile.username || profile.id.slice(0, 8)}
                </p>
                {profile.bio && (
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    {profile.bio}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Member since {new Date(profile.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            {myId && myId !== profile.id && (
              <FollowButton targetUserId={profile.id} />
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Reading Activity
          </h2>

          {!canSeeProgress && myId !== profile.id && (
            <div className="bg-card/50 border rounded p-3 text-sm text-muted-foreground">
              Follow this user to see their reading progress. Reviews are always public.
            </div>
          )}

          {activity.length === 0 ? (
            <div className="bg-card p-6 rounded-lg border text-center">
              <p className="text-muted-foreground">No reading activity yet.</p>
            </div>
          ) : (
            activity.map((item) =>
              item.kind === "progress" ? (
                <div key={`p-${item.id}`} className="bg-card p-4 rounded border">
                  <div className="text-sm text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                  <div className="font-medium">
                    Read to page {item.to_page}
                    {typeof item.from_page === "number" && item.from_page >= 0 
                      ? ` (from ${item.from_page})` 
                      : ""} of{" "}
                    <em>{item.book_title ?? "Untitled"}</em>
                    {item.book_author ? ` by ${item.book_author}` : ""}
                  </div>
                </div>
              ) : (
                <div key={`r-${item.id}`} className="bg-card p-4 rounded border">
                  <div className="text-sm text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                  <div className="font-medium">
                    Reviewed <em>{item.book_title ?? "Untitled"}</em>
                    {item.book_author ? ` by ${item.book_author}` : ""}: ⭐ {item.rating}/5
                  </div>
                  {item.review && <p className="mt-2">{item.review}</p>}
                </div>
              )
            )
          )}
        </div>
      </div>
    </div>
  );
}