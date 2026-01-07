import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { UserColorProvider } from "@/components/UserColorProvider";
import { ArrowLeft, BookOpen, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AddToMyListButton } from "@/components/AddToMyListButton";

interface InProgressBook {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  current_page: number;
  total_pages: number;
  started_at: string | null;
}

interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  color_palette: any;
  top_five_books: any;
}

export default function UserInProgressBooks() {
  const { username } = useParams<{ username: string }>();
  const [searchParams] = useSearchParams();
  const highlightBook = searchParams.get('book');
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [inProgressBooks, setInProgressBooks] = useState<InProgressBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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
        // Fetch user profile including top_five_books
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, color_palette, top_five_books")
          .eq("username", username)
          .maybeSingle();

        if (profileError || !profileData) {
          setLoading(false);
          return;
        }

        setProfile(profileData);

        // Fetch in-progress books
        const { data: books, error: booksError } = await supabase
          .from("books")
          .select("id, title, author, cover_url, current_page, total_pages, started_at, status")
          .eq("user_id", profileData.id)
          .order("updated_at", { ascending: false });

        if (booksError) {
          console.error("Error fetching books:", booksError);
        }

        // Get the top five book IDs to exclude
        const topFiveIds = Array.isArray(profileData.top_five_books) 
          ? profileData.top_five_books 
          : [];

        const inProgress = (books || []).filter(book => 
          book.current_page < book.total_pages && 
          book.status !== 'completed' && 
          book.status !== 'dnf' &&
          !topFiveIds.includes(book.id) // Exclude top five books
        );

        setInProgressBooks(inProgress);
      } catch (error) {
        console.error("Error loading user in-progress books:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [username]);

  const filteredBooks = inProgressBooks.filter(book =>
    !searchQuery.trim() ||
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                Currently Reading
              </h1>
              <Link 
                to={`/${username}`} 
                className="text-sm text-muted-foreground hover:underline"
              >
                @{username}
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in-progress books..."
              className="pl-10"
            />
          </div>

          {/* Results count */}
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery.trim() 
              ? `${filteredBooks.length} of ${inProgressBooks.length} books match "${searchQuery}"`
              : `${inProgressBooks.length} books in progress`
            }
          </p>

          {/* Books Grid */}
          {filteredBooks.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery.trim() ? 'No books match your search' : 'No books currently being read'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBooks.map((book) => {
                const progress = book.total_pages > 0 
                  ? Math.round((book.current_page / book.total_pages) * 100) 
                  : 0;
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
                          
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Page {book.current_page} of {book.total_pages}</span>
                              <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-1.5" />
                          </div>
                          
                          {book.started_at && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Started {new Date(book.started_at).toLocaleDateString('en-US', { 
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
