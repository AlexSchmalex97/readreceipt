import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { FollowButton } from "@/components/FollowButton";
import { UserColorProvider } from "@/components/UserColorProvider";
import { ArrowLeft, BookOpen, Star, Calendar, Globe, Facebook, Twitter, Instagram, Linkedin, Youtube, ExternalLink, XCircle } from "lucide-react";
import { HomeReadingGoals } from "@/components/HomeReadingGoals";
import { FollowersDialog } from "@/components/FollowersDialog";

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

interface DNFBook {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  dnf_type: 'soft' | 'hard' | null;
  created_at: string;
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
  const [dnfBooks, setDnfBooks] = useState<DNFBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [canSeeProgress, setCanSeeProgress] = useState<boolean>(true);
  const [favoriteBook, setFavoriteBook] = useState<FavoriteBook | null>(null);
  const [zodiacSign, setZodiacSign] = useState<string | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [currentBook, setCurrentBook] = useState<any | null>(null);
  const [bookStats, setBookStats] = useState({ totalBooks: 0, completedBooks: 0, inProgressBooks: 0 });
  const [completedBooksThisYear, setCompletedBooksThisYear] = useState(0);
  const [inProgressBooks, setInProgressBooks] = useState<any[]>([]);
  const [completedBooks, setCompletedBooks] = useState<any[]>([]);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);

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

        // Load followers and following counts
        const { count: followersCount } = await supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", userId);
        
        const { count: followingCount } = await supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", userId);

        setFollowersCount(followersCount || 0);
        setFollowingCount(followingCount || 0);

        // Fetch current book if exists
        if (profileData.current_book_id) {
          const { data: currentBookData } = await supabase
            .from('books')
            .select('id, title, author, cover_url, current_page, total_pages')
            .eq('id', profileData.current_book_id)
            .single();
          
          if (currentBookData) {
            setCurrentBook(currentBookData);
          }
        } else {
          // Fallback: find most recent in-progress book if current_book_id is null
          const { data: fallbackBooks } = await supabase
            .from('books')
            .select('id, title, author, cover_url, current_page, total_pages')
            .eq('user_id', userId)
            .eq('status', 'in_progress')
            .order('updated_at', { ascending: false })
            .limit(10);
          
          // Filter client-side for books where current_page < total_pages
          const inProgressBook = fallbackBooks?.find(b => b.current_page < b.total_pages);
          if (inProgressBook) {
            setCurrentBook(inProgressBook);
          }
        }

        // Load book statistics
        const { data: allBooks, error: booksError } = await supabase
          .from("books")
          .select("id, title, author, cover_url, current_page, total_pages, status, finished_at, created_at")
          .eq("user_id", userId);

        if (!booksError && allBooks) {
          const currentYear = new Date().getFullYear();
          const completed = allBooks.filter(book => 
            book.status === 'completed' || book.current_page >= book.total_pages
          );
          const completedThisYearBooks = allBooks.filter(book => {
            if (book.status !== 'completed' && book.current_page < book.total_pages) return false;
            if (book.finished_at) {
              return new Date(book.finished_at).getFullYear() === currentYear;
            }
            return false;
          });
          const inProgress = allBooks.filter(book => 
            book.current_page < book.total_pages && 
            book.status !== 'completed' && 
            book.status !== 'dnf'
          );
          
          setBookStats({ 
            totalBooks: allBooks.length, 
            completedBooks: completed.length, 
            inProgressBooks: inProgress.length 
          });
          setCompletedBooksThisYear(completedThisYearBooks.length);
          setInProgressBooks(inProgress);
          setCompletedBooks(completed);
        } else {
          // Set defaults if no books
          setBookStats({ totalBooks: 0, completedBooks: 0, inProgressBooks: 0 });
          setCompletedBooksThisYear(0);
          setInProgressBooks([]);
          setCompletedBooks([]);
        }

        // Load recent reviews (limit to 3 for display)
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select(`
            id, rating, review, created_at,
            books:book_id (title, author, cover_url)
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(3);

        if (reviewsData) {
          setRecentReviews(reviewsData);
        }

        // Get user's DNF books (public)
        const { data: dnfData, error: dnfError } = await supabase
          .from("books")
          .select("id, title, author, cover_url, dnf_type, created_at")
          .eq("user_id", userId)
          .eq("status", "dnf")
          .order("created_at", { ascending: false });

        if (dnfError) {
          console.warn("UserProfile DNF error", dnfError);
        } else {
          setDnfBooks((dnfData || []).map((book: any) => ({
            ...book,
            dnf_type: book.dnf_type as 'soft' | 'hard' | null
          })));
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
        <div className="container mx-auto px-4 py-6 max-w-7xl">
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

          {/* Mobile & Tablet Layout - Centered */}
          <div className="lg:hidden">
            {/* Header - Centered */}
            <div className="flex flex-col items-center text-center mb-4">
              {/* Profile Photo */}
              <div className="w-24 h-24 rounded-full overflow-hidden bg-muted border-2 border-border mb-3">
                <img 
                  src={profile.avatar_url || "/assets/default-avatar.png"} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Profile Info */}
              <h1 className="text-2xl font-bold text-foreground">
                {profile.display_name || "Reader"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                @{profile.username || profile.id.slice(0, 8)}
              </p>
              <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
                {zodiacSign && (
                  <span>
                    <Star className="w-3 h-3 inline mr-1" />
                    {zodiacSign}
                  </span>
                )}
              </div>

              {/* Followers/Following */}
              <div className="flex gap-2 mt-3 justify-center">
                <FollowersDialog userId={profile.id} type="followers" count={followersCount} />
                <FollowersDialog userId={profile.id} type="following" count={followingCount} />
              </div>
              
              {/* Follow Button */}
              {myId && myId !== profile.id && (
                <div className="mt-3">
                  <FollowButton targetUserId={profile.id} />
                </div>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm text-foreground text-center mb-4 max-w-2xl mx-auto">{profile.bio}</p>
            )}

            {/* Current Book & Favorite Book - Side by Side */}
            {(currentBook || favoriteBook) && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {currentBook && (
                  <div className="border rounded-lg p-3 bg-card">
                    <p className="text-xs text-muted-foreground mb-2">Currently Reading</p>
                    <div className="flex gap-2">
                      {currentBook.cover_url && (
                        <img
                          src={currentBook.cover_url}
                          alt={currentBook.title}
                          className="w-12 h-16 object-cover rounded flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2 leading-tight">{currentBook.title}</p>
                        <p className="text-xs text-muted-foreground truncate mt-1">{currentBook.author}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Page {currentBook.current_page} of {currentBook.total_pages}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {favoriteBook && (
                  <div className="border rounded-lg p-3 bg-card">
                    <p className="text-xs text-muted-foreground mb-2">Favorite Book</p>
                    <div className="flex gap-2">
                      {favoriteBook.cover_url && (
                        <img
                          src={favoriteBook.cover_url}
                          alt={favoriteBook.title}
                          className="w-12 h-16 object-cover rounded flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2 leading-tight">{favoriteBook.title}</p>
                        <p className="text-xs text-muted-foreground truncate mt-1">{favoriteBook.author}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reading Goals */}
            <div className="mb-4">
              <HomeReadingGoals userId={profile.id} completedBooksThisYear={completedBooksThisYear} isOwnProfile={false} />
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              <div className="bg-card border rounded-lg p-3 text-center">
                <BookOpen className="w-5 h-5 mx-auto mb-1 text-primary" />
                <div className="text-2xl font-bold">{bookStats.inProgressBooks}</div>
                <div className="text-xs text-muted-foreground">In Progress</div>
              </div>
              <div className="bg-card border rounded-lg p-3 text-center">
                <Star className="w-5 h-5 mx-auto mb-1 text-primary" />
                <div className="text-2xl font-bold">{bookStats.completedBooks}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div className="bg-card border rounded-lg p-3 text-center">
                <BookOpen className="w-5 h-5 mx-auto mb-1 text-primary" />
                <div className="text-2xl font-bold">{bookStats.totalBooks}</div>
                <div className="text-xs text-muted-foreground">Total Books</div>
              </div>
            </div>

            {/* Recent Reviews Section */}
            {recentReviews.length > 0 && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-semibold">Recent Reviews</h2>
                  <Link to={`/user/${profile.id}#reviews`} className="text-sm text-primary hover:underline">
                    View all
                  </Link>
                </div>
                <div className="space-y-3">
                  {recentReviews.map((review: any) => (
                    <div key={review.id} className="bg-card border rounded-lg p-4">
                      <div className="flex gap-3 mb-2">
                        {review.books?.cover_url && (
                          <img
                            src={review.books.cover_url}
                            alt={review.books?.title}
                            className="w-12 h-16 object-cover rounded flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm">{review.books?.title}</h3>
                          <p className="text-xs text-muted-foreground">{review.books?.author}</p>
                          <div className="flex items-center gap-1 mt-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      {review.review && (
                        <p className="text-sm text-muted-foreground line-clamp-3">{review.review}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Desktop Layout - Left sidebar + Main content */}
          <div className="hidden lg:grid lg:grid-cols-[300px_1fr] lg:gap-8">
            {/* Left Sidebar - Profile Info */}
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="bg-card border rounded-lg p-6 text-center">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-muted border-2 border-border mx-auto mb-4">
                  <img 
                    src={profile.avatar_url || "/assets/default-avatar.png"} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-1">
                  {profile.display_name || "Reader"}
                </h1>
                <p className="text-sm text-muted-foreground mb-3">
                  @{profile.username || profile.id.slice(0, 8)}
                </p>
                
                {profile.bio && (
                  <p className="text-sm text-foreground mb-4">{profile.bio}</p>
                )}

                <div className="space-y-2 text-xs text-muted-foreground mb-4">
                  <div className="flex items-center justify-center gap-2">
                    <Calendar className="w-3 h-3" />
                    Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </div>
                  {zodiacSign && (
                    <div className="flex items-center justify-center gap-2">
                      <Star className="w-3 h-3" />
                      {zodiacSign}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 justify-center mb-4">
                  <FollowersDialog userId={profile.id} type="followers" count={followersCount} />
                  <FollowersDialog userId={profile.id} type="following" count={followingCount} />
                </div>

                {myId && myId !== profile.id && (
                  <FollowButton targetUserId={profile.id} />
                )}
              </div>

              {/* Stats Card */}
              <div className="bg-card border rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-sm">Reading Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">In Progress</span>
                    <span className="font-bold">{bookStats.inProgressBooks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Completed</span>
                    <span className="font-bold">{bookStats.completedBooks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Books</span>
                    <span className="font-bold">{bookStats.totalBooks}</span>
                  </div>
                </div>
              </div>

              {/* Favorite Book */}
              {favoriteBook && (
                <div className="bg-card border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-sm">Favorite Book</h3>
                  <div className="flex gap-3">
                    {favoriteBook.cover_url && (
                      <img
                        src={favoriteBook.cover_url}
                        alt={favoriteBook.title}
                        className="w-16 h-20 object-cover rounded flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2">{favoriteBook.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{favoriteBook.author}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Currently Reading */}
              {currentBook && (
                <div className="bg-card border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-sm">Currently Reading</h3>
                  <div className="flex gap-3">
                    {currentBook.cover_url && (
                      <img
                        src={currentBook.cover_url}
                        alt={currentBook.title}
                        className="w-16 h-20 object-cover rounded flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2">{currentBook.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{currentBook.author}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Page {currentBook.current_page} of {currentBook.total_pages}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Main Content Area */}
            <div className="space-y-6">
              {/* Reading Goals */}
              <HomeReadingGoals userId={profile.id} completedBooksThisYear={completedBooksThisYear} isOwnProfile={false} />

              {/* Recent Reviews */}
              {recentReviews.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Recent Reviews</h2>
                    <Link to={`/user/${profile.id}#reviews`} className="text-sm text-primary hover:underline">
                      View all
                    </Link>
                  </div>
                  <div className="grid gap-4">
                    {recentReviews.map((review: any) => (
                      <div key={review.id} className="bg-card border rounded-lg p-4">
                        <div className="flex gap-4 mb-3">
                          {review.books?.cover_url && (
                            <img
                              src={review.books.cover_url}
                              alt={review.books?.title}
                              className="w-16 h-20 object-cover rounded flex-shrink-0"
                            />
                          )}
                          <div className="flex-1">
                            <h3 className="font-medium">{review.books?.title}</h3>
                            <p className="text-sm text-muted-foreground">{review.books?.author}</p>
                            <div className="flex items-center gap-1 mt-2">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-muted"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        {review.review && (
                          <p className="text-sm text-muted-foreground">{review.review}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
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

              {/* DNF Books Section */}
              <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
            <XCircle className="w-5 h-5 text-orange-500" />
            Did Not Finish ({dnfBooks.length})
          </h2>
          
              {dnfBooks.length === 0 ? (
                <div className="bg-card p-6 rounded-lg border text-center">
                  <p className="text-muted-foreground">No DNF books yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dnfBooks.map((book) => (
                    <div key={book.id} className="bg-card border rounded-lg p-4 hover:bg-accent/5 transition-colors relative">
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
                          <h3 className="font-medium text-foreground truncate">{book.title}</h3>
                          <p className="text-sm text-muted-foreground mb-1">by {book.author}</p>
                          {book.dnf_type && (
                            <span className="inline-block bg-orange-500/20 text-orange-700 dark:text-orange-400 text-xs px-2 py-1 rounded-md mt-1">
                              {book.dnf_type === 'soft' ? 'Soft DNF' : 'Hard DNF'}
                            </span>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(book.created_at).toLocaleDateString()}
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
        </div>
      </div>
    </UserColorProvider>
  );
}