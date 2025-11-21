import { useState } from "react";
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
  onUpdate: () => void;
}

export const BookEditDialog = ({
  bookId,
  bookTitle,
  bookAuthor,
  totalPages,
  currentCoverUrl,
  onUpdate,
}: BookEditDialogProps) => {
  const [open, setOpen] = useState(false);
  const [newTotalPages, setNewTotalPages] = useState(totalPages.toString());
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    const pages = parseInt(newTotalPages, 10);
    
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
      const { error } = await supabase
        .from("books")
        .update({ total_pages: pages })
        .eq("id", bookId);

      if (error) throw error;

      toast({
        title: "Book updated",
        description: "Total pages updated successfully",
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
        <Button
          size="icon-xs"
          variant="ghost"
          className="sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-foreground"
        >
          <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
        </Button>
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
                {currentCoverUrl ? (
                  <img 
                    src={currentCoverUrl} 
                    alt={bookTitle}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-xs text-muted-foreground text-center p-2">No cover</div>
                )}
              </div>
              <BookEditionSelector
                bookId={bookId}
                bookTitle={bookTitle}
                bookAuthor={bookAuthor}
                currentCoverUrl={currentCoverUrl}
                onCoverUpdate={(newCoverUrl) => {
                  toast({
                    title: "Cover updated",
                    description: "Book cover updated successfully",
                  });
                  onUpdate();
                }}
              />
            </div>
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
