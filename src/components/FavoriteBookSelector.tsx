import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url?: string;
}

interface FavoriteBookSelectorProps {
  value?: string;
  onChange: (bookId?: string) => void;
  label?: string;
  placeholder?: string;
}

export const FavoriteBookSelector = ({ value, onChange, label = "Favorite Book", placeholder = "Select your favorite book..." }: FavoriteBookSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUserBooks();
  }, []);

  useEffect(() => {
    if (value && books.length > 0) {
      const book = books.find(b => b.id === value);
      setSelectedBook(book || null);
    }
  }, [value, books]);

  const fetchUserBooks = async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('books')
        .select('id, title, author, cover_url')
        .eq('user_id', user.user.id)
        .order('title');

      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (book: Book) => {
    setSelectedBook(book);
    onChange(book.id);
    setOpen(false);
  };

  const handleClear = () => {
    setSelectedBook(null);
    onChange(undefined);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {selectedBook ? (
                <span className="truncate">
                  {selectedBook.title} by {selectedBook.author}
                </span>
              ) : (
                placeholder
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder="Search books..." />
              <CommandList>
                <CommandEmpty>
                  {loading ? "Loading..." : "No books found."}
                </CommandEmpty>
                <CommandGroup>
                  {books.map((book) => (
                    <CommandItem
                      key={book.id}
                      value={`${book.title} ${book.author}`}
                      onSelect={() => handleSelect(book)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedBook?.id === book.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex items-center gap-3 flex-1">
                        {book.cover_url && (
                          <img
                            src={book.cover_url}
                            alt={book.title}
                            className="w-8 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{book.title}</div>
                          <div className="text-sm text-muted-foreground">{book.author}</div>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {selectedBook && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};