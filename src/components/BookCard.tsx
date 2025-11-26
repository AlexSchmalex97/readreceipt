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
import { BookEditDialog } from "@/components/BookEditDialog";
import { usePlatform } from "@/hooks/usePlatform";

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
  onBookUpdated?: () => void;
  accentColor?: string;
  accentTextColor?: string;
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
  onBookUpdated,
  accentColor,
  accentTextColor,
}: BookCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [trackingMode, setTrackingMode] = useState<"page" | "percentage">("page");
  const [currentPageInput, setCurrentPageInput] = useState(book.currentPage.toString());
  const [percentageInput, setPercentageInput] = useState(Math.round((book.currentPage / book.totalPages) * 100).toString());
  const { toast } = useToast();
  const { isIOS } = usePlatform();

  const percentage = Math.round((book.currentPage / book.totalPages) * 100);
  const pagesLeft = book.totalPages - book.currentPage;

  const handleSave = () => {
    let newPage: number | null = null;

    if (trackingMode === "page") {
      if (currentPageInput.trim() === "") {
        newPage = null;
      } else {
        const parsed = parseInt(currentPageInput, 10);
        if (!Number.isFinite(parsed) || parsed < 0 || parsed > book.totalPages) {
          toast({
            title: "Invalid page number",
            description: `Please enter a number between 0 and ${book.totalPages}`,
            variant: "destructive",
          });
          return;
        }
        newPage = parsed;
      }
    } else {
      if (percentageInput.trim() === "") {
        newPage = null;
      } else {
        const percentValue = parseInt(percentageInput, 10);
        if (!Number.isFinite(percentValue) || percentValue < 0 || percentValue > 100) {
          toast({
            title: "Invalid percentage",
            description: "Please enter a number between 0 and 100",
            variant: "destructive",
          });
          return;
        }
        newPage = Math.round((percentValue / 100) * book.totalPages);
      }
    }

    if (newPage === null) {
      toast({ title: "Value required", description: "Please enter a value before saving", variant: "destructive" });
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
    setPercentageInput(Math.round((book.currentPage / book.totalPages) * 100).toString());
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
    <Card 
      className="shadow-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2"
      style={accentColor ? { 
        borderColor: accentColor,
        backgroundColor: accentColor 
      } : {}}
    >
      <CardHeader className="pb-1.5 sm:pb-3 pt-2 sm:pt-6 px-2 sm:px-6">
        <div className="flex items-start gap-1.5 sm:gap-3">
          {/* Book Cover */}
          <div className="relative rounded flex-shrink-0 overflow-hidden w-10 sm:w-16 h-14 sm:h-20 flex items-center justify-center">
            {book.coverUrl ? (
              <img 
                src={book.coverUrl} 
                alt={`Cover of ${book.title}`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  console.log('Failed to load cover for:', book.title, book.coverUrl);
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full bg-muted rounded border flex items-center justify-center">
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
            <CardTitle 
              className="text-xs sm:text-lg font-semibold leading-tight"
              style={accentTextColor ? { color: accentTextColor } : {}}
            >
              {book.title}
            </CardTitle>
            <p 
              className="text-[10px] sm:text-sm mt-0 sm:mt-1 truncate opacity-80"
              style={accentTextColor ? { color: accentTextColor } : {}}
            >
              {book.author}
            </p>
          </div>
        </div>
        
        {/* Actions Row - below the book info */}
        <div className="flex items-center justify-end gap-0.5 sm:gap-1 mt-2">
          <BookEditDialog
            bookId={book.id}
            bookTitle={book.title}
            bookAuthor={book.author}
            totalPages={book.totalPages}
            currentCoverUrl={book.coverUrl}
            onUpdate={() => onBookUpdated?.()}
          />
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
              size="icon-xs"
              variant="ghost"
              onClick={handleDelete}
              className="sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-1.5 sm:space-y-4 pt-1.5 sm:pt-2 px-2 sm:px-6 pb-2 sm:pb-6">
        <div className="space-y-0.5 sm:space-y-2">
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span style={accentTextColor ? { color: accentTextColor, opacity: 0.8 } : {}}>Progress</span>
            <span className="font-medium" style={accentTextColor ? { color: accentTextColor } : {}}>{percentage}%</span>
          </div>
          <Progress 
            value={percentage} 
            className="h-1.5 sm:h-2.5" 
            style={{ 
              "--progress-width": `${percentage}%`,
              ...(accentTextColor ? { 
                backgroundColor: `${accentTextColor}30`,
              } : {})
            } as React.CSSProperties}
          />
        </div>

        <div 
          className="hidden sm:block rounded-lg p-3 text-center"
          style={accentTextColor ? { 
            backgroundColor: `${accentTextColor}20`,
            color: accentTextColor
          } : {}}
        >
          <p 
            className="text-sm font-medium animate-bounce-gentle"
            style={accentTextColor ? { color: accentTextColor } : {}}
          >
            {getEncouragingMessage(percentage)}
          </p>
        </div>

        <div 
          className="flex justify-between text-[10px] sm:text-sm"
          style={accentTextColor ? { color: accentTextColor, opacity: 0.7 } : {}}
        >
          <span>Pages read: {book.currentPage}</span>
          <span>Pages left: {pagesLeft}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1 sm:gap-2 w-full">
          <span 
            className="text-[10px] sm:text-sm flex-shrink-0 w-full sm:w-auto"
            style={accentTextColor ? { color: accentTextColor, opacity: 0.7 } : {}}
          >
            Current {trackingMode === "page" ? "page" : "progress"}:
          </span>
          {isEditing ? (
            <>
              <Input
                type="number"
                value={trackingMode === "page" ? currentPageInput : percentageInput}
                onChange={(e) => {
                  const val = e.target.value;
                  if (trackingMode === "page") {
                    setCurrentPageInput(val);
                    if (val.trim() === "") {
                      setPercentageInput("");
                    } else {
                      const v = parseInt(val, 10);
                      if (Number.isFinite(v) && book.totalPages > 0) {
                        setPercentageInput(Math.round((v / book.totalPages) * 100).toString());
                      } else {
                        setPercentageInput("");
                      }
                    }
                  } else {
                    setPercentageInput(val);
                    if (val.trim() === "") {
                      setCurrentPageInput("");
                    } else {
                      const v = parseInt(val, 10);
                      if (Number.isFinite(v)) {
                        setCurrentPageInput(Math.round((v / 100) * book.totalPages).toString());
                      } else {
                        setCurrentPageInput("");
                      }
                    }
                  }
                }}
                className="w-full sm:flex-1 min-w-[140px] h-9 sm:h-10 text-base sm:text-lg px-3 text-foreground"
                inputMode="numeric"
                aria-label={trackingMode === "page" ? "Enter current page" : "Enter percentage"}
                min="0"
                max={trackingMode === "page" ? book.totalPages : 100}
                placeholder={trackingMode === "page" ? "Page" : "%"}
                autoFocus
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setTrackingMode(trackingMode === "page" ? "percentage" : "page");
                }}
                className="h-6 sm:h-8 px-1 sm:px-2 text-xs flex-shrink-0 mt-1 sm:mt-0"
              >
                {trackingMode === "page" ? "%" : "#"}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                className="h-6 w-6 sm:h-8 sm:w-8 p-0 bg-gradient-primary hover:opacity-90 flex-shrink-0 mt-1 sm:mt-0"
              >
                <Check className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                className="h-6 w-6 sm:h-8 sm:w-8 p-0 flex-shrink-0 mt-1 sm:mt-0"
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </>
          ) : (
            <>
              <span className="flex-1 font-medium text-xs sm:text-base">{book.currentPage} / {book.totalPages}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="h-6 w-6 sm:h-8 sm:w-8 p-0"
              >
                <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};