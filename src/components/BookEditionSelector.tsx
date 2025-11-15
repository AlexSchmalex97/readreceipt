import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, ImageIcon, Loader2, Upload } from 'lucide-react';
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
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${bookId}-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('book-covers')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('book-covers')
        .getPublicUrl(fileName);

      // Update book record
      const { error: updateError } = await supabase
        .from(table)
        .update({ cover_url: publicUrl })
        .eq('id', bookId);

      if (updateError) throw updateError;

      onCoverUpdate?.(publicUrl);
      setIsOpen(false);
      toast({
        title: 'Cover uploaded',
        description: 'Book cover has been uploaded successfully'
      });
    } catch (error: any) {
      console.error('Error uploading cover:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload book cover',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
          <DialogTitle>Change Book Cover</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Search Editions</TabsTrigger>
            <TabsTrigger value="upload">Upload Custom</TabsTrigger>
          </TabsList>
          
          <TabsContent value="search" className="space-y-4 mt-4">
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
                    className="w-16 h-24 object-contain rounded shadow-sm"
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
                            className="w-16 h-24 object-contain rounded shadow-sm flex-shrink-0"
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
          </TabsContent>

          <TabsContent value="upload" className="space-y-4 mt-4">
            {/* Current cover */}
            {currentCoverUrl && (
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2">Current Cover</h4>
                <div className="flex items-center gap-3">
                  <img 
                    src={currentCoverUrl} 
                    alt="Current cover"
                    className="w-16 h-24 object-contain rounded shadow-sm"
                  />
                  <div>
                    <p className="text-sm font-medium">{bookTitle}</p>
                    <p className="text-sm text-muted-foreground">by {bookAuthor}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Upload area */}
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h4 className="text-sm font-medium mb-2">Upload Custom Cover</h4>
              <p className="text-xs text-muted-foreground mb-4">
                PNG, JPG or WEBP (max 5MB)
              </p>
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                variant="outline"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {(isUpdating || isUploading) && (
          <div className="text-center py-4">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {isUpdating ? 'Updating cover...' : 'Uploading cover...'}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}