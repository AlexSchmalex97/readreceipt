import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Search, ImageIcon, Loader2 } from 'lucide-react';
import { searchGoogleBooks, GoogleBookResult } from '@/lib/googleBooks';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BookEditionSelectorProps {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  currentCoverUrl?: string;
  onCoverUpdate?: (newCoverUrl: string) => void;
  table?: 'books' | 'tbr_books';
}

export function BookEditionSelector({ 
  bookId, 
  bookTitle, 
  bookAuthor, 
  currentCoverUrl, 
  onCoverUpdate,
  table = 'books'
}: BookEditionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(`${bookTitle} ${bookAuthor}`);
  const [searchResults, setSearchResults] = useState<GoogleBookResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await searchGoogleBooks(searchQuery);
      setSearchResults(results);
      
      if (results.length === 0) {
        toast({
          title: 'No editions found',
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
      setIsSearching(false);
    }
  };

  const handleSelectEdition = async (edition: GoogleBookResult) => {
    if (!edition.imageLinks?.thumbnail) {
      toast({
        title: 'No cover available',
        description: 'This edition does not have a cover image',
        variant: 'destructive'
      });
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from(table)
        .update({ cover_url: edition.imageLinks.thumbnail })
        .eq('id', bookId);

      if (error) throw error;

      onCoverUpdate?.(edition.imageLinks.thumbnail);
      setIsOpen(false);
      toast({
        title: 'Cover updated',
        description: 'Book cover has been updated successfully'
      });
    } catch (error) {
      console.error('Error updating cover:', error);
      toast({
        title: 'Update failed',
        description: 'Failed to update book cover',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="p-1 h-auto"
          title="Change book cover"
        >
          <ImageIcon className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Book Edition</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for different editions..."
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button 
              onClick={handleSearch} 
              disabled={isSearching || !searchQuery.trim()}
              size="sm"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          {/* Current cover */}
          {currentCoverUrl && (
            <div className="border rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">Current Cover</h4>
              <div className="flex items-center gap-3">
                <img 
                  src={currentCoverUrl} 
                  alt="Current cover"
                  className="w-16 h-24 object-cover rounded shadow-sm"
                />
                <div>
                  <p className="text-sm font-medium">{bookTitle}</p>
                  <p className="text-sm text-muted-foreground">by {bookAuthor}</p>
                </div>
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Available Editions</h4>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {searchResults.map((edition) => (
                  <Card 
                    key={edition.id} 
                    className="p-3 cursor-pointer hover:bg-accent/10 transition-colors"
                    onClick={() => handleSelectEdition(edition)}
                  >
                    <div className="flex gap-3">
                      {edition.imageLinks?.thumbnail ? (
                        <img 
                          src={edition.imageLinks.thumbnail} 
                          alt={edition.title}
                          className="w-16 h-24 object-cover rounded shadow-sm flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-24 bg-muted rounded flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-sm truncate">{edition.title}</h5>
                        <p className="text-sm text-muted-foreground">
                          {edition.authors?.join(", ") || "Unknown Author"}
                        </p>
                        {edition.publisher && (
                          <p className="text-xs text-muted-foreground">
                            {edition.publisher}
                            {edition.publishedDate && ` • ${edition.publishedDate}`}
                          </p>
                        )}
                        {edition.pageCount && (
                          <p className="text-xs text-muted-foreground">{edition.pageCount} pages</p>
                        )}
                        {edition.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {edition.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {isUpdating && (
            <div className="text-center py-4">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Updating cover...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}