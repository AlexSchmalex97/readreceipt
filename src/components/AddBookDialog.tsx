import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
}

interface AddBookDialogProps {
  onAddBook: (book: Omit<Book, "id" | "currentPage">) => void;
}

export const AddBookDialog = ({ onAddBook }: AddBookDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [totalPages, setTotalPages] = useState("");
  const { toast } = useToast();

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
    });

    // Reset form
    setTitle("");
    setAuthor("");
    setTotalPages("");
    setOpen(false);

    toast({
      title: "Book added successfully! 📚",
      description: "Time to start your reading journey!",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-soft">
          <Plus className="w-4 h-4 mr-2" />
          Add New Book
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] shadow-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold bg-gradient-primary bg-clip-text text-transparent">
            Add a New Book
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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
              onClick={() => setOpen(false)}
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
      </DialogContent>
    </Dialog>
  );
};