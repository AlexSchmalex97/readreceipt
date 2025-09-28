import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { searchGoogleBooks, GoogleBookResult } from "@/lib/googleBooks";

interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
  coverUrl?: string;
}


interface AddBookDialogProps {
  onAddBook: (book: Omit<Book, "id" | "currentPage">) => void;
}

export const AddBookDialog = ({ onAddBook }: AddBookDialogProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GoogleBookResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBook, setSelectedBook] = useState<GoogleBookResult | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [totalPages, setTotalPages] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);
  const { toast } = useToast();

  const searchBooks = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const books = await searchGoogleBooks(searchQuery);
      setSearchResults(books);
      
      if (books.length === 0) {
        toast({
          title: "No books found",
          description: "Try a different search term",
        });
      }
    } catch (error) {
      toast({
        title: "Search failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const selectBook = (book: GoogleBookResult) => {
    setSelectedBook(book);
    setTitle(book.title);
    setAuthor(book.authors?.join(", ") || "Unknown Author");
    setTotalPages(book.pageCount?.toString() || "");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !author.trim() || !totalPages) {
      toast({
        title: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const pages = parseInt(totalPages);
    if (pages <= 0) {
      toast({
        title: "Please enter a valid number of pages",
        variant: "destructive",
      });
      return;
    }

    onAddBook({
      title: title.trim(),
      author: author.trim(),
      totalPages: pages,
      coverUrl: selectedBook?.imageLinks?.thumbnail,
    });

    // Reset form
    resetForm();

    toast({
      title: "Book added successfully! 📚",
      description: "Time to start your reading journey!",
    });
  };

  const resetForm = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedBook(null);
    setTitle("");
    setAuthor("");
    setTotalPages("");
    setShowManualForm(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-soft">
          <Plus className="w-4 h-4 mr-2" />
          Add New Book
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] shadow-card max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold bg-gradient-primary bg-clip-text text-transparent">
            Add a New Book
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {!showManualForm && !selectedBook && (
            <>
              {/* Search Section */}
              <div className="space-y-2">
                <Label htmlFor="search">Search for a book</Label>
                <div className="flex gap-2">
                  <Input
                    id="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter book title..."
                    className="focus:ring-primary"
                    onKeyDown={(e) => e.key === 'Enter' && searchBooks()}
                  />
                  <Button 
                    onClick={searchBooks} 
                    disabled={isSearching || !searchQuery.trim()}
                    className="bg-gradient-primary hover:opacity-90"
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <Label>Search Results</Label>
                  {searchResults.map((book) => (
                    <Card 
                      key={book.id} 
                      className="p-3 cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => selectBook(book)}
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
            </>
          )}

          {(showManualForm || selectedBook) && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Book Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter book title..."
                  className="focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="author">Author</Label>
                <Input
                  id="author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Enter author name..."
                  className="focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pages">Total Pages</Label>
                <Input
                  id="pages"
                  type="number"
                  value={totalPages}
                  onChange={(e) => setTotalPages(e.target.value)}
                  placeholder="Enter total pages..."
                  min="1"
                  className="focus:ring-primary"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-primary hover:opacity-90 transition-opacity"
                >
                  Add Book
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};