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
  total_pages: number;
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
          .select("id, username, display_name, avatar_url, color_palette")
          .eq("username", username)
          .maybeSingle();

        if (profileError || !profileData) {
          setLoading(false);
          return;
        }

        setProfile(profileData);

        // Fetch completed books
        const { data: books, error: booksError } = await supabase
          .from("books")
          .select("id, title, author, cover_url, finished_at, total_pages, current_page, status")
          .eq("user_id", profileData.id)
          .order("finished_at", { ascending: false });

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

  const filteredBooks = completedBooks
    .filter(book =>
      !searchQuery.trim() ||
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent-desc':
          return (b.finished_at ? new Date(b.finished_at).getTime() : 0) - (a.finished_at ? new Date(a.finished_at).getTime() : 0);
        case 'recent-asc':
          return (a.finished_at ? new Date(a.finished_at).getTime() : 0) - (b.finished_at ? new Date(b.finished_at).getTime() : 0);
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
    <UserColorProvider userColorPalette={colorPalette}>
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
                <SelectItem value="recent-desc">Newest First</SelectItem>
                <SelectItem value="recent-asc">Oldest First</SelectItem>
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
                            <h3 className="font-medium text-sm text-foreground line-clamp-2">{book.title}</h3>
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
                              Finished {new Date(book.finished_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
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
