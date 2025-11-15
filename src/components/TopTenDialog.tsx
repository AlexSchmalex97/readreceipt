import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen } from "lucide-react";

type Book = {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
};

type TopTenDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  books: Book[];
  accentCardColor?: string;
  accentTextColor?: string;
};

export function TopTenDialog({ open, onOpenChange, books, accentCardColor, accentTextColor }: TopTenDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Top Ten Books</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-5 gap-4 mt-4">
          {books.map((book, index) => (
            <div key={book.id} className="flex-shrink-0">
              <div className="relative">
                <div 
                  className="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10" 
                  style={{ 
                    backgroundColor: accentCardColor || 'hsl(var(--primary))', 
                    color: accentTextColor || 'hsl(var(--primary-foreground))' 
                  }}
                >
                  {index + 1}
                </div>
                {book.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    className="w-full h-40 object-cover rounded shadow-md"
                  />
                ) : (
                  <div className="w-full h-40 bg-muted rounded flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <p className="text-xs mt-2 text-center truncate font-medium">{book.title}</p>
              <p className="text-xs text-center truncate text-muted-foreground">{book.author}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
