import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { BookOpen, GripVertical, X, Search } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Book = {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
};

type SortableBookProps = {
  book: Book;
  onRemove: () => void;
};

function SortableBook({ book, onRemove }: SortableBookProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: book.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </div>
      {book.cover_url ? (
        <img src={book.cover_url} alt={book.title} className="w-12 h-16 object-cover rounded shadow-sm" />
      ) : (
        <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{book.title}</div>
        <div className="text-xs text-muted-foreground truncate">{book.author}</div>
      </div>
      <Button variant="ghost" size="icon" onClick={onRemove}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

type TopFiveBooksDialogProps = {
  children: React.ReactNode;
  currentTopFive: string[];
  onSave: () => void;
};

export function TopFiveBooksDialog({ children, currentTopFive, onSave }: TopFiveBooksDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<Book[]>([]);
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (open) {
      loadBooks();
      setSearchQuery("");
    }
  }, [open]);

  useEffect(() => {
    // Filter books based on search query
    if (searchQuery.trim() === "") {
      setFilteredBooks(availableBooks);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredBooks(
        availableBooks.filter(
          (book) =>
            book.title.toLowerCase().includes(query) ||
            book.author.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, availableBooks]);

  const loadBooks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load selected books
      if (currentTopFive.length > 0) {
        const { data: topFiveData } = await supabase
          .from('books')
          .select('id, title, author, cover_url')
          .in('id', currentTopFive);

        if (topFiveData) {
          // Order books according to currentTopFive array
          const orderedBooks = currentTopFive
            .map(id => topFiveData.find(book => book.id === id))
            .filter(Boolean) as Book[];
          setSelectedBooks(orderedBooks);
        }
      }

      // Load all completed books for selection
      const { data: userBooks } = await supabase
        .from('books')
        .select('id, title, author, cover_url, current_page, total_pages, status, finished_at, created_at')
        .eq('user_id', user.id)
        .order('finished_at', { ascending: false });

      if (userBooks) {
        // Consider a book completed if status is 'completed' OR current_page >= total_pages
        const completedBooks = userBooks.filter((b: any) => (b.status === 'completed') || (b.current_page >= b.total_pages));
        // Filter out already selected books and map to minimal fields
        const available = completedBooks
          .filter((book: any) => !currentTopFive.includes(book.id))
          .map((b: any) => ({ id: b.id, title: b.title, author: b.author, cover_url: b.cover_url }));
        setAvailableBooks(available);
      }
    } catch (error) {
      console.error('Error loading books:', error);
      toast({
        title: "Error",
        description: "Failed to load books",
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSelectedBooks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddBook = (book: Book) => {
    if (selectedBooks.length >= 5) {
      toast({
        title: "Limit reached",
        description: "You can only select up to 5 books",
        variant: "destructive",
      });
      return;
    }

    setSelectedBooks([...selectedBooks, book]);
    setAvailableBooks(availableBooks.filter(b => b.id !== book.id));
  };

  const handleRemoveBook = (bookId: string) => {
    const book = selectedBooks.find(b => b.id === bookId);
    if (book) {
      setSelectedBooks(selectedBooks.filter(b => b.id !== bookId));
      setAvailableBooks([book, ...availableBooks]);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const bookIds = selectedBooks.map(book => book.id);

      const { error } = await supabase
        .from('profiles')
        .update({ top_five_books: bookIds })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Top Five books updated successfully",
      });

      setOpen(false);
      onSave();
    } catch (error) {
      console.error('Error saving top five:', error);
      toast({
        title: "Error",
        description: "Failed to save top five books",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Top Five Books</DialogTitle>
          <DialogDescription>
            Select and order your top 5 favorite books. Drag to reorder.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selected Books */}
          <div>
            <h3 className="font-medium mb-3">
              Your Top Five ({selectedBooks.length}/5)
            </h3>
            {selectedBooks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No books selected yet</p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={selectedBooks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {selectedBooks.map((book) => (
                      <SortableBook key={book.id} book={book} onRemove={() => handleRemoveBook(book.id)} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Available Books */}
          <div>
            <h3 className="font-medium mb-3">
              {selectedBooks.length >= 5 ? 'Completed Books (Remove a book to add another)' : 'Add from Completed Books'}
            </h3>
            {availableBooks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
                <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No completed books available</p>
                <p className="text-xs mt-1">Mark some books as completed to add them here</p>
              </div>
            ) : (
              <>
                {/* Search Bar */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title or author..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {filteredBooks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No books match your search</p>
                    </div>
                  ) : (
                    filteredBooks.map((book) => (
                      <div key={book.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
                        {book.cover_url ? (
                          <img src={book.cover_url} alt={book.title} className="w-12 h-16 object-cover rounded shadow-sm" />
                        ) : (
                          <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{book.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{book.author}</div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleAddBook(book)}
                          disabled={selectedBooks.length >= 5}
                        >
                          Add
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
