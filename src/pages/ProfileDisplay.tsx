import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Settings, User, BookOpen, Star, Calendar, Globe, Facebook, Twitter, Instagram, Linkedin, Youtube, ExternalLink, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { HomeReadingGoals } from "@/components/HomeReadingGoals";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { usePlatform } from "@/hooks/usePlatform";
import { FollowersDialog } from "@/components/FollowersDialog";
import { TopTenDialog } from "@/components/TopTenDialog";
import { UserColorProvider } from "@/components/UserColorProvider";

type UserProfile = {
  id: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  email?: string;
  birthday?: string | null;
  favorite_book_id?: string | null;
  current_book_id?: string | null;
  social_media_links?: any;
  website_url?: string | null;
  color_palette?: any;
  top_five_books?: string[];
};

type FavoriteBook = {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
};

type CurrentBook = {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  current_page: number;
  total_pages: number;
};

type BookStats = {
  totalBooks: number;
  completedBooks: number;
  inProgressBooks: number;
  completedThisYear: number;
};

type Review = {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  books: {
    title: string;
    author: string;
    cover_url?: string;
  };
};

type TBRBook = {
  id: string;
  title: string;
  author: string;
  total_pages: number | null;
  notes: string | null;
  priority: number;
  created_at: string;
  cover_url?: string;
};

type ProgressItem = {
  kind: "progress";
  id: string;
  created_at: string;
  book_title: string | null;
  book_author: string | null;
  book_cover_url?: string | null;
  from_page: number | null;
  to_page: number;
};

type ReviewActivity = {
  kind: "review";
  id: string;
  created_at: string;
  book_title: string | null;
  book_author: string | null;
  book_cover_url?: string | null;
  rating: number;
  review: string | null;
};

type ActivityItem = ProgressItem | ReviewActivity;

export default function ProfileDisplay() {
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [backgroundTint, setBackgroundTint] = useState<{ color: string; opacity: number } | null>(null);
  const [bookStats, setBookStats] = useState<BookStats>({ totalBooks: 0, completedBooks: 0, inProgressBooks: 0, completedThisYear: 0 });
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [tbrBooks, setTbrBooks] = useState<TBRBook[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [favoriteBook, setFavoriteBook] = useState<FavoriteBook | null>(null);
  const [currentBook, setCurrentBook] = useState<CurrentBook | null>(null);
  const [topFiveBooks, setTopFiveBooks] = useState<FavoriteBook[]>([]);
  const [showAllTopBooks, setShowAllTopBooks] = useState(false);
  const [showTopTenDialog, setShowTopTenDialog] = useState(false);
  const [zodiacSign, setZodiacSign] = useState<string | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const { toast } = useToast();
  const { isIOS, isReadReceiptApp } = usePlatform();

  const loadData = async () => {
      if (!profile) setLoading(true);
      
      // Get current user
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user ?? null;
      
      if (!user) {
        setUid(null);
        setLoading(false);
        return;
      }

      setUid(user.id);

      // Load profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile load error:", profileError);
      } else {
        setProfile({
          ...profileData,
          email: user.email,
          top_five_books: Array.isArray(profileData.top_five_books) ? profileData.top_five_books as string[] : []
        });

        // Set background image and tint if exists
        if (profileData.background_image_url) {
          setBackgroundImageUrl(profileData.background_image_url);
        }
        if (profileData.background_tint) {
          setBackgroundTint(profileData.background_tint as { color: string; opacity: number });
        }

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

        // Fetch top five books
        if (profileData.top_five_books && Array.isArray(profileData.top_five_books) && profileData.top_five_books.length > 0) {
          const { data: topFiveData } = await supabase
            .from('books')
            .select('id, title, author, cover_url')
            .in('id', profileData.top_five_books as string[]);
          
          if (topFiveData) {
            const orderedBooks = (profileData.top_five_books as string[])
              .map(id => topFiveData.find(book => book.id === id))
              .filter(Boolean) as FavoriteBook[];
            setTopFiveBooks(orderedBooks);
          }
        }


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
            .eq('user_id', user.id)
            .eq('status', 'in_progress')
            .order('updated_at', { ascending: false })
            .limit(10);
          
          // Filter client-side for books where current_page < total_pages
          const inProgressBook = fallbackBooks?.find(b => b.current_page < b.total_pages);
          if (inProgressBook) {
            setCurrentBook(inProgressBook);
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
      }

      // Load book statistics
      const { data: books, error: booksError } = await supabase
        .from("books")
        .select("current_page, total_pages, status, finished_at")
        .eq("user_id", user.id);

      if (!booksError && books) {
        const totalBooks = books.length;
        const currentYear = new Date().getFullYear();
        const completedBooks = books.filter(book => 
          book.status === 'completed' || book.current_page >= book.total_pages
        ).length;
        const inProgressBooks = books.filter(book => 
          book.current_page < book.total_pages && 
          book.status !== 'completed' && 
          book.status !== 'dnf' &&
          book.status !== 'top_five'
        ).length;
        
        // Calculate completed this year - same logic as home page
        const start = `${currentYear}-01-01`;
        const end = `${currentYear}-12-31`;
        
        // Count from reading_entries first (for re-reads)
        const { data: entries } = await supabase
          .from('reading_entries')
          .select('id, finished_at, book_id')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('finished_at', start)
          .lte('finished_at', end);
        
        const entryCount = entries?.length || 0;
        const entriesBookIds = new Set((entries || []).map(e => e.book_id));
        
        // Count books marked completed this year that don't have entries
        const extra = books.filter(b => {
          if (entriesBookIds.has((b as any).id)) return false;
          if (b.finished_at) {
            const fy = new Date(b.finished_at).getFullYear();
            return fy === currentYear;
          }
          if (b.status === 'completed' && (b as any).created_at) {
            const cy = new Date((b as any).created_at).getFullYear();
            return cy === currentYear;
          }
          return false;
        }).length;
        
        const completedThisYear = entryCount + extra;
        
        setBookStats({ totalBooks, completedBooks, inProgressBooks, completedThisYear });
      }

      // Load recent reviews
      const { data: reviews, error: reviewsError } = await supabase
        .from("reviews")
        .select(`
          id, rating, review, created_at,
          books:book_id (title, author, cover_url)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!reviewsError && reviews) {
        setRecentReviews(reviews as Review[]);
      }

      // Load TBR books
      const { data: tbrData, error: tbrError } = await supabase
        .from("tbr_books")
        .select("id, title, author, total_pages, notes, priority, created_at, cover_url")
        .eq("user_id", user.id)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (!tbrError && tbrData) {
        setTbrBooks(tbrData);
      }

      // Load followers and following counts
      const { count: followersCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user.id);
      
      const { count: followingCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user.id);

      setFollowersCount(followersCount || 0);
      setFollowingCount(followingCount || 0);

      // Load activity feed (progress + reviews for activity section)
      const { data: progressData } = await supabase
        .from("reading_progress")
        .select(`
          id, created_at, from_page, to_page,
          books!reading_progress_book_id_fkey ( title, author, cover_url )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      const pItems: ProgressItem[] = (progressData ?? []).map((r: any) => ({
        kind: "progress",
        id: r.id,
        created_at: r.created_at,
        book_title: r.books?.title ?? null,
        book_author: r.books?.author ?? null,
        book_cover_url: r.books?.cover_url ?? null,
        from_page: r.from_page ?? null,
        to_page: r.to_page,
      }));

      const { data: reviewActivityData } = await supabase
        .from("reviews")
        .select(`
          id, created_at, rating, review,
          books:book_id (title, author, cover_url)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      const rItems: ReviewActivity[] = (reviewActivityData ?? []).map((r: any) => ({
        kind: "review",
        id: r.id,
        created_at: r.created_at,
        book_title: r.books?.title ?? null,
        book_author: r.books?.author ?? null,
        book_cover_url: r.books?.cover_url ?? null,
        rating: r.rating,
        review: r.review,
      }));

      const merged = [...pItems, ...rItems].sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
      );

      setActivityFeed(merged);

      setLoading(false);
  };

  const { scrollableRef, pullDistance, isRefreshing, showPullIndicator } = usePullToRefresh({
    onRefresh: async () => {
      // Show success immediately
      toast({
        title: "Refreshed!",
        description: "Updating your profile...",
      });
      // Load in background
      loadData();
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  const getSocialMediaIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook': return Facebook;
      case 'twitter': return Twitter;
      case 'instagram': return Instagram;
      case 'linkedin': return Linkedin;
      case 'youtube': return Youtube;
      default: return Globe;
    }
  };

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = () => {
      // Reload profile data when updated
      window.location.reload();
    };

    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('profile-updated', handleProfileUpdate);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!uid || !profile) {
    return (
      <div className="min-h-screen bg-gradient-soft">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Profile Not Found</h1>
            <p className="text-muted-foreground mb-4">Please sign in to view your profile.</p>
            <Link to="/" className="text-primary underline">Go to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  // Compute text color for header
  const headerTextColor = (() => {
    const textHex = (profile as any)?.color_palette?.text_color as string | undefined;
    if (textHex) return textHex;
    // Default to foreground
    return undefined;
  })();

  // Compute accent color for cards/sections
  const accentCardColor = (profile as any)?.color_palette?.accent_color || "#ffffff";
  
  // Compute contrast text color for accent sections
  const accentTextColor = (() => {
    const customTextHex = (profile as any)?.color_palette?.accent_text_color as string | undefined;
    if (customTextHex) return customTextHex;
    // Auto contrast based on accent color
    const hex = accentCardColor;
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    const lum = 0.2126*r + 0.7152*g + 0.0722*b;
    return lum < 128 ? "#FFFFFF" : "#1A1A1A";
  })();

  return (
    <UserColorProvider 
      userColorPalette={profile?.color_palette}
      backgroundImageUrl={backgroundImageUrl}
      backgroundTint={backgroundTint}
    >
      <div className="min-h-screen bg-background">
        <Navigation />
      <div 
        ref={scrollableRef}
        className="relative overflow-y-auto"
        style={{ 
          height: (isIOS || isReadReceiptApp) ? 'calc(100dvh - 4rem)' : 'auto',
          paddingTop: (isIOS || isReadReceiptApp) ? 'calc(env(safe-area-inset-top, 0px) + 12px)' : undefined,
          paddingBottom: (isIOS || isReadReceiptApp) ? 'calc(4rem + env(safe-area-inset-bottom, 0px) + 16px)' : undefined,
        }}
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

      <div className="container mx-auto px-3 sm:px-6 py-2 sm:py-6 max-w-7xl"
        style={{ paddingTop: showPullIndicator ? `${pullDistance + 8}px` : undefined }}
      >
        {/* Mobile & Tablet Layout - Centered */}
        <div className="lg:hidden">
          {/* Settings Button - Top Right */}
          <div className="flex justify-end mb-3">
            <Link to="/profile/settings">
              <Button variant="outline" size="sm" className="h-9 px-4">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </Link>
          </div>

          {/* Header - Profile photo and info on left, stats on right */}
          <div className="flex items-start gap-4 mb-4 max-w-4xl mx-auto">
            {/* Left side - Profile Photo and Info */}
            <div className="flex items-start gap-4 flex-1">
              {/* Profile Photo */}
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-muted border-4 border-border flex-shrink-0">
                {profile.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 space-y-2 pt-1">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground" style={headerTextColor ? { color: headerTextColor } : {}}>
                    {profile.display_name || "Reader"}
                  </h1>
                  <p className="text-base sm:text-lg mt-0.5 text-foreground opacity-80" style={headerTextColor ? { color: headerTextColor } : {}}>
                    @{profile.username || profile.id.slice(0, 8)}
                  </p>
                </div>

                {profile.bio && (
                  <p className="text-sm text-foreground" style={headerTextColor ? { color: headerTextColor } : {}}>{profile.bio}</p>
                )}

                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-foreground opacity-75" style={headerTextColor ? { color: headerTextColor } : {}}>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                    Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                  {zodiacSign && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 sm:w-4 sm:h-4" />
                        {zodiacSign}
                      </span>
                    </>
                  )}
                </div>

                {/* Followers/Following */}
                {uid && (
                  <div className="flex gap-2">
                    <FollowersDialog userId={uid} type="followers" count={followersCount} accentColor={accentCardColor} />
                    <FollowersDialog userId={uid} type="following" count={followingCount} accentColor={accentCardColor} />
                  </div>
                )}
              </div>
            </div>

            {/* Right side - Reading Goal and Stats */}
            <div className="flex-shrink-0">
              <Card className="border-2" style={{ borderColor: accentCardColor, backgroundColor: accentCardColor }}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4" style={{ color: accentTextColor }} />
                    <h3 className="text-base font-semibold" style={{ color: accentTextColor }}>
                      {new Date().getFullYear()} Reading Goal
                    </h3>
                  </div>
                  <HomeReadingGoals 
                    userId={uid}
                    completedBooksThisYear={bookStats.completedThisYear}
                    isOwnProfile={true}
                    accentColor={accentCardColor}
                  />
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl font-bold" style={{ color: accentTextColor }}>
                        {bookStats.inProgressBooks}
                      </div>
                      <div className="text-[10px] sm:text-xs" style={{ color: accentTextColor, opacity: 0.8 }}>
                        In Progress
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl font-bold" style={{ color: accentTextColor }}>
                        {bookStats.completedThisYear}
                      </div>
                      <div className="text-[10px] sm:text-xs" style={{ color: accentTextColor, opacity: 0.8 }}>
                        Completed
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl font-bold" style={{ color: accentTextColor }}>
                        {bookStats.totalBooks}
                      </div>
                      <div className="text-[10px] sm:text-xs" style={{ color: accentTextColor, opacity: 0.8 }}>
                        Total Books
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          {/* Current Book & Favorite Book - Side by Side - Compact */}
          {(currentBook || favoriteBook) && (
            <div className="grid grid-cols-2 gap-1.5 mb-2 max-w-md mx-auto">
              {favoriteBook && (
                <div className="border rounded p-0.5" style={{ backgroundColor: accentCardColor }}>
                  <p className="text-[8px] mb-0.5 font-medium px-0.5" style={{ color: accentTextColor }}>Favorite Book</p>
                  <div className="flex gap-0.5 px-0.5">
                    {favoriteBook.cover_url && (
                      <img
                        src={favoriteBook.cover_url}
                        alt={favoriteBook.title}
                        className="w-6 h-9 sm:w-7 sm:h-10 object-cover rounded flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-medium line-clamp-1 leading-tight" style={{ color: accentTextColor }}>
                        {favoriteBook.title}
                      </p>
                      <p className="text-[8px] opacity-80 leading-tight" style={{ color: accentTextColor }}>
                        {favoriteBook.author}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {currentBook && (
                <div className="border rounded p-0.5" style={{ backgroundColor: accentCardColor }}>
                  <p className="text-[8px] mb-0.5 font-medium px-0.5" style={{ color: accentTextColor }}>Currently Reading</p>
                  <div className="flex gap-0.5 px-0.5">
                    {currentBook.cover_url && (
                      <img
                        src={currentBook.cover_url}
                        alt={currentBook.title}
                        className="w-6 h-9 sm:w-7 sm:h-10 object-cover rounded flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-medium line-clamp-1 leading-tight" style={{ color: accentTextColor }}>
                        {currentBook.title}
                      </p>
                      <p className="text-[8px] opacity-80 leading-tight" style={{ color: accentTextColor }}>
                        {currentBook.author}
                      </p>
                      <p className="text-[8px] opacity-80 leading-tight" style={{ color: accentTextColor }}>
                        Page {currentBook.current_page} of {currentBook.total_pages}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Top Five Books */}
          {topFiveBooks.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-center gap-2 mb-6">
                <Link to="/profile/settings">
                  <p className="text-sm font-medium text-center cursor-pointer hover:underline" style={{ color: accentTextColor }}>
                    Top Five
                  </p>
                </Link>
                <button
                  onClick={() => setShowTopTenDialog(true)}
                  className="text-xs px-2 py-0.5 rounded-full border hover:bg-accent/50 transition-colors"
                  style={{ color: accentTextColor, borderColor: accentTextColor }}
                >
                  view top ten
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 justify-center md:justify-start pt-3">
                {topFiveBooks.slice(0, 5).map((book, index) => (
                  <div key={book.id} className="flex-shrink-0 w-16 md:w-24">
                    <div className="relative">
                      <div className="absolute -top-1.5 -left-1.5 md:-top-2 md:-left-2 w-4 h-4 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold z-10" style={{ backgroundColor: accentCardColor, color: accentTextColor }}>
                        {index + 1}
                      </div>
                      {book.cover_url && (
                        <img
                          src={book.cover_url}
                          alt={book.title}
                          className="w-full h-20 md:h-32 object-contain rounded shadow-md"
                        />
                      )}
                    </div>
                    <p className="text-[10px] md:text-xs mt-1 text-center truncate font-medium" style={{ color: headerTextColor }}>{book.title}</p>
                    <p className="text-[10px] md:text-xs text-center truncate" style={{ color: headerTextColor, opacity: 0.7 }}>{book.author}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <TopTenDialog 
            open={showTopTenDialog} 
            onOpenChange={setShowTopTenDialog} 
            books={topFiveBooks} 
            accentCardColor={accentCardColor}
            accentTextColor={accentTextColor}
          />

          {((profile.social_media_links && Object.keys(profile.social_media_links).length > 0) || profile.website_url) && (
            <>
              <p className="text-sm font-medium mb-2 text-center" style={{ color: headerTextColor }}>Links</p>
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {profile.social_media_links && Object.entries(profile.social_media_links as Record<string, string>).map(([platform, url]) => {
                  const Icon = getSocialMediaIcon(platform);
                  return (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-full hover:bg-accent transition-colors"
                      style={{ color: headerTextColor }}
                    >
                      <Icon className="w-3 h-3" />
                      {platform}
                    </a>
                  );
                })}
                {profile.website_url && (
                  <a
                    href={profile.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-full hover:bg-accent transition-colors"
                    style={{ color: headerTextColor }}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Website
                  </a>
                )}
              </div>
            </>
          )}



          {/* Collapsible Activity Sections - Mobile/Tablet */}
          <Accordion type="multiple" className="w-full space-y-2">
            {/* Recent Reviews */}
            <AccordionItem value="reviews" className="border rounded-lg px-3" style={{ backgroundColor: accentCardColor }}>
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Recent Reviews ({recentReviews.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                {recentReviews.length === 0 ? (
                  <div className="text-center py-4">
                    <Star className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No reviews yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {recentReviews.map((review) => (
                      <div key={review.id} className="border-b border-border pb-2 last:border-b-0">
                        <div className="flex gap-2">
                          {review.books.cover_url ? (
                            <img 
                              src={review.books.cover_url} 
                              alt={review.books.title}
                              className="w-8 h-11 object-contain rounded shadow-sm flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-11 bg-muted rounded flex items-center justify-center shadow-sm flex-shrink-0">
                              <BookOpen className="w-3 h-3 text-muted-foreground" />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-xs text-foreground truncate">{review.books.title}</h4>
                            <div className="flex items-center gap-1 mt-0.5">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`w-2.5 h-2.5 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`}
                                  />
                                ))}
                              </div>
                              <span className="text-[9px] text-muted-foreground">
                                {new Date(review.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {review.review && (
                              <p className="text-[10px] text-foreground mt-1 line-clamp-2">{review.review}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Reading Activity */}
            <AccordionItem value="activity" className="border rounded-lg px-3" style={{ backgroundColor: accentCardColor }}>
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Reading Activity</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                {activityFeed.length === 0 ? (
                  <div className="text-center py-4">
                    <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No activity yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {activityFeed.map((item) =>
                      item.kind === "progress" ? (
                        <div key={`p-${item.id}`} className="border border-border rounded-lg p-2">
                          <div className="text-[9px] text-muted-foreground mb-1">
                            {new Date(item.created_at).toLocaleString()}
                          </div>
                          <div className="flex gap-1.5">
                            {item.book_cover_url ? (
                              <img 
                                src={item.book_cover_url} 
                                alt={item.book_title || "Book cover"}
                                className="w-6 h-9 object-contain rounded shadow-sm flex-shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-9 bg-muted rounded flex items-center justify-center shadow-sm flex-shrink-0">
                                <BookOpen className="w-2.5 h-2.5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-[10px] mb-0.5">Reading Progress</div>
                              <div className="text-[9px] text-muted-foreground line-clamp-2">
                                Page {item.to_page} of {item.book_title ?? "Untitled"}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div key={`r-${item.id}`} className="border border-border rounded-lg p-2">
                          <div className="text-[9px] text-muted-foreground mb-1">
                            {new Date(item.created_at).toLocaleString()}
                          </div>
                          <div className="flex gap-1.5">
                            {item.book_cover_url ? (
                              <img 
                                src={item.book_cover_url} 
                                alt={item.book_title || "Book cover"}
                                className="w-6 h-9 object-contain rounded shadow-sm flex-shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-9 bg-muted rounded flex items-center justify-center shadow-sm flex-shrink-0">
                                <BookOpen className="w-2.5 h-2.5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-[10px] mb-0.5">
                                Reviewed: ⭐ {item.rating}/5
                              </div>
                              <div className="text-[9px] text-muted-foreground truncate">
                                {item.book_title ?? "Untitled"}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* TBR List */}
            <AccordionItem value="tbr" className="border rounded-lg px-3" style={{ backgroundColor: accentCardColor }}>
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">To Be Read ({tbrBooks.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                {tbrBooks.length === 0 ? (
                  <div className="text-center py-4">
                    <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Your TBR list is empty</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {tbrBooks.map((book) => (
                      <div key={book.id} className="border border-border rounded-lg p-2">
                        <div className="flex gap-1.5">
                          {book.cover_url ? (
                            <img 
                              src={book.cover_url} 
                              alt={book.title}
                              className="w-8 h-11 object-contain rounded shadow-sm flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-11 bg-muted rounded flex items-center justify-center shadow-sm flex-shrink-0">
                              <BookOpen className="w-3 h-3 text-muted-foreground" />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-0.5">
                              <h3 className="font-medium text-xs text-foreground truncate">{book.title}</h3>
                              {book.priority > 0 && (
                                <div className="flex">
                                  {Array(book.priority).fill(0).map((_, i) => (
                                    <Star key={i} className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                                  ))}
                                </div>
                              )}
                            </div>
                            <p className="text-[9px] text-muted-foreground truncate">by {book.author}</p>
                            {book.total_pages && (
                              <p className="text-[9px] text-muted-foreground">{book.total_pages} pages</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Desktop Layout - Original Format */}
        <div className="hidden lg:block">
          {/* Settings Button - Top Right */}
          <div className="flex justify-end mb-4">
            <Link to="/profile/settings">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </Link>
          </div>

          {/* Header Section - Profile photo and info on left, reading stats on right */}
          <div className="flex items-start gap-6 mb-6 max-w-6xl mx-auto">
            {/* Left Section - Photo + Info */}
            <div className="flex items-start gap-6 flex-1">
              {/* Profile Photo */}
              <div className="w-40 h-40 rounded-full overflow-hidden bg-muted border-4 border-border flex-shrink-0">
                {profile.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              {/* Profile Info */}
              <div className="flex-1 space-y-2 pt-1">
                <div>
                  <h1 className="text-4xl font-bold text-foreground" style={headerTextColor ? { color: headerTextColor } : {}}>
                    {profile.display_name || "Reader"}
                  </h1>
                  <p className="text-lg mt-0.5 text-foreground opacity-80" style={headerTextColor ? { color: headerTextColor } : {}}>
                    @{profile.username || profile.id.slice(0, 8)}
                  </p>
                </div>

                {profile.bio && (
                  <p className="text-sm max-w-2xl text-foreground" style={headerTextColor ? { color: headerTextColor } : {}}>
                    {profile.bio}
                  </p>
                )}
                
                <div className="flex items-center gap-4 text-foreground opacity-75" style={headerTextColor ? { color: headerTextColor } : {}}>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                  {zodiacSign && (
                    <p className="text-sm flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      {zodiacSign}
                    </p>
                  )}
                </div>

                {/* Followers/Following */}
                {uid && (
                  <div className="flex gap-2">
                    <FollowersDialog userId={uid} type="followers" count={followersCount} accentColor={accentCardColor} />
                    <FollowersDialog userId={uid} type="following" count={followingCount} accentColor={accentCardColor} />
                  </div>
                )}
              </div>
            </div>

            {/* Right Section - Reading Goal and Stats */}
            <div className="flex-shrink-0 w-80">
              <Card className="border-2" style={{ borderColor: accentCardColor, backgroundColor: accentCardColor }}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-5 h-5" style={{ color: accentTextColor }} />
                    <h3 className="text-lg font-semibold" style={{ color: accentTextColor }}>
                      {new Date().getFullYear()} Reading Goal
                    </h3>
                  </div>
                  <HomeReadingGoals 
                    userId={uid}
                    completedBooksThisYear={bookStats.completedThisYear}
                    isOwnProfile={true}
                    accentColor={accentCardColor}
                  />
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: accentTextColor }}>
                        {bookStats.inProgressBooks}
                      </div>
                      <div className="text-xs" style={{ color: accentTextColor, opacity: 0.8 }}>
                        In Progress
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: accentTextColor }}>
                        {bookStats.completedThisYear}
                      </div>
                      <div className="text-xs" style={{ color: accentTextColor, opacity: 0.8 }}>
                        Completed
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: accentTextColor }}>
                        {bookStats.totalBooks}
                      </div>
                      <div className="text-xs" style={{ color: accentTextColor, opacity: 0.8 }}>
                        Total Books
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Favorite Book and Current Read - Below header - Smaller */}
          {(currentBook || favoriteBook) && (
            <div className="flex gap-2 mb-3 max-w-6xl mx-auto">
              {favoriteBook && (
                <div className="flex-1">
                  <h3 className="text-[10px] font-medium mb-1" style={{ color: headerTextColor }}>Favorite Book</h3>
                  <div className="flex items-center gap-1.5 p-1 border rounded bg-card" style={{ backgroundColor: accentCardColor }}>
                    {favoriteBook.cover_url && (
                      <img
                        src={favoriteBook.cover_url}
                        alt={favoriteBook.title}
                        className="w-7 h-10 object-contain rounded flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[10px] line-clamp-1" style={{ color: accentTextColor }}>
                        {favoriteBook.title}
                      </div>
                      <div className="text-[9px]" style={{ color: accentTextColor, opacity: 0.7 }}>
                        {favoriteBook.author}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentBook && (
                <div className="flex-1">
                  <h3 className="text-[10px] font-medium mb-1" style={{ color: headerTextColor }}>Currently Reading</h3>
                  <div className="flex items-center gap-1.5 p-1 border rounded bg-card" style={{ backgroundColor: accentCardColor }}>
                    {currentBook.cover_url && (
                      <img
                        src={currentBook.cover_url}
                        alt={currentBook.title}
                        className="w-7 h-10 object-contain rounded flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[10px] line-clamp-1" style={{ color: accentTextColor }}>{currentBook.title}</div>
                      <div className="text-[9px]" style={{ color: accentTextColor, opacity: 0.7 }}>{currentBook.author}</div>
                      <div className="text-[9px]" style={{ color: accentTextColor, opacity: 0.7 }}>
                        Page {currentBook.current_page} of {currentBook.total_pages}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Top Five Books - Desktop */}
          {topFiveBooks.length > 0 && (
            <div className="mb-6 max-w-6xl mx-auto">
              <div className="flex items-center gap-2 mb-3">
                <Link to="/profile/settings">
                  <h3 className="text-sm font-medium cursor-pointer hover:underline" style={{ color: headerTextColor }}>
                    Top Five
                  </h3>
                </Link>
                <button
                  onClick={() => setShowTopTenDialog(true)}
                  className="text-xs px-2 py-0.5 rounded-full border hover:bg-accent/50 transition-colors"
                  style={{ color: headerTextColor, borderColor: `${headerTextColor}33` }}
                >
                  view top ten
                </button>
              </div>
              <div className="flex gap-3">
                {topFiveBooks.slice(0, 5).map((book, index) => (
                  <div key={book.id} className="flex-shrink-0 w-28">
                    <div className="relative">
                      <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10" style={{ backgroundColor: accentCardColor, color: accentTextColor }}>
                        {index + 1}
                      </div>
                      {book.cover_url && (
                        <img
                          src={book.cover_url}
                          alt={book.title}
                          className="w-full aspect-[2/3] object-cover rounded-lg shadow-md"
                        />
                      )}
                    </div>
                    <p className="text-xs font-medium mt-2 line-clamp-2 leading-tight" style={{ color: accentTextColor }}>{book.title}</p>
                    <p className="text-xs mt-0.5 line-clamp-1" style={{ color: accentTextColor, opacity: 0.7 }}>{book.author}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {((profile.social_media_links && Object.keys(profile.social_media_links).length > 0) || profile.website_url) && (
            <>
              <h3 className="text-sm font-medium mb-2 max-w-6xl mx-auto" style={{ color: headerTextColor }}>Links</h3>
              <div className="flex flex-wrap gap-2 mb-6 max-w-6xl mx-auto">
                {profile.social_media_links && Object.entries(profile.social_media_links).map(([platform, url]) => {
                  const Icon = getSocialMediaIcon(platform);
                  return (
                    <a
                      key={platform}
                      href={url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-full hover:bg-accent transition-colors"
                      style={{ color: headerTextColor, borderColor: `${headerTextColor}33` }}
                    >
                      <Icon className="w-3 h-3" />
                      {platform}
                    </a>
                  );
                })}
                {profile.website_url && (
                  <a
                    href={profile.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-full hover:bg-accent transition-colors"
                    style={{ color: headerTextColor, borderColor: `${headerTextColor}33` }}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Website
                  </a>
                )}
              </div>
            </>
          )}



          {/* Three Column Layout: Recent Reviews - Activity Feed - TBR List */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Recent Reviews */}
            <Card style={{ backgroundColor: accentCardColor }}>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  Recent Reviews
                  <Link to="/reviews" className="text-xs font-normal text-primary hover:underline">
                    View all
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {recentReviews.length === 0 ? (
                  <div className="text-center py-8">
                    <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No reviews yet</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto">
                    {recentReviews.map((review) => (
                      <div key={review.id} className="border-b border-border pb-2.5 last:border-b-0">
                        <div className="flex gap-2">
                          {review.books.cover_url ? (
                            <img 
                              src={review.books.cover_url} 
                              alt={review.books.title}
                              className="w-10 h-14 object-contain rounded shadow-sm flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-14 bg-muted rounded flex items-center justify-center shadow-sm flex-shrink-0">
                              <BookOpen className="w-3 h-3 text-muted-foreground" />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-foreground truncate">{review.books.title}</h4>
                            <p className="text-xs text-muted-foreground truncate">by {review.books.author}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(review.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {review.review && (
                              <p className="text-xs text-foreground mt-1 line-clamp-2">{review.review}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Feed */}
            <Card style={{ backgroundColor: accentCardColor }}>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="flex items-center gap-1.5 text-sm">
                  <BookOpen className="w-4 h-4" />
                  Reading Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {activityFeed.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No activity yet</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto">
                    {activityFeed.map((item) =>
                      item.kind === "progress" ? (
                        <div key={`p-${item.id}`} className="border border-border rounded-lg p-2">
                          <div className="text-xs text-muted-foreground mb-1.5">
                            {new Date(item.created_at).toLocaleString()}
                          </div>
                          <div className="flex gap-2">
                            {item.book_cover_url ? (
                              <img 
                                src={item.book_cover_url} 
                                alt={item.book_title || "Book cover"}
                                className="w-8 h-12 object-contain rounded shadow-sm flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-12 bg-muted rounded flex items-center justify-center shadow-sm flex-shrink-0">
                                <BookOpen className="w-3 h-3 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-xs mb-0.5">Reading Progress</div>
                              <div className="text-xs text-muted-foreground">
                                Page {item.to_page}
                                {typeof item.from_page === "number" && item.from_page >= 0
                                  ? ` (from ${item.from_page})`
                                  : ""}{" "}
                                of <span className="truncate">{item.book_title ?? "Untitled"}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div key={`r-${item.id}`} className="border border-border rounded-lg p-2">
                          <div className="text-xs text-muted-foreground mb-1.5">
                            {new Date(item.created_at).toLocaleString()}
                          </div>
                          <div className="flex gap-2">
                            {item.book_cover_url ? (
                              <img 
                                src={item.book_cover_url} 
                                alt={item.book_title || "Book cover"}
                                className="w-8 h-12 object-contain rounded shadow-sm flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-12 bg-muted rounded flex items-center justify-center shadow-sm flex-shrink-0">
                                <BookOpen className="w-3 h-3 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-xs mb-0.5">
                                Reviewed: ⭐ {item.rating}/5
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {item.book_title ?? "Untitled"}
                              </div>
                              {item.review && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.review}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* TBR List */}
            <Card style={{ backgroundColor: accentCardColor }}>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="flex items-center gap-1.5 text-sm">
                  <BookOpen className="w-4 h-4" />
                  To Be Read ({tbrBooks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {tbrBooks.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Your TBR list is empty</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto">
                    {tbrBooks.map((book) => (
                      <div key={book.id} className="border border-border rounded-lg p-2 hover:bg-accent/5 transition-colors">
                        <div className="flex gap-2">
                          {book.cover_url ? (
                            <img 
                              src={book.cover_url} 
                              alt={book.title}
                              className="w-10 h-14 object-contain rounded shadow-sm flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-14 bg-muted rounded flex items-center justify-center shadow-sm flex-shrink-0">
                              <BookOpen className="w-3 h-3 text-muted-foreground" />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <h3 className="font-medium text-sm text-foreground truncate">{book.title}</h3>
                              {book.priority > 0 && (
                                <div className="flex">
                                  {Array(book.priority).fill(0).map((_, i) => (
                                    <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  ))}
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-0.5 truncate">by {book.author}</p>
                            {book.total_pages && (
                              <p className="text-xs text-muted-foreground mb-0.5">{book.total_pages} pages</p>
                            )}
                            {book.notes && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-0.5">{book.notes}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Added {new Date(book.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      </div>
    </div>
    </UserColorProvider>
  );
}