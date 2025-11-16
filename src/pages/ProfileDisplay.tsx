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
  const [bookStats, setBookStats] = useState<BookStats>({ totalBooks: 0, completedBooks: 0, inProgressBooks: 0, completedThisYear: 0 });
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [tbrBooks, setTbrBooks] = useState<TBRBook[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [favoriteBook, setFavoriteBook] = useState<FavoriteBook | null>(null);
  const [currentBook, setCurrentBook] = useState<CurrentBook | null>(null);
  const [topFiveBooks, setTopFiveBooks] = useState<FavoriteBook[]>([]);
  const [showAllTopBooks, setShowAllTopBooks] = useState(false);
  const [showTopTenDialog, setShowTopTenDialog] = useState(false);
  const [showFollowersDialog, setShowFollowersDialog] = useState(false);
  const [showFollowingDialog, setShowFollowingDialog] = useState(false);
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
        .single();

      if (profileError) {
        console.error("Profile load error:", profileError);
      } else {
        setProfile({
          ...profileData,
          email: user.email,
          top_five_books: Array.isArray(profileData.top_five_books) ? profileData.top_five_books as string[] : []
        });

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
        const completedThisYear = books.filter(book => {
          if (book.status !== 'completed' && book.current_page < book.total_pages) return false;
          if (book.finished_at) {
            return new Date(book.finished_at).getFullYear() === currentYear;
          }
          return false;
        }).length;
        const inProgressBooks = books.filter(book => 
          book.current_page < book.total_pages && 
          book.status !== 'completed' && 
          book.status !== 'dnf' &&
          book.status !== 'top_five'
        ).length;
        
        setBookStats({ totalBooks, completedBooks, inProgressBooks, completedThisYear });
        
        // Pass completed this year count to reading goals
        const readingGoalsElement = document.querySelector('[data-completed-this-year]');
        if (readingGoalsElement) {
          readingGoalsElement.setAttribute('data-completed-this-year', completedThisYear.toString());
        }
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

  // Compute header background color
  const headerBgColor = profile?.color_palette?.headerColor || 'hsl(var(--primary))';
  
  // Compute header text color based on background
  const headerTextColor = (() => {
    const col = profile?.color_palette?.headerColor;
    if (!col || col.startsWith('hsl')) return 'hsl(var(--primary-foreground))';
    const hex = col.replace('#','');
    const r = parseInt(hex.slice(0,2),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    const lum = 0.2126*r + 0.7152*g + 0.0722*b;
    return lum < 128 ? "#FFFFFF" : "#1A1A1A";
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center">
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!uid) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center">
          <p>Profile Not Found</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollableRef} className="min-h-screen bg-background" style={{ position: 'relative', overflowY: 'auto' }}>
      <Navigation />
      
      {/* Pull to refresh indicator */}
      {showPullIndicator && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: `${pullDistance}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'opacity 0.2s',
            opacity: pullDistance > 0 ? Math.min(pullDistance / 60, 1) : 0,
            zIndex: 10,
          }}
        >
          <RefreshCw className={`w-6 h-6 ${isRefreshing ? 'animate-spin' : ''}`} />
        </div>
      )}

      {/* Header Section with Background */}
      <div 
        className="relative w-full py-16 mb-8"
        style={{
          backgroundColor: headerBgColor,
          color: headerTextColor,
        }}
      >
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Avatar */}
            <div className="md:col-span-2 flex md:block justify-center">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-muted border-4" style={{ borderColor: headerTextColor }}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.display_name || 'User'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-16 h-16" style={{ color: headerTextColor }} />
                  </div>
                )}
              </div>
            </div>

            {/* Identity, bio, social, follows */}
            <div className="md:col-span-8 text-left">
              <h1 className="text-3xl font-bold">{profile?.display_name || profile?.username || 'User'}</h1>
              {profile?.username && <p className="text-sm opacity-80">@{profile.username}</p>}
              {profile?.bio && (
                <p className="mt-2 opacity-90 max-w-2xl">{profile.bio}</p>
              )}

              {(profile?.social_media_links || profile?.website_url) && (
                <div className="flex flex-wrap gap-3 mt-3">
                  {profile.website_url && (
                    <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">
                      <Globe className="w-5 h-5" />
                    </a>
                  )}
                  {profile.social_media_links && Object.entries(profile.social_media_links).map(([platform, url]: [string, any]) => {
                    const Icon = getSocialMediaIcon(platform);
                    return url ? (
                      <a key={platform} href={url} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">
                        <Icon className="w-5 h-5" />
                      </a>
                    ) : null;
                  })}
                </div>
              )}

              <div className="flex gap-4 mt-4">
                <FollowersDialog userId={uid} type="followers" count={followersCount} />
                <FollowersDialog userId={uid} type="following" count={followingCount} />
              </div>
            </div>

            {/* Settings */}
            <div className="md:col-span-2 flex md:justify-end justify-center">
              <Link to="/settings">
                <Button variant="outline" style={{ borderColor: headerTextColor, color: headerTextColor }}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-8">
        {/* Reading Statistics */}
        <Card className="mb-6" style={{ backgroundColor: accentCardColor, color: accentTextColor }}>
          <CardHeader>
            <CardTitle style={{ color: accentTextColor }}>Reading Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-2xl font-bold">{bookStats.totalBooks}</p>
                <p className="text-sm opacity-80">Total Books</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{bookStats.completedBooks}</p>
                <p className="text-sm opacity-80">Completed</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{bookStats.inProgressBooks}</p>
                <p className="text-sm opacity-80">In Progress</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{bookStats.completedThisYear}</p>
                <p className="text-sm opacity-80">This Year</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Favorite Book */}
        {favoriteBook && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Favorite Book</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {favoriteBook.cover_url ? (
                  <img src={favoriteBook.cover_url} alt={favoriteBook.title} className="w-20 h-28 object-cover rounded" />
                ) : (
                  <div className="w-20 h-28 bg-muted rounded flex items-center justify-center">
                    <BookOpen className="w-8 h-8" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold">{favoriteBook.title}</h3>
                  <p className="text-sm text-muted-foreground">{favoriteBook.author}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Currently Reading */}
        {currentBook && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Currently Reading</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                {currentBook.cover_url ? (
                  <img src={currentBook.cover_url} alt={currentBook.title} className="w-20 h-28 object-cover rounded" />
                ) : (
                  <div className="w-20 h-28 bg-muted rounded flex items-center justify-center">
                    <BookOpen className="w-8 h-8" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold">{currentBook.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{currentBook.author}</p>
                  <Progress value={(currentBook.current_page / currentBook.total_pages) * 100} />
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentBook.current_page} / {currentBook.total_pages} pages
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Books */}
        {topFiveBooks.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Top Books</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {topFiveBooks.slice(0, 5).map((book, index) => (
                  <div key={book.id} className="text-center">
                    {book.cover_url ? (
                      <img src={book.cover_url} alt={book.title} className="w-full h-40 object-cover rounded mb-2" />
                    ) : (
                      <div className="w-full h-40 bg-muted rounded flex items-center justify-center mb-2">
                        <BookOpen className="w-8 h-8" />
                      </div>
                    )}
                    <p className="text-xs font-semibold truncate">{book.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                  </div>
                ))}
              </div>
              {topFiveBooks.length > 5 && (
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => setShowTopTenDialog(true)}
                >
                  View All {topFiveBooks.length} Books
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Reading Goals */}
        <div className="mb-6">
          <HomeReadingGoals userId={uid} completedBooksThisYear={bookStats.completedThisYear} />
        </div>

        {/* Activity Feed */}
        {activityFeed.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {activityFeed.slice(0, 10).map((item) => (
                  <AccordionItem key={item.id} value={item.id}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-3">
                        {item.kind === "progress" ? (
                          <BookOpen className="w-4 h-4" />
                        ) : (
                          <Star className="w-4 h-4" />
                        )}
                        <span className="text-sm">
                          {item.kind === "progress" 
                            ? `Read ${item.book_title}`
                            : `Reviewed ${item.book_title}`
                          }
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex gap-3 pt-2">
                        {item.book_cover_url && (
                          <img src={item.book_cover_url} alt={item.book_title || ''} className="w-12 h-16 object-cover rounded" />
                        )}
                        <div>
                          <p className="font-medium">{item.book_title}</p>
                          <p className="text-sm text-muted-foreground">{item.book_author}</p>
                          {item.kind === "progress" && (
                            <p className="text-sm mt-1">
                              Pages {item.from_page} → {item.to_page}
                            </p>
                          )}
                          {item.kind === "review" && (
                            <>
                              <div className="flex gap-1 mt-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${i < item.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                                  />
                                ))}
                              </div>
                              {item.review && <p className="text-sm mt-2">{item.review}</p>}
                            </>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}
      </div>

      <TopTenDialog 
        open={showTopTenDialog} 
        onOpenChange={setShowTopTenDialog} 
        books={topFiveBooks} 
        accentCardColor={accentCardColor}
        accentTextColor={accentTextColor}
      />
    </div>
  );
}