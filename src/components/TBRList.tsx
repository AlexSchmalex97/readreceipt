import { useState, useEffect } from "react";
import { BookPlus, Search, Star, Trash2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  onAddToCurrentlyReading?: (book: { title: string; author: string; totalPages: number }) => void;
}

export function TBRList({ userId, onAddToCurrentlyReading }: TBRListProps) {
  const [tbrBooks, setTbrBooks] = useState<TBRBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newBook, setNewBook] = useState({
    title: "",
    author: "",
    total_pages: "",
    notes: "",
    priority: "0"
  });
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      fetchTBRBooks();
    } else {
      setLoading(false);
    }
  }, [userId]);

  const fetchTBRBooks = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from("tbr_books")
        .select("*")
        .eq("user_id", userId)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      setTbrBooks(data || []);
    } catch (error) {
      console.error("Error fetching TBR books:", error);
      toast({
        title: "Error",
        description: "Failed to load your TBR list",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddBook = async () => {
    if (!userId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to add books to your TBR list",
        variant: "destructive"
      });
      return;
    }

    if (!newBook.title.trim() || !newBook.author.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both title and author",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("tbr_books")
        .insert([{
          user_id: userId,
          title: newBook.title.trim(),
          author: newBook.author.trim(),
          total_pages: newBook.total_pages ? parseInt(newBook.total_pages) : null,
          notes: newBook.notes.trim() || null,
          priority: parseInt(newBook.priority)
        }])
        .select()
        .single();

      if (error) throw error;

      setTbrBooks(prev => [data, ...prev]);
      setNewBook({ title: "", author: "", total_pages: "", notes: "", priority: "0" });
      setShowAddDialog(false);
      
      toast({
        title: "Book added!",
        description: "Added to your TBR list"
      });
    } catch (error) {
      console.error("Error adding book:", error);
      toast({
        title: "Error",
        description: "Failed to add book to TBR list",
        variant: "destructive"
      });
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("tbr_books")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setTbrBooks(prev => prev.filter(book => book.id !== id));
      toast({
        title: "Book removed",
        description: "Removed from your TBR list"
      });
    } catch (error) {
      console.error("Error deleting book:", error);
      toast({
        title: "Error",
        description: "Failed to remove book",
        variant: "destructive"
      });
    }
  };

  const handleMoveToCurrentlyReading = async (book: TBRBook) => {
    if (!userId || !onAddToCurrentlyReading) return;

    // Add to currently reading books
    onAddToCurrentlyReading({
      title: book.title,
      author: book.author,
      totalPages: book.total_pages || 100
    });

    // Remove from TBR
    await handleDeleteBook(book.id);
  };

  const filteredBooks = tbrBooks.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPriorityBadge = (priority: number) => {
    switch (priority) {
      case 2:
        return <Badge variant="destructive">High</Badge>;
      case 1:
        return <Badge variant="secondary">Medium</Badge>;
      default:
        return <Badge variant="outline">Low</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookPlus className="w-5 h-5" />
            TBR List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookPlus className="w-5 h-5" />
            TBR List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Sign in to manage your To Be Read list</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookPlus className="w-5 h-5" />
          TBR List ({tbrBooks.length})
        </CardTitle>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <BookPlus className="w-4 h-4 mr-2" />
                Add Book
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Book to TBR</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={newBook.title}
                    onChange={(e) => setNewBook(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter book title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="author">Author *</Label>
                  <Input
                    id="author"
                    value={newBook.author}
                    onChange={(e) => setNewBook(prev => ({ ...prev, author: e.target.value }))}
                    placeholder="Enter author name"
                  />
                </div>

                <div>
                  <Label htmlFor="pages">Total Pages</Label>
                  <Input
                    id="pages"
                    type="number"
                    value={newBook.total_pages}
                    onChange={(e) => setNewBook(prev => ({ ...prev, total_pages: e.target.value }))}
                    placeholder="Enter total pages (optional)"
                  />
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={newBook.priority} onValueChange={(value) => setNewBook(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Low</SelectItem>
                      <SelectItem value="1">Medium</SelectItem>
                      <SelectItem value="2">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newBook.notes}
                    onChange={(e) => setNewBook(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add any notes about this book (optional)"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddBook}>Add Book</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {filteredBooks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? "No books found matching your search" : "Your TBR list is empty. Add some books!"}
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredBooks.map((book) => (
              <div key={book.id} className="flex items-start justify-between p-3 border rounded-lg bg-card/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-1">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm leading-tight">{book.title}</h4>
                      <p className="text-xs text-muted-foreground">by {book.author}</p>
                    </div>
                    {getPriorityBadge(book.priority)}
                  </div>
                  {book.total_pages && (
                    <p className="text-xs text-muted-foreground">{book.total_pages} pages</p>
                  )}
                  {book.notes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{book.notes}</p>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                  {onAddToCurrentlyReading && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleMoveToCurrentlyReading(book)}
                      title="Start reading"
                    >
                      <BookOpen className="w-3 h-3" />
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handleDeleteBook(book.id)}
                    title="Remove from TBR"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}