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
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold">Profile</h1>
      </div>
      <TopTenDialog 
        open={showTopTenDialog} 
        onOpenChange={setShowTopTenDialog} 
        books={topFiveBooks} 
        accentCardColor={accentCardColor}
        accentTextColor={accentTextColor}
      />
      <FollowersDialog 
        userId={uid || ''}
        type="followers"
        count={followersCount}
      />
      <FollowersDialog 
        userId={uid || ''}
        type="following"
        count={followingCount}
      />
    </div>
  );
}