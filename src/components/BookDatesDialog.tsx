import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
  coverUrl?: string;
  started_at?: string;
  finished_at?: string;
}

interface BookDatesDialogProps {
  book: Book;
  onUpdateDates: (id: string, startedAt?: string, finishedAt?: string) => void;
}

export const BookDatesDialog = ({ book, onUpdateDates }: BookDatesDialogProps) => {
  const [open, setOpen] = useState(false);
  const [startedAt, setStartedAt] = useState(book.started_at || "");
  const [finishedAt, setFinishedAt] = useState(book.finished_at || "");
  const { toast } = useToast();

  useEffect(() => {
    setStartedAt(book.started_at || "");
    setFinishedAt(book.finished_at || "");
  }, [book]);

  const handleSave = () => {
    // Validate dates
    if (startedAt && finishedAt) {
      const startDate = new Date(startedAt);
      const endDate = new Date(finishedAt);
      
      if (endDate < startDate) {
        toast({
          title: "Invalid dates",
          description: "End date cannot be before start date",
          variant: "destructive",
        });
        return;
      }
    }

    onUpdateDates(book.id, startedAt || undefined, finishedAt || undefined);
    setOpen(false);

    toast({
      title: "Dates updated! 📅",
      description: "Reading dates have been saved successfully",
    });
  };

  const calculateReadingTime = () => {
    if (!startedAt || !finishedAt) return null;
    
    const start = new Date(startedAt);
    const end = new Date(finishedAt);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const readingTime = calculateReadingTime();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          size="sm" 
          variant="outline" 
          className="h-8 w-8 p-0"
          title="Set reading dates"
        >
          <Calendar className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] shadow-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold bg-gradient-primary bg-clip-text text-transparent">
            Reading Dates
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Track when you started and finished "{book.title}"
          </p>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="started">Date Started</Label>
            <Input
              id="started"
              type="date"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
              className="focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="finished">Date Finished</Label>
            <Input
              id="finished"
              type="date"
              value={finishedAt}
              onChange={(e) => setFinishedAt(e.target.value)}
              className="focus:ring-primary"
            />
          </div>

          {readingTime && (
            <div className="bg-accent/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="w-4 h-4 text-primary" />
                <span>Reading time: {readingTime} day{readingTime !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-gradient-primary hover:opacity-90 transition-opacity"
            >
              Save Dates
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};