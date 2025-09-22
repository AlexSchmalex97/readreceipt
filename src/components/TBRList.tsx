import { useState, useEffect } from 'react';
import { Plus, Search, BookOpen, X, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { searchGoogleBooks, GoogleBookResult } from '@/lib/googleBooks';

interface TBRBook {
  id: string;
  title: string;
  author: string;
  total_pages?: number;
  notes?: string;
  priority: number;
  created_at: string;
}

interface TBRListProps {
  userId: string | null;
  onMoveToReading?: (book: Omit<TBRBook, 'id' | 'priority' | 'notes' | 'created_at'>) => void;
}

export function TBRList({ userId, onMoveToReading }: TBRListProps) {
  const [tbrBooks, setTbrBooks] = useState<TBRBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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
    setSelectedGoogleBook(book);
    setNewBook(prev => ({
      ...prev,
      title: book.title,
      author: book.authors?.join(', ') || 'Unknown Author',
      total_pages: book.pageCount?.toString() || ''
    }));
  };

  const handleAddBook = async () => {
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
          priority: newBook.priority
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
        total_pages: book.total_pages || 0
      });
      await handleRemoveBook(book.id);
    }
  };

  const resetForm = () => {
    setBookSearchQuery('');
    setBookSearchResults([]);
    setSelectedGoogleBook(null);
    setShowManualForm(false);
    setNewBook({ title: '', author: '', total_pages: '', notes: '', priority: 0 });
    setShowAddDialog(false);
  };

  const filteredBooks = tbrBooks.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <div className="bg-card rounded-lg p-6 shadow-soft border border-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
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
                              className="w-12 h-16 object-cover rounded"
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

                <div className="flex justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowManualForm(true)}
                    className="text-sm"
                  >
                    Or add book manually
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
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your TBR list..."
              className="pl-10"
            />
          </div>
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading...
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'No books match your search' : 'Your TBR list is empty'}
          </div>
        ) : (
          filteredBooks.map((book) => (
            <div key={book.id} className="border border-border rounded-lg p-3 hover:bg-accent/5 transition-colors">
              <div className="flex items-start justify-between gap-3">
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
                <div className="flex gap-1">
                  {onMoveToReading && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMoveToReading(book)}
                      title="Start reading this book"
                    >
                      <BookOpen className="w-3 h-3" />
                    </Button>
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
          ))
        )}
      </div>
    </div>
  );
}