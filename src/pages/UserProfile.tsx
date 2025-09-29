import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { FollowButton } from "@/components/FollowButton";
import { UserColorProvider } from "@/components/UserColorProvider";
import { ArrowLeft, BookOpen, Star, Calendar, Globe, Facebook, Twitter, Instagram, Linkedin, Youtube, ExternalLink } from "lucide-react";
import { ReadingGoals } from "@/components/ReadingGoals";

type ProgressItem = {
  kind: "progress";
  id: string;
  created_at: string;
  user_id: string;
  display_name: string | null;
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
  book_title: string | null;
  book_author: string | null;
  book_cover_url?: string | null;
  rating: number;
  review: string | null;
};

type ActivityItem = ProgressItem | ReviewItem;

interface TBRBook {
  id: string;
  title: string;
  author: string;
  total_pages: number | null;
  notes: string | null;
  priority: number;
  created_at: string;
  cover_url?: string;
}

interface UserProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  birthday?: string | null;
  favorite_book_id?: string | null;
  social_media_links?: any;
  website_url?: string | null;
  color_palette?: any;
}

interface FavoriteBook {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
}

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [tbrBooks, setTbrBooks] = useState<TBRBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [canSeeProgress, setCanSeeProgress] = useState<boolean>(true);
  const [favoriteBook, setFavoriteBook] = useState<FavoriteBook | null>(null);
  const [zodiacSign, setZodiacSign] = useState<string | null>(null);

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
          .select("*")
          .eq("id", userId)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // Fetch favorite book if exists
        if (profileData.favorite_book_id) {
          const { data: bookData } = await supabase
            .from('books')
            .select('id, title, author, cover_url')
            .eq('id', profileData.favorite_book_id)
            .single();
          
          if (bookData) {
            setFavoriteBook(bookData);
          }
        }

        // Calculate zodiac sign if birthday exists
        if (profileData.birthday) {
          const { data: zodiacData } = await supabase
            .rpc('get_zodiac_sign', { birth_date: profileData.birthday });
          
          if (zodiacData) {
            setZodiacSign(zodiacData);
          }
        }

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
              books!reading_progress_book_id_fkey ( title, author, cover_url )
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
            books!book_id ( title, author, cover_url )
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (reviewsError) {
          console.warn("UserProfile reviews error", reviewsError);
        }

        // Get user's TBR books (public)
        const { data: tbrData, error: tbrError } = await supabase
          .from("tbr_books")
          .select("id, title, author, total_pages, notes, priority, created_at, cover_url")
          .eq("user_id", userId)
          .order("priority", { ascending: false })
          .order("created_at", { ascending: false });

        if (tbrError) {
          console.warn("UserProfile TBR error", tbrError);
        } else {
          setTbrBooks(tbrData || []);
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
          book_cover_url: r.books?.cover_url ?? null,
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
          book_cover_url: r.books?.cover_url ?? null,
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
    <UserColorProvider userColorPalette={profile?.color_palette}>
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

        {/* Reading Goals Section */}
        {myId === profile.id && (
          <div className="mb-6">
            <ReadingGoals userId={profile.id} completedBooksThisYear={0} />
          </div>
        )}

        {/* TBR List Section */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5" />
            To Be Read ({tbrBooks.length})
          </h2>
          
          {tbrBooks.length === 0 ? (
            <div className="bg-card p-6 rounded-lg border text-center">
              <p className="text-muted-foreground">No books in TBR list yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tbrBooks.map((book) => (
                <div key={book.id} className="bg-card border rounded-lg p-4 hover:bg-accent/5 transition-colors">
                  <div className="flex gap-3">
                    {/* Book Cover */}
                    {book.cover_url ? (
                      <img 
                        src={book.cover_url} 
                        alt={book.title}
                        className="w-12 h-16 object-cover rounded shadow-sm flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-16 bg-muted rounded flex items-center justify-center shadow-sm flex-shrink-0">
                        <BookOpen className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Book Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-foreground truncate">{book.title}</h3>
                        {book.priority > 0 && (
                          <div className="flex">
                            {Array(book.priority).fill(0).map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">by {book.author}</p>
                      {book.total_pages && (
                        <p className="text-xs text-muted-foreground mb-2">{book.total_pages} pages</p>
                      )}
                      {book.notes && (
                        <p className="text-xs text-muted-foreground line-clamp-3">{book.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Added {new Date(book.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                  <div className="text-sm text-muted-foreground mb-2">
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                  <div className="flex gap-3">
                    {/* Book Cover */}
                    {item.book_cover_url ? (
                      <img 
                        src={item.book_cover_url} 
                        alt={item.book_title || "Book cover"}
                        className="w-12 h-16 object-cover rounded shadow-sm flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-16 bg-muted rounded flex items-center justify-center shadow-sm flex-shrink-0">
                        <BookOpen className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Progress Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">Reading Progress</div>
                      <div>
                        Read to page {item.to_page}
                        {typeof item.from_page === "number" && item.from_page >= 0 
                          ? ` (from ${item.from_page})` 
                          : ""} of{" "}
                        <em className="truncate">{item.book_title ?? "Untitled"}</em>
                        {item.book_author ? ` by ${item.book_author}` : ""}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={`r-${item.id}`} className="bg-card p-4 rounded border">
                  <div className="text-sm text-muted-foreground mb-2">
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                  <div className="flex gap-3">
                    {/* Book Cover */}
                    {item.book_cover_url ? (
                      <img 
                        src={item.book_cover_url} 
                        alt={item.book_title || "Book cover"}
                        className="w-12 h-16 object-cover rounded shadow-sm flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-16 bg-muted rounded flex items-center justify-center shadow-sm flex-shrink-0">
                        <BookOpen className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Review Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium mb-1">
                        Reviewed <em className="truncate">{item.book_title ?? "Untitled"}</em>
                        {item.book_author ? ` by ${item.book_author}` : ""}: ⭐ {item.rating}/5
                      </div>
                      {item.review && <p className="text-sm text-muted-foreground">{item.review}</p>}
                    </div>
                  </div>
                </div>
              )
            )
          )}
        </div>
        </div>
      </div>
    </UserColorProvider>
  );
}