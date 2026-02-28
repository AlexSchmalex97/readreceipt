import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { UserColorProvider } from "@/components/UserColorProvider";
import { ArrowLeft, BookOpen, Star, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddToMyListButton } from "@/components/AddToMyListButton";

interface TBRBook {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  total_pages: number | null;
  notes: string | null;
  priority: number;
  created_at: string;
}

interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  color_palette: any;
  background_type?: string | null;
  active_background_id?: string | null;
  background_image_url?: string | null;
  background_tint?: any;
}

export default function UserTBRBooks() {
  const { username } = useParams<{ username: string }>();
  const [searchParams] = useSearchParams();
  const highlightBook = searchParams.get('book');
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tbrBooks, setTbrBooks] = useState<TBRBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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

        // Fetch TBR books
        const { data: books, error: booksError } = await supabase
          .from("tbr_books")
          .select("id, title, author, cover_url, total_pages, notes, priority, created_at, published_year")
          .eq("user_id", profileData.id)
          .order("priority", { ascending: false })
          .order("created_at", { ascending: false });

        if (booksError) {
          console.error("Error fetching TBR books:", booksError);
        }

        setTbrBooks(books || []);
      } catch (error) {
        console.error("Error loading user TBR books:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [username]);

  const filteredBooks = tbrBooks.filter(book =>
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
                To Be Read
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
              placeholder="Search TBR books..."
              className="pl-10"
            />
          </div>

          {/* Results count */}
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery.trim() 
              ? `${filteredBooks.length} of ${tbrBooks.length} books match "${searchQuery}"`
              : `${tbrBooks.length} books on TBR`
            }
          </p>

          {/* Books Grid */}
          {filteredBooks.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery.trim() ? 'No books match your search' : 'No books in TBR list'}
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
                          <div className="flex items-start gap-1.5 mb-1">
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-medium text-sm text-foreground line-clamp-2">{book.title}{(book as any).published_year ? ` (${(book as any).published_year})` : ''}</h3>
                                {book.priority > 0 && (
                                  <div className="flex shrink-0">
                                    {Array(book.priority).fill(0).map((_, i) => (
                                      <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            {myUserId && myUserId !== profile?.id && (
                              <AddToMyListButton 
                                book={book} 
                                variant="icon"
                              />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">by {book.author}</p>
                          
                          {book.total_pages && (
                            <p className="text-xs text-muted-foreground mb-1">{book.total_pages} pages</p>
                          )}
                          
                          {book.notes && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{book.notes}</p>
                          )}
                          
                          <p className="text-xs text-muted-foreground">
                            Added {(() => {
                              const d = /^\d{4}-\d{2}-\d{2}$/.test(book.created_at)
                                ? new Date(book.created_at + "T00:00:00")
                                : new Date(book.created_at);
                              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                            })()}
                          </p>
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
