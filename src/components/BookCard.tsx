import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Edit3, Check, X, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BookEditionSelector } from "@/components/BookEditionSelector";
import { BookDatesDialog } from "@/components/BookDatesDialog";
import { BookMoveMenu } from "@/components/BookMoveMenu";

interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
  coverUrl?: string;
  started_at?: string;
  finished_at?: string;
  status?: 'in_progress' | 'completed' | 'dnf';
  dnf_type?: 'soft' | 'hard' | null;
}

interface BookCardProps {
  book: Book;
  onUpdateProgress: (id: string, currentPage: number) => void;
  onDeleteBook?: (id: string) => void;
  onCoverUpdate?: (id: string, newCoverUrl: string) => void;
  onUpdateDates?: (id: string, startedAt?: string, finishedAt?: string) => void;
  onMoveToInProgress?: (id: string) => void;
  onMoveToCompleted?: (id: string) => void;
  onMoveToDNF?: (id: string) => void;
  onMoveToTBR?: (id: string) => void;
}

const getEncouragingMessage = (percentage: number): string => {
  if (percentage === 0) return "Ready to start this amazing journey! 🌟";
  if (percentage < 10) return "Every great journey begins with a single page! 📖";
  if (percentage < 25) return "You're building momentum! Keep going! 🚀";
  if (percentage < 50) return "Halfway there! You're doing amazing! 💪";
  if (percentage < 75) return "Three-quarters done! The finish line is in sight! 🎯";
  if (percentage < 90) return "Almost there! You're so close! 🏁";
  if (percentage < 100) return "Just a few more pages! You've got this! ✨";
  return "Congratulations! Book completed! 🎉📚";
};

export const BookCard = ({ 
  book, 
  onUpdateProgress, 
  onDeleteBook, 
  onCoverUpdate, 
  onUpdateDates, 
  onMoveToInProgress,
  onMoveToCompleted,
  onMoveToDNF,
  onMoveToTBR,
}: BookCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentPageInput, setCurrentPageInput] = useState(book.currentPage.toString());
  const { toast } = useToast();

  const percentage = Math.round((book.currentPage / book.totalPages) * 100);
  const pagesLeft = book.totalPages - book.currentPage;

  const handleSave = () => {
    const newPage = parseInt(currentPageInput);
    
    if (isNaN(newPage) || newPage < 0 || newPage > book.totalPages) {
      toast({
        title: "Invalid page number",
        description: `Please enter a number between 0 and ${book.totalPages}`,
        variant: "destructive",
      });
      return;
    }

    onUpdateProgress(book.id, newPage);
    setIsEditing(false);

    if (newPage >= book.totalPages && book.currentPage < book.totalPages) {
      toast({
        title: "Congratulations! 🎉",
        description: "You've finished reading this book!",
      });
    } else if (newPage > book.currentPage) {
      toast({
        title: "Progress updated! 📈",
        description: "Keep up the great reading!",
      });
    }
  };

  const handleCancel = () => {
    setCurrentPageInput(book.currentPage.toString());
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (onDeleteBook) {
      onDeleteBook(book.id);
      toast({
        title: "Book deleted",
        description: `"${book.title}" has been removed from your library.`,
      });
    }
  };

  return (
    <Card className="shadow-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* Book Cover */}
          <div className="relative w-16 h-20 bg-muted rounded border flex-shrink-0 overflow-hidden">
            {book.coverUrl ? (
              <img 
                src={book.coverUrl} 
                alt={`Cover of ${book.title}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.log('Failed to load cover for:', book.title, book.coverUrl);
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            {/* Edition selector overlay */}
            <div className="absolute -top-1 -right-1">
              <BookEditionSelector
                bookId={book.id}
                bookTitle={book.title}
                bookAuthor={book.author}
                currentCoverUrl={book.coverUrl}
                onCoverUpdate={(newCoverUrl) => {
                  onCoverUpdate?.(book.id, newCoverUrl);
                }}
              />
            </div>
          </div>
          
          {/* Book Info */}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-foreground line-clamp-2">
              {book.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{book.author}</p>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {onUpdateDates && (
              <BookDatesDialog
                book={book}
                onUpdateDates={onUpdateDates}
              />
            )}
            {onMoveToInProgress && onMoveToCompleted && onMoveToDNF && onMoveToTBR && book.status && (
              <BookMoveMenu
                bookId={book.id}
                currentStatus={book.status}
                onMoveToInProgress={onMoveToInProgress}
                onMoveToCompleted={onMoveToCompleted}
                onMoveToDNF={onMoveToDNF}
                onMoveToTBR={onMoveToTBR}
              />
            )}
            {onDeleteBook && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-primary">{percentage}%</span>
          </div>
          <Progress 
            value={percentage} 
            className="h-2.5" 
            style={{ "--progress-width": `${percentage}%` } as React.CSSProperties}
          />
        </div>

        <div className="bg-accent/50 rounded-lg p-3 text-center">
          <p className="text-sm font-medium text-accent-foreground animate-bounce-gentle">
            {getEncouragingMessage(percentage)}
          </p>
        </div>

        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Pages read: {book.currentPage}</span>
          <span>Pages left: {pagesLeft}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Current page:</span>
          {isEditing ? (
            <>
              <Input
                type="number"
                value={currentPageInput}
                onChange={(e) => setCurrentPageInput(e.target.value)}
                className="flex-1 h-8"
                min="0"
                max={book.totalPages}
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleSave}
                className="h-8 w-8 p-0 bg-gradient-primary hover:opacity-90"
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <span className="flex-1 font-medium">{book.currentPage} / {book.totalPages}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="h-8 w-8 p-0"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};