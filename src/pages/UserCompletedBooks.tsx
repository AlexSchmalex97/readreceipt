import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { UserColorProvider } from "@/components/UserColorProvider";
import { ArrowLeft, BookOpen, Star, Search, ArrowUpDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddToMyListButton } from "@/components/AddToMyListButton";

interface CompletedBook {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  finished_at: string | null;
  completed_at?: string | null;
  total_pages: number;
  created_at?: string | null;
  updated_at?: string | null;
  rating?: number;
  review?: string | null;
}

interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  color_palette: any;
}

export default function UserCompletedBooks() {
  const { username } = useParams<{ username: string }>();
  const [searchParams] = useSearchParams();
  const highlightBook = searchParams.get('book');
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [completedBooks, setCompletedBooks] = useState<CompletedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent-desc' | 'recent-asc' | 'author' | 'title'>('recent-desc');
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [backgroundTint, setBackgroundTint] = useState<{ color: string; opacity: number } | null>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Get current user ID
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setMyUserId(data.session?.user?.id || null);
    });
  }, []);

  // Scroll to highlighted book
  useEffect(() => {
    if (highlightBook && highlightRef.current && !loading) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [highlightBook, loading]);

  useEffect(() => {
    if (!username) return;

    (async () => {
      try {
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, color_palette, background_type, active_background_id, background_image_url, background_tint")
          .eq("username", username)
          .maybeSingle();

        if (profileError || !profileData) {
          setLoading(false);
          return;
        }

        setProfile(profileData);

        // Load background settings so visitors see the user's background too
        if ((profileData as any)?.background_type === 'image' && (profileData as any)?.active_background_id) {
          const { data: bgData } = await supabase
            .from("saved_backgrounds")
            .select("image_url, tint_color, tint_opacity")
            .eq("id", (profileData as any).active_background_id)
            .maybeSingle();

          if (bgData) {
            setBackgroundImageUrl(bgData.image_url);
            setBackgroundTint(bgData.tint_color && (bgData.tint_opacity as number) > 0
              ? { color: bgData.tint_color, opacity: bgData.tint_opacity as number }
              : null
            );
          } else {
            setBackgroundImageUrl(null);
            setBackgroundTint(null);
          }
        } else if ((profileData as any)?.background_image_url) {
          setBackgroundImageUrl((profileData as any).background_image_url);
          setBackgroundTint(((profileData as any).background_tint as any) ?? null);
        } else {
          setBackgroundImageUrl(null);
          setBackgroundTint(null);
        }

        // Fetch completed books
        const { data: books, error: booksError } = await supabase
          .from("books")
          .select("id, title, author, cover_url, finished_at, completed_at, total_pages, current_page, status, created_at, updated_at, published_year")
          .eq("user_id", profileData.id)
          .order("completed_at", { ascending: false, nullsFirst: false })
          .order("finished_at", { ascending: false })
          .order("updated_at", { ascending: false });

        if (booksError) {
          console.error("Error fetching books:", booksError);
        }

        const completed = (books || []).filter(book => 
          book.status === 'completed' || book.current_page >= book.total_pages
        );

        // Fetch reviews for completed books
        const bookIds = completed.map(b => b.id);
        let reviewsMap: Record<string, { rating: number; review: string | null }> = {};
        
        if (bookIds.length > 0) {
          const { data: reviews } = await supabase
            .from("reviews")
            .select("book_id, rating, review")
            .in("book_id", bookIds);

          (reviews || []).forEach(r => {
            reviewsMap[r.book_id] = { rating: r.rating, review: r.review };
          });
        }

        const completedWithReviews: CompletedBook[] = completed.map(book => ({
          ...book,
          rating: reviewsMap[book.id]?.rating,
          review: reviewsMap[book.id]?.review,
        }));

        setCompletedBooks(completedWithReviews);
      } catch (error) {
        console.error("Error loading user completed books:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [username]);

  const parseFinishedAt = (v?: string | null) => {
    if (!v) return null;
    // Treat Supabase date-only strings (YYYY-MM-DD) as local dates to avoid timezone shifts.
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(v + "T00:00:00");
    return new Date(v);
  };

  const filteredBooks = completedBooks
    .filter(book =>
      !searchQuery.trim() ||
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent-desc': {
          // First compare by finished_at date (day-level)
          const ta = parseFinishedAt(a.finished_at)?.getTime() ?? 0;
          const tb = parseFinishedAt(b.finished_at)?.getTime() ?? 0;
          if (tb !== ta) return tb - ta;
          // For same-day completions, use completed_at timestamp for precise ordering
          const ca = a.completed_at ? new Date(a.completed_at).getTime() : 0;
          const cb = b.completed_at ? new Date(b.completed_at).getTime() : 0;
          if (cb !== ca) return cb - ca;
          // Final fallback to updated_at/created_at
          const ua = a.updated_at ? new Date(a.updated_at).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
          const ub = b.updated_at ? new Date(b.updated_at).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
          return ub - ua;
        }
        case 'recent-asc': {
          const ta = parseFinishedAt(a.finished_at)?.getTime() ?? 0;
          const tb = parseFinishedAt(b.finished_at)?.getTime() ?? 0;
          if (ta !== tb) return ta - tb;
          // For same-day completions, use completed_at timestamp for precise ordering
          const ca = a.completed_at ? new Date(a.completed_at).getTime() : 0;
          const cb = b.completed_at ? new Date(b.completed_at).getTime() : 0;
          if (ca !== cb) return ca - cb;
          const ua = a.updated_at ? new Date(a.updated_at).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
          const ub = b.updated_at ? new Date(b.updated_at).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
          return ua - ub;
        }
        case 'author':
          return a.author.localeCompare(b.author);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  // Extract colors from palette
  const colorPalette = profile?.color_palette || { name: 'default' };
  const accentCardColor = colorPalette.cardColor || 'hsl(var(--card))';
  const accentTextColor = colorPalette.textColor || 'hsl(var(--foreground))';

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="p-8 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="p-8 text-center">
          <p className="text-muted-foreground">User not found</p>
          <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <UserColorProvider userColorPalette={colorPalette} backgroundImageUrl={backgroundImageUrl} backgroundTint={backgroundTint}>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-6 pb-24 lg:pb-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(`/${username}`)}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: accentTextColor }}>
                Completed Books
              </h1>
              <Link 
                to={`/${username}`} 
                className="text-sm text-muted-foreground hover:underline"
              >
                @{username}
              </Link>
            </div>
          </div>

          {/* Search and Sort */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search completed books..."
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent-desc">Most Recently Completed</SelectItem>
                <SelectItem value="recent-asc">Earliest Completed</SelectItem>
                <SelectItem value="author">Author Name</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results count */}
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery.trim() 
              ? `${filteredBooks.length} of ${completedBooks.length} books match "${searchQuery}"`
              : `${completedBooks.length} completed books`
            }
          </p>

          {/* Books Grid */}
          {filteredBooks.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery.trim() ? 'No books match your search' : 'No completed books yet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBooks.map((book) => {
                const isHighlighted = highlightBook && book.title.toLowerCase().includes(highlightBook.toLowerCase());
                return (
                  <Card 
                    key={book.id} 
                    ref={isHighlighted ? highlightRef : undefined}
                    style={{ backgroundColor: accentCardColor }}
                    className={isHighlighted ? 'ring-2 ring-primary ring-offset-2' : ''}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        {book.cover_url ? (
                          <img 
                            src={book.cover_url} 
                            alt={book.title}
                            className="w-16 h-24 object-contain rounded shadow-sm flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-24 bg-muted rounded flex items-center justify-center shadow-sm flex-shrink-0">
                            <BookOpen className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <h3 className="font-medium text-sm text-foreground line-clamp-2">{book.title}{(book as any).published_year ? ` (${(book as any).published_year})` : ''}</h3>
                            {myUserId && myUserId !== profile?.id && (
                              <AddToMyListButton 
                                book={book} 
                                variant="icon"
                              />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">by {book.author}</p>
                          
                          {book.rating && (
                            <div className="flex items-center gap-1 mb-2">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-3 h-3 ${i < book.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`}
                                />
                              ))}
                            </div>
                          )}
                          
                          {book.finished_at && (
                            <p className="text-xs text-muted-foreground">
                              Finished {(() => {
                                const d = parseFinishedAt(book.finished_at);
                                return d
                                  ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                  : '';
                              })()}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </UserColorProvider>
  );
}
