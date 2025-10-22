import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Settings, User, BookOpen, Star, Calendar, Globe, Facebook, Twitter, Instagram, Linkedin, Youtube, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HomeReadingGoals } from "@/components/HomeReadingGoals";

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
  const [bookStats, setBookStats] = useState<BookStats>({ totalBooks: 0, completedBooks: 0, inProgressBooks: 0 });
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [tbrBooks, setTbrBooks] = useState<TBRBook[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [favoriteBook, setFavoriteBook] = useState<FavoriteBook | null>(null);
  const [currentBook, setCurrentBook] = useState<CurrentBook | null>(null);
  const [zodiacSign, setZodiacSign] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      setLoading(true);
      
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
          email: user.email
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
          book.status !== 'dnf'
        ).length;
        
        setBookStats({ totalBooks, completedBooks, inProgressBooks });
        
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
    })();
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

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Navigation />
      
      <div className="container mx-auto px-3 sm:px-6 py-2 sm:py-6 max-w-7xl">
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

          {/* Header - Centered */}
          <div className="flex flex-col items-center text-center mb-4">
            {/* Profile Photo */}
            <div className="w-24 h-24 rounded-full overflow-hidden bg-muted border-2 border-border mb-3">
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
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

          {/* Links */}
          {((profile.social_media_links && Object.keys(profile.social_media_links).length > 0) || profile.website_url) && (
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
                >
                  <ExternalLink className="w-3 h-3" />
                  Website
                </a>
              )}
            </div>
          )}

          {/* Stats - Single Row */}
          <div className="grid grid-cols-3 gap-3 mb-4 max-w-md mx-auto">
            <Card>
              <CardContent className="p-3 text-center">
                <BookOpen className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold text-foreground">{bookStats.inProgressBooks}</p>
                <p className="text-xs text-muted-foreground">Reading</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <Star className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold text-foreground">{bookStats.completedBooks}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <BookOpen className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold text-foreground">{bookStats.totalBooks}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>
          </div>

          {/* Reading Goal */}
          <div className="mb-4 max-w-md mx-auto">
            <HomeReadingGoals userId={uid} completedBooksThisYear={bookStats.completedBooks} />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3 mb-6 max-w-sm mx-auto">
            <Link to="/">
              <Button variant="outline" size="sm" className="w-full">
                <BookOpen className="w-4 h-4 mr-2" />
                Reading
              </Button>
            </Link>
            <Link to="/completed">
              <Button variant="outline" size="sm" className="w-full">
                <Star className="w-4 h-4 mr-2" />
                Completed
              </Button>
            </Link>
          </div>

          {/* Collapsible Activity Sections - Mobile/Tablet */}
          <Accordion type="multiple" className="w-full space-y-2">
            {/* Recent Reviews */}
            <AccordionItem value="reviews" className="border rounded-lg px-3 bg-card">
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
                              className="w-8 h-11 object-cover rounded shadow-sm flex-shrink-0"
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
            <AccordionItem value="activity" className="border rounded-lg px-3 bg-card">
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
                                className="w-6 h-9 object-cover rounded shadow-sm flex-shrink-0"
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
                                className="w-6 h-9 object-cover rounded shadow-sm flex-shrink-0"
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
            <AccordionItem value="tbr" className="border rounded-lg px-3 bg-card">
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
                              className="w-8 h-11 object-cover rounded shadow-sm flex-shrink-0"
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
          {/* Header with Settings Button */}
          <div className="flex justify-between items-start mb-4 sm:mb-6">
            <div className="flex items-center gap-6 flex-1">
              {/* Profile Photo */}
              <div className="w-32 h-32 rounded-full overflow-hidden bg-muted border-2 border-border flex-shrink-0">
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
              
              {/* Left Column - Profile Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-5xl font-bold text-foreground">
                  {profile.display_name || "Reader"}
                </h1>
                <p className="text-lg text-muted-foreground mt-1">
                  @{profile.username || profile.id.slice(0, 8)}
                </p>
                {profile.bio && (
                  <p className="text-base text-foreground mt-2 max-w-2xl">{profile.bio}</p>
                )}
                <div className="flex items-center gap-4 mt-3">
                  <p className="text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Member since {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                  {zodiacSign && (
                    <p className="text-sm text-muted-foreground">
                      <Star className="w-4 h-4 inline mr-1" />
                      {zodiacSign}
                    </p>
                  )}
                </div>

                {/* Favorite Book and Current Read */}
                {(currentBook || favoriteBook) && (
                  <div className="mt-4 flex gap-4">
                    {favoriteBook && (
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-medium text-muted-foreground mb-2">Favorite Book</h3>
                        <div className="flex items-center gap-2 p-3 border rounded-lg h-full bg-card">
                          {favoriteBook.cover_url && (
                            <img
                              src={favoriteBook.cover_url}
                              alt={favoriteBook.title}
                              className="w-12 h-16 object-cover rounded flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="font-medium text-xs leading-tight line-clamp-2">
                              {favoriteBook.title}
                            </div>
                            <div className="text-[10px] text-muted-foreground line-clamp-1 mt-1">
                              {favoriteBook.author}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {currentBook && (
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-medium text-muted-foreground mb-2">Currently Reading</h3>
                        <div className="flex items-center gap-2 p-3 border rounded-lg h-full bg-card">
                          {currentBook.cover_url && (
                            <img
                              src={currentBook.cover_url}
                              alt={currentBook.title}
                              className="w-12 h-16 object-cover rounded flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="font-medium text-xs leading-tight line-clamp-2">{currentBook.title}</div>
                            <div className="text-[10px] text-muted-foreground line-clamp-1 mt-1">{currentBook.author}</div>
                            <div className="text-[10px] text-muted-foreground mt-1">
                              Page {currentBook.current_page} of {currentBook.total_pages}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Links */}
                {(profile.social_media_links && Object.keys(profile.social_media_links).length > 0) || profile.website_url ? (
                  <div className="mt-6">
                    <h3 className="text-xs font-medium text-muted-foreground mb-2">Links</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.social_media_links && Object.entries(profile.social_media_links as Record<string, string>).map(([platform, url]) => {
                        const Icon = getSocialMediaIcon(platform);
                        return (
                          <a
                            key={platform}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-2 py-1 text-xs border rounded-full hover:bg-accent transition-colors"
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
                          className="flex items-center gap-1.5 px-2 py-1 text-xs border rounded-full hover:bg-accent transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Website
                        </a>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Right Column - Reading Goal & Stats */}
              <div className="w-80 flex-shrink-0">
                {/* Reading Goals */}
                <div className="mb-3">
                  <HomeReadingGoals userId={uid} completedBooksThisYear={bookStats.completedBooks} />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <BookOpen className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-2xl font-bold text-foreground">{bookStats.inProgressBooks}</p>
                      <p className="text-[10px] text-muted-foreground">In Progress</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Star className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-2xl font-bold text-foreground">{bookStats.completedBooks}</p>
                      <p className="text-[10px] text-muted-foreground">Completed</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <BookOpen className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-2xl font-bold text-foreground">{bookStats.totalBooks}</p>
                      <p className="text-[10px] text-muted-foreground">Total Books</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
            
            <Link to="/profile/settings" className="ml-4">
              <Button variant="outline" className="gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3 mb-4 justify-center">
            <Link to="/">
              <Button variant="outline" size="sm">
                <BookOpen className="w-4 h-4 mr-2" />
                View Books
              </Button>
            </Link>
            <Link to="/completed">
              <Button variant="outline" size="sm">
                <Star className="w-4 h-4 mr-2" />
                Completed Books
              </Button>
            </Link>
          </div>

          {/* Three Column Layout: Recent Reviews - Activity Feed - TBR List */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Recent Reviews */}
            <Card>
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
                              className="w-10 h-14 object-cover rounded shadow-sm flex-shrink-0"
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
            <Card>
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
                                className="w-8 h-12 object-cover rounded shadow-sm flex-shrink-0"
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
                                className="w-8 h-12 object-cover rounded shadow-sm flex-shrink-0"
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
            <Card>
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
                              className="w-10 h-14 object-cover rounded shadow-sm flex-shrink-0"
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
  );
}