import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BookEditionSelector } from "@/components/BookEditionSelector";

interface BookEditDialogProps {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  totalPages: number;
  currentCoverUrl?: string;
  publishedYear?: number | null;
  onUpdate: () => void;
  triggerClassName?: string;
  triggerVariant?: "icon" | "button";
}

export const BookEditDialog = ({
  bookId,
  bookTitle,
  bookAuthor,
  totalPages,
  currentCoverUrl,
  publishedYear,
  onUpdate,
  triggerClassName,
  triggerVariant = "icon",
}: BookEditDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(bookTitle);
  const [author, setAuthor] = useState(bookAuthor);
  const [newTotalPages, setNewTotalPages] = useState(totalPages.toString());
  const [coverUrl, setCoverUrl] = useState(currentCoverUrl);
  const [newPublishedYear, setNewPublishedYear] = useState(publishedYear?.toString() || "");
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTitle(bookTitle);
      setAuthor(bookAuthor);
      setNewTotalPages(totalPages.toString());
      setCoverUrl(currentCoverUrl);
      setNewPublishedYear(publishedYear?.toString() || "");
    }
  }, [open, bookTitle, bookAuthor, totalPages, currentCoverUrl, publishedYear]);

  const handleSave = async () => {
    const pages = parseInt(newTotalPages, 10);
    
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a book title",
        variant: "destructive",
      });
      return;
    }

    if (!author.trim()) {
      toast({
        title: "Author required",
        description: "Please enter an author name",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(pages) || pages <= 0) {
      toast({
        title: "Invalid page count",
        description: "Please enter a valid number of pages",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      const yearVal = newPublishedYear.trim() ? parseInt(newPublishedYear, 10) : null;
      if (newPublishedYear.trim() && (isNaN(yearVal!) || yearVal! < 0 || yearVal! > new Date().getFullYear() + 1)) {
        toast({
          title: "Invalid year",
          description: "Please enter a valid publication year",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("books")
        .update({ 
          title: title.trim(),
          author: author.trim(),
          total_pages: pages,
          cover_url: coverUrl,
          published_year: yearVal,
        })
        .eq("id", bookId);

      if (error) throw error;

      toast({
        title: "Book updated",
        description: "Book details updated successfully",
      });

      onUpdate();
      setOpen(false);
    } catch (error: any) {
      console.error("Error updating book:", error);
      toast({
        title: "Error updating book",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerVariant === "button" ? (
          <Button
            variant="outline"
            size="sm"
            className={triggerClassName || "shrink-0"}
          >
            <Edit3 className="w-3 h-3 mr-1" />
            Edit
          </Button>
        ) : (
          <Button
            size="icon-xs"
            variant="ghost"
            className={triggerClassName || "sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-foreground"}
          >
            <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Book</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Book Cover</Label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-20 rounded border flex items-center justify-center overflow-hidden bg-muted">
                {coverUrl ? (
                  <img 
                    src={coverUrl} 
                    alt={title}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-xs text-muted-foreground text-center p-2">No cover</div>
                )}
              </div>
              <BookEditionSelector
                bookId={bookId}
                bookTitle={title}
                bookAuthor={author}
                currentCoverUrl={coverUrl}
                onCoverUpdate={(newCoverUrl) => {
                  setCoverUrl(newCoverUrl);
                  toast({
                    title: "Cover selected",
                    description: "Click Save Changes to apply",
                  });
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="book-title" className="text-sm font-medium">
              Title
            </Label>
            <Input
              id="book-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter book title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="book-author" className="text-sm font-medium">
              Author
            </Label>
            <Input
              id="book-author"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Enter author name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="total-pages" className="text-sm font-medium">
              Total Pages
            </Label>
            <Input
              id="total-pages"
              type="number"
              value={newTotalPages}
              onChange={(e) => setNewTotalPages(e.target.value)}
              min={1}
              placeholder="Enter total pages"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="published-year" className="text-sm font-medium">
              Published Year
            </Label>
            <Input
              id="published-year"
              type="number"
              value={newPublishedYear}
              onChange={(e) => setNewPublishedYear(e.target.value)}
              placeholder="e.g. 2024"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updating}>
              {updating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
