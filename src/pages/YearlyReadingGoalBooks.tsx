import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { UserColorProvider } from "@/components/UserColorProvider";
import { ArrowLeft, BookOpen, Star, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AddToMyListButton } from "@/components/AddToMyListButton";

interface CompletedBookEntry {
  id: string;
  book_id: string;
  title: string;
  author: string;
  cover_url: string | null;
  finished_at: string | null;
  total_pages: number;
  published_year?: number | null;
  rating?: number;
  review?: string | null;
}

interface UserProfileData {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  color_palette: any;
}

const parseDate = (v?: string | null) => {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(v + "T00:00:00");
  return new Date(v);
};

export default function YearlyReadingGoalBooks() {
  const { username } = useParams<{ username?: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [booksByYear, setBooksByYear] = useState<Record<number, CompletedBookEntry[]>>({});
  const [years, setYears] = useState<number[]>([]);
  const [activeYear, setActiveYear] = useState<string>("");
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [backgroundTint, setBackgroundTint] = useState<{ color: string; opacity: number } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setMyUserId(data.session?.user?.id || null);
    });
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Resolve profile
        let profileData: any = null;
        if (username) {
          const { data } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url, color_palette, background_type, active_background_id, background_image_url, background_tint")
            .eq("username", username)
            .maybeSingle();
          profileData = data;
        } else {
          const { data: sessionData } = await supabase.auth.getSession();
          const uid = sessionData.session?.user?.id;
          if (!uid) {
            setLoading(false);
            return;
          }
          const { data } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url, color_palette, background_type, active_background_id, background_image_url, background_tint")
            .eq("id", uid)
            .maybeSingle();
          profileData = data;
        }

        if (!profileData) {
          setLoading(false);
          return;
        }
        setProfile(profileData);

        // Background
        if (profileData?.background_type === 'image' && profileData?.active_background_id) {
          const { data: bgData } = await supabase
            .from("saved_backgrounds")
            .select("image_url, tint_color, tint_opacity")
            .eq("id", profileData.active_background_id)
            .maybeSingle();
          if (bgData) {
            setBackgroundImageUrl(bgData.image_url);
            setBackgroundTint(bgData.tint_color && (bgData.tint_opacity as number) > 0
              ? { color: bgData.tint_color, opacity: bgData.tint_opacity as number }
              : null);
          }
        } else if (profileData?.background_image_url) {
          setBackgroundImageUrl(profileData.background_image_url);
          setBackgroundTint(profileData.background_tint ?? null);
        }

        // Fetch all books for user
        const { data: booksData } = await supabase
          .from("books")
          .select("id, title, author, cover_url, finished_at, completed_at, total_pages, current_page, status, created_at, updated_at, published_year")
          .eq("user_id", profileData.id);

        const allBooks = booksData || [];
        const bookMap: Record<string, any> = {};
        allBooks.forEach(b => { bookMap[b.id] = b; });

        // Fetch reading_entries (for re-reads)
        const { data: entriesData } = await supabase
          .from("reading_entries")
          .select("id, book_id, finished_at, status")
          .eq("user_id", profileData.id)
          .eq("status", "completed")
          .not("finished_at", "is", null);

        // Fetch reviews
        const bookIds = allBooks.map(b => b.id);
        let reviewsMap: Record<string, { rating: number; review: string | null }> = {};
        if (bookIds.length > 0) {
          const { data: reviews } = await supabase
            .from("reviews")
            .select("book_id, rating, review")
            .in("book_id", bookIds);
          (reviews || []).forEach((r: any) => {
            reviewsMap[r.book_id] = { rating: r.rating, review: r.review };
          });
        }

        // Group by year
        const byYear: Record<number, CompletedBookEntry[]> = {};
        const seenEntryBookByYear = new Map<number, Set<string>>();

        // From reading_entries
        (entriesData || []).forEach((e: any) => {
          const d = parseDate(e.finished_at);
          if (!d) return;
          const yr = d.getFullYear();
          const book = bookMap[e.book_id];
          if (!book) return;
          if (!byYear[yr]) byYear[yr] = [];
          if (!seenEntryBookByYear.has(yr)) seenEntryBookByYear.set(yr, new Set());
          seenEntryBookByYear.get(yr)!.add(e.book_id);
          byYear[yr].push({
            id: `entry-${e.id}`,
            book_id: e.book_id,
            title: book.title,
            author: book.author,
            cover_url: book.cover_url,
            finished_at: e.finished_at,
            total_pages: book.total_pages,
            published_year: book.published_year,
            rating: reviewsMap[e.book_id]?.rating,
            review: reviewsMap[e.book_id]?.review,
          });
        });

        // From books without matching entries in that year
        allBooks.forEach((b: any) => {
          if (b.status === 'dnf' || b.status === 'top_five') return;
          const completedFlag = b.status === 'completed' || (b.current_page ?? 0) >= (b.total_pages ?? 0);
          if (!completedFlag) return;
          let yr: number | null = null;
          if (b.finished_at) {
            const d = parseDate(b.finished_at);
            if (d) yr = d.getFullYear();
          } else if (b.status === 'completed' && b.created_at) {
            yr = new Date(b.created_at).getFullYear();
          }
          if (yr === null) return;
          if (seenEntryBookByYear.get(yr)?.has(b.id)) return;
          if (!byYear[yr]) byYear[yr] = [];
          byYear[yr].push({
            id: `book-${b.id}`,
            book_id: b.id,
            title: b.title,
            author: b.author,
            cover_url: b.cover_url,
            finished_at: b.finished_at,
            total_pages: b.total_pages,
            published_year: b.published_year,
            rating: reviewsMap[b.id]?.rating,
            review: reviewsMap[b.id]?.review,
          });
        });

        // Sort each year by finished_at desc
        Object.keys(byYear).forEach(k => {
          byYear[Number(k)].sort((a, b) => {
            const ta = parseDate(a.finished_at)?.getTime() ?? 0;
            const tb = parseDate(b.finished_at)?.getTime() ?? 0;
            return tb - ta;
          });
        });

        const sortedYears = Object.keys(byYear).map(Number).sort((a, b) => a - b);
        setBooksByYear(byYear);
        setYears(sortedYears);
        if (sortedYears.length > 0) {
          // Default to current year if present, else latest
          const currentYear = new Date().getFullYear();
          const initial = sortedYears.includes(currentYear) ? currentYear : sortedYears[sortedYears.length - 1];
          setActiveYear(String(initial));
        }
      } catch (err) {
        console.error("Error loading yearly reading goal books:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [username]);

  const colorPalette = profile?.color_palette || { name: 'default' };
  const accentCardColor = colorPalette.cardColor || 'hsl(var(--card))';
  const accentTextColor = colorPalette.textColor || 'hsl(var(--foreground))';

  const isOwnProfile = !username || (profile && myUserId === profile.id);
  const displayName = profile?.display_name || profile?.username || '';

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
          <p className="text-muted-foreground">Profile not found</p>
          <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const content = (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-6 pb-24 lg:pb-8">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5" style={{ color: accentTextColor }} />
            <div>
              <h1 className="text-2xl font-bold" style={{ color: accentTextColor }}>
                Yearly Reading Goal Books
              </h1>
              {!isOwnProfile && profile && (
                <Link
                  to={`/${profile.username}`}
                  className="text-sm text-muted-foreground hover:underline"
                >
                  @{profile.username}
                </Link>
              )}
              {isOwnProfile && displayName && (
                <p className="text-sm text-muted-foreground">Your reading history</p>
              )}
            </div>
          </div>
        </div>

        {years.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {isOwnProfile ? "You haven't completed any books yet." : `${displayName} hasn't completed any books yet.`}
            </p>
          </div>
        ) : (
          <Tabs value={activeYear} onValueChange={setActiveYear} className="w-full">
            <TabsList className="mb-4 flex-wrap h-auto">
              {years.map(yr => (
                <TabsTrigger key={yr} value={String(yr)}>
                  {yr}
                  <span className="ml-1.5 text-xs opacity-70">
                    ({booksByYear[yr]?.length ?? 0})
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {years.map(yr => {
              const list = booksByYear[yr] || [];
              return (
                <TabsContent key={yr} value={String(yr)}>
                  <p className="text-sm text-muted-foreground mb-4">
                    {list.length} {list.length === 1 ? 'book' : 'books'} completed in {yr}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {list.map((book) => (
                      <Card
                        key={book.id}
                        style={{ backgroundColor: accentCardColor }}
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
                                {myUserId && myUserId !== profile.id && (
                                  <AddToMyListButton
                                    book={{
                                      id: book.book_id,
                                      title: book.title,
                                      author: book.author,
                                      cover_url: book.cover_url,
                                      total_pages: book.total_pages,
                                    } as any}
                                    variant="icon"
                                  />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mb-1">by {book.author}</p>
                              {book.published_year && (
                                <p className="text-xs text-muted-foreground mb-2 opacity-65">({book.published_year})</p>
                              )}

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
                                    const d = parseDate(book.finished_at);
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
                    ))}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </main>
    </div>
  );

  return (
    <UserColorProvider
      userColorPalette={colorPalette}
      backgroundImageUrl={backgroundImageUrl}
      backgroundTint={backgroundTint}
    >
      {content}
    </UserColorProvider>
  );
}
