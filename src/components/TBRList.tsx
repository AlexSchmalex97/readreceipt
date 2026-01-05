import { useState, useEffect } from 'react';
import { Plus, Search, BookOpen, X, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { searchGoogleBooks, GoogleBookResult } from '@/lib/googleBooks';
import { BookEditionSelector } from '@/components/BookEditionSelector';
import { BookMoveMenu } from '@/components/BookMoveMenu';
import { useFollowedUserBooks } from '@/hooks/useFollowedUserBooks';
import { FollowedUsersBooksIndicator } from '@/components/FollowedUsersBooksIndicator';

interface TBRBook {
  id: string;
  title: string;
  author: string;
  total_pages?: number;
  notes?: string;
  priority: number;
  created_at: string;
  updated_at: string;
  cover_url?: string;
}

interface TBRListProps {
  userId: string | null;
  onMoveToReading?: (book: { title: string; author: string; totalPages: number; coverUrl?: string }) => void;
  onMoveToCompleted?: (tbrBookId: string) => void;
  onMoveToDNF?: (tbrBookId: string) => void;
  accentColor?: string;
  accentTextColor?: string;
}

export function TBRList({ userId, onMoveToReading, onMoveToCompleted, onMoveToDNF, accentColor, accentTextColor }: TBRListProps) {
  const [tbrBooks, setTbrBooks] = useState<TBRBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'author' | 'pages' | 'date_added' | 'priority'>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // Google Books search states
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [bookSearchResults, setBookSearchResults] = useState<GoogleBookResult[]>([]);
  const [isSearchingBooks, setIsSearchingBooks] = useState(false);
  const [selectedGoogleBook, setSelectedGoogleBook] = useState<GoogleBookResult | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    total_pages: '',
    notes: '',
    priority: 0
  });
  const { toast } = useToast();
  
  // Followed users books hook
  const { followedUserBooks, isLoading: isLoadingFollowed, searchFollowedUsersBooks, clearResults } = useFollowedUserBooks();

  // Search followed users when book search query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (bookSearchQuery.trim().length >= 2) {
        searchFollowedUsersBooks(bookSearchQuery);
      } else {
        clearResults();
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [bookSearchQuery, searchFollowedUsersBooks, clearResults]);

  // Also search when filtering existing TBR list
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchFollowedUsersBooks(searchQuery);
      } else {
        clearResults();
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchFollowedUsersBooks, clearResults]);

  // Load TBR books
  useEffect(() => {
    if (!userId) {
      setTbrBooks([]);
      setLoading(false);
      return;
    }

    const loadTBRBooks = async () => {
      try {
        const { data, error } = await supabase
          .from('tbr_books')
          .select('*')
          .eq('user_id', userId)
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTbrBooks(data || []);
      } catch (error) {
        console.error('Error loading TBR books:', error);
        toast({
          title: 'Error loading TBR list',
          description: 'Please try again',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadTBRBooks();
  }, [userId, toast]);

  // Google Books search
  const searchBooks = async () => {
    if (!bookSearchQuery.trim()) return;
    
    setIsSearchingBooks(true);
    try {
      const results = await searchGoogleBooks(bookSearchQuery);
      setBookSearchResults(results);
      
      if (results.length === 0) {
        toast({
          title: 'No books found',
          description: 'Try a different search term'
        });
      }
    } catch (error) {
      toast({
        title: 'Search failed',
        description: 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsSearchingBooks(false);
    }
  };

  const selectGoogleBook = (book: GoogleBookResult) => {
    console.log('Selecting Google Book:', book);
    setSelectedGoogleBook(book);
    setNewBook(prev => ({
      ...prev,
      title: book.title,
      author: book.authors?.join(', ') || 'Unknown Author',
      total_pages: book.pageCount?.toString() || ''
    }));
    // Clear search results and show the form
    setBookSearchResults([]);
    setBookSearchQuery('');
    console.log('selectedGoogleBook set, should show form now');
  };

  const handleAddBook = async () => {
    console.log('handleAddBook called', { userId, newBook, selectedGoogleBook });
    if (!userId || !newBook.title.trim() || !newBook.author.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please enter both title and author',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tbr_books')
        .insert([{
          user_id: userId,
          title: newBook.title.trim(),
          author: newBook.author.trim(),
          total_pages: newBook.total_pages ? parseInt(newBook.total_pages) : null,
          notes: newBook.notes.trim() || null,
          priority: newBook.priority,
          cover_url: selectedGoogleBook?.imageLinks?.thumbnail || null,
        }])
        .select()
        .single();

      if (error) throw error;

      setTbrBooks(prev => [data, ...prev]);
      resetForm();
      toast({
        title: 'Book added to TBR',
        description: `${newBook.title} has been added to your reading list`
      });
    } catch (error) {
      console.error('Error adding TBR book:', error);
      toast({
        title: 'Error adding book',
        description: 'Please try again',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveBook = async (bookId: string) => {
    try {
      const { error } = await supabase
        .from('tbr_books')
        .delete()
        .eq('id', bookId);

      if (error) throw error;

      setTbrBooks(prev => prev.filter(book => book.id !== bookId));
      toast({
        title: 'Book removed',
        description: 'Book has been removed from your TBR list'
      });
    } catch (error) {
      console.error('Error removing TBR book:', error);
      toast({
        title: 'Error removing book',
        description: 'Please try again',
        variant: 'destructive'
      });
    }
  };

  const handleMoveToReading = async (book: TBRBook) => {
    if (onMoveToReading) {
      onMoveToReading({
        title: book.title,
        author: book.author,
        totalPages: book.total_pages || 0,
        coverUrl: book.cover_url
      });
      await handleRemoveBook(book.id);
    }
  };

  const handleMoveToCompletedFromTBR = async (tbrBookId: string) => {
    if (onMoveToCompleted) {
      onMoveToCompleted(tbrBookId);
      await handleRemoveBook(tbrBookId);
    }
  };

  const handleMoveToDNFFromTBR = async (tbrBookId: string) => {
    if (onMoveToDNF) {
      onMoveToDNF(tbrBookId);
      await handleRemoveBook(tbrBookId);
    }
  };

  const resetForm = () => {
    setBookSearchQuery('');
    setBookSearchResults([]);
    setSelectedGoogleBook(null);
    setShowManualForm(false);
    setNewBook({ title: '', author: '', total_pages: '', notes: '', priority: 0 });
    clearResults();
    setShowAddDialog(false);
  };

  const sortedAndFilteredBooks = tbrBooks
    .filter(book =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'author':
          comparison = a.author.localeCompare(b.author);
          break;
        case 'pages':
          comparison = (a.total_pages || 0) - (b.total_pages || 0);
          break;
        case 'date_added':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'priority':
          comparison = b.priority - a.priority; // Higher priority first by default
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  if (!userId) {
    return (
      <div className="bg-card rounded-lg p-6 shadow-soft border border-border">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          To Be Read
        </h2>
        <p className="text-muted-foreground text-center py-8">
          Sign in to manage your TBR list
        </p>
      </div>
    );
  }

  return (
    <div 
      className="rounded-lg p-4 sm:p-6 shadow-soft border"
      style={{ 
        backgroundColor: accentColor || 'hsl(var(--card))',
        borderColor: accentColor || 'hsl(var(--border))'
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 
          className="text-lg sm:text-xl font-semibold flex items-center gap-2"
          style={{ color: accentTextColor || 'hsl(var(--foreground))' }}
        >
          <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
          To Be Read ({tbrBooks.length})
        </h2>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Book
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Book to TBR List</DialogTitle>
              <DialogDescription>
                Search for books using Google Books or add them manually to your To Be Read list.
              </DialogDescription>
            </DialogHeader>
            
            {!showManualForm && !selectedGoogleBook && (
              <div className="space-y-4">
                {/* Google Books Search */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Search for a book</label>
                  <div className="flex gap-2">
                    <Input
                      value={bookSearchQuery}
                      onChange={(e) => setBookSearchQuery(e.target.value)}
                      placeholder="Enter book title or author..."
                      onKeyDown={(e) => e.key === 'Enter' && searchBooks()}
                    />
                    <Button 
                      onClick={searchBooks} 
                      disabled={isSearchingBooks || !bookSearchQuery.trim()}
                      size="sm"
                    >
                      {isSearchingBooks ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Search Results */}
                {bookSearchResults.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    <label className="text-sm font-medium text-foreground">Search Results</label>
                    {bookSearchResults.map((book) => (
                      <Card 
                        key={book.id} 
                        className="p-3 cursor-pointer hover:bg-accent/10 transition-colors"
                        onClick={() => selectGoogleBook(book)}
                      >
                        <div className="flex gap-3">
                          {book.imageLinks?.thumbnail && (
                            <img 
                              src={book.imageLinks.thumbnail} 
                              alt={book.title}
                              className="w-12 h-16 object-contain rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{book.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {book.authors?.join(", ") || "Unknown Author"}
                            </p>
                            {book.pageCount && (
                              <p className="text-xs text-muted-foreground">{book.pageCount} pages</p>
                            )}
                            {book.publishedDate && (
                              <p className="text-xs text-muted-foreground">Published: {book.publishedDate}</p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Followed Users Books Indicator */}
                <FollowedUsersBooksIndicator 
                  followedUserBooks={followedUserBooks} 
                  isLoading={isLoadingFollowed} 
                />

                <div className="flex justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowManualForm(true)}
                    className="text-sm"
                  >
                    Can't find your book? Add manually
                  </Button>
                </div>
              </div>
            )}

            {(showManualForm || selectedGoogleBook) && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Title *</label>
                  <Input
                    value={newBook.title}
                    onChange={(e) => setNewBook(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter book title"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Author *</label>
                  <Input
                    value={newBook.author}
                    onChange={(e) => setNewBook(prev => ({ ...prev, author: e.target.value }))}
                    placeholder="Enter author name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Total Pages</label>
                  <Input
                    type="number"
                    value={newBook.total_pages}
                    onChange={(e) => setNewBook(prev => ({ ...prev, total_pages: e.target.value }))}
                    placeholder="Number of pages (optional)"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Notes</label>
                  <Textarea
                    value={newBook.notes}
                    onChange={(e) => setNewBook(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Why do you want to read this book? (optional)"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Priority</label>
                  <select
                    value={newBook.priority}
                    onChange={(e) => setNewBook(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                    className="w-full border border-border rounded-md px-3 py-2 bg-background"
                  >
                    <option value={0}>Normal</option>
                    <option value={1}>High</option>
                    <option value={2}>Very High</option>
                  </select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddBook}>
                    Add to TBR
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {tbrBooks.length > 0 && (
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your TBR list..."
              className="pl-10"
            />
          </div>
          
          {/* Sorting Controls */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-foreground">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-border rounded px-2 py-1 text-sm bg-background"
            >
              <option value="priority">Priority</option>
              <option value="title">Title</option>
              <option value="author">Author</option>
              <option value="pages">Page Count</option>
              <option value="date_added">Date Added</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="text-xs px-2 py-1 h-auto"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
          
          {/* Followed Users Books Indicator when searching */}
          {searchQuery.trim().length >= 2 && (
            <FollowedUsersBooksIndicator 
              followedUserBooks={followedUserBooks} 
              isLoading={isLoadingFollowed} 
            />
          )}
        </div>
      )}

      <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto lg:max-h-96">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading...
          </div>
        ) : sortedAndFilteredBooks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'No books match your search' : 'Your TBR list is empty'}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Small cover thumbnails row */}
            {sortedAndFilteredBooks.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                {sortedAndFilteredBooks.slice(0, 8).map((book) => (
                  <div key={`cover-${book.id}`} className="flex-shrink-0">
                    {book.cover_url ? (
                      <img 
                        src={book.cover_url} 
                        alt={book.title}
                        className="w-8 h-12 object-contain rounded shadow-sm"
                        title={`${book.title} by ${book.author}`}
                      />
                    ) : (
                      <div className="w-8 h-12 bg-muted rounded flex items-center justify-center shadow-sm" title={`${book.title} by ${book.author}`}>
                        <BookOpen className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {sortedAndFilteredBooks.length > 8 && (
                  <div className="flex-shrink-0 w-8 h-12 bg-muted/50 rounded flex items-center justify-center text-xs text-muted-foreground">
                    +{sortedAndFilteredBooks.length - 8}
                  </div>
                )}
              </div>
            )}
            
            {/* Book list */}
            {sortedAndFilteredBooks.map((book) => (
              <div key={book.id} className="border border-border rounded-lg p-3 hover:bg-accent/5 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 flex-1 min-w-0">
                    {/* Book Cover - always shown on the left */}
                    <div className="relative flex-shrink-0">
                      {book.cover_url ? (
                        <img 
                          src={book.cover_url} 
                          alt={book.title}
                          className="w-12 h-16 object-contain rounded shadow-sm"
                        />
                      ) : (
                        <div className="w-12 h-16 bg-muted rounded flex items-center justify-center shadow-sm">
                          <BookOpen className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      {/* Edition selector overlay */}
                      <div className="absolute -top-1 -right-1">
                        <BookEditionSelector
                          bookId={book.id}
                          bookTitle={book.title}
                          bookAuthor={book.author}
                          currentCoverUrl={book.cover_url}
                          table="tbr_books"
                          onCoverUpdate={(newCoverUrl) => {
                            setTbrBooks(prev => 
                              prev.map(b => 
                                b.id === book.id 
                                  ? { ...b, cover_url: newCoverUrl }
                                  : b
                              )
                            );
                          }}
                        />
                      </div>
                    </div>

                    {/* Book Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground truncate">{book.title}</h3>
                        {book.priority > 0 && (
                          <div className="flex">
                            {Array(book.priority).fill(0).map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">by {book.author}</p>
                      {book.total_pages && (
                        <p className="text-xs text-muted-foreground">{book.total_pages} pages</p>
                      )}
                      {book.notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{book.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {onMoveToCompleted && onMoveToDNF && (
                      <BookMoveMenu
                        bookId={book.id}
                        currentStatus="tbr"
                        onMoveToInProgress={() => handleMoveToReading(book)}
                        onMoveToCompleted={() => handleMoveToCompletedFromTBR(book.id)}
                        onMoveToDNF={() => handleMoveToDNFFromTBR(book.id)}
                        onMoveToTBR={() => {}}
                        showMoveToTBR={false}
                      />
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemoveBook(book.id)}
                      title="Remove from TBR"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}