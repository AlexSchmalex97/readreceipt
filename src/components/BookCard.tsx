import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Edit3, Check, X, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BookEditionSelector } from "@/components/BookEditionSelector";
import { ReadingEntriesDialog } from "@/components/ReadingEntriesDialog";
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
  published_year?: number;
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
      <CardHeader className="pb-1 sm:pb-2 pt-1.5 sm:pt-4 px-1.5 sm:px-4">
        <div className="flex items-start gap-1 sm:gap-2">
          {/* Book Cover */}
          <div className="relative rounded flex-shrink-0 overflow-hidden w-8 sm:w-14 h-11 sm:h-[72px] flex items-center justify-center">
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
                <BookOpen className="w-4 h-4 text-muted-foreground" />
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
              className="text-[10px] sm:text-base font-semibold leading-tight line-clamp-2"
              style={accentTextColor ? { color: accentTextColor } : {}}
            >
              {book.title}{book.published_year ? ` (${book.published_year})` : ''}
            </CardTitle>
            <p 
              className="text-[9px] sm:text-xs mt-0 truncate opacity-80"
              style={accentTextColor ? { color: accentTextColor } : {}}
            >
              {book.author}
            </p>
          </div>
        </div>
        
        {/* Actions Row - below the book info */}
        <div className="flex items-center justify-end gap-0.5 mt-1">
          <BookEditDialog
            bookId={book.id}
            bookTitle={book.title}
            bookAuthor={book.author}
            totalPages={book.totalPages}
            currentCoverUrl={book.coverUrl}
            publishedYear={book.published_year}
            onUpdate={() => onBookUpdated?.()}
          />
          <ReadingEntriesDialog
            bookId={book.id}
            bookTitle={book.title}
            onChanged={onBookUpdated}
          />
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
              className="sm:h-6 sm:w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-1 sm:space-y-2 pt-1 sm:pt-1.5 px-1.5 sm:px-4 pb-1.5 sm:pb-4">
        <div className="space-y-0.5 sm:space-y-1">
        <div className="flex justify-between items-center text-[9px] sm:text-xs">
            <span className="font-medium" style={accentTextColor ? { color: accentTextColor, opacity: 0.8 } : {}}>Progress</span>
            <span 
              className="font-bold text-sm sm:text-base bg-primary/10 px-1.5 py-0.5 rounded"
              style={accentTextColor ? { color: accentTextColor, backgroundColor: `${accentTextColor}20` } : {}}
            >
              {percentage}%
            </span>
          </div>
          <Progress 
            value={percentage} 
            className="h-1 sm:h-2" 
            style={{ 
              "--progress-width": `${percentage}%`,
              ...(accentTextColor ? { 
                backgroundColor: `${accentTextColor}30`,
              } : {})
            } as React.CSSProperties}
          />
        </div>

        <div 
          className="hidden sm:block rounded-md p-2 text-center"
          style={accentTextColor ? { 
            backgroundColor: `${accentTextColor}20`,
            color: accentTextColor
          } : {}}
        >
          <p 
            className="text-xs font-medium animate-bounce-gentle"
            style={accentTextColor ? { color: accentTextColor } : {}}
          >
            {getEncouragingMessage(percentage)}
          </p>
        </div>

        <div 
          className="flex justify-between text-[9px] sm:text-xs font-medium"
          style={accentTextColor ? { color: accentTextColor } : {}}
        >
          <span className="bg-muted/50 px-1.5 py-0.5 rounded" style={accentTextColor ? { backgroundColor: `${accentTextColor}15` } : {}}>
            📖 {book.currentPage} read
          </span>
          <span className="bg-muted/50 px-1.5 py-0.5 rounded" style={accentTextColor ? { backgroundColor: `${accentTextColor}15` } : {}}>
            📚 {pagesLeft} left
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-0.5 sm:gap-1.5 w-full">
          <span 
            className="text-[8px] sm:text-xs flex-shrink-0 w-full sm:w-auto"
            style={accentTextColor ? { color: accentTextColor, opacity: 0.7 } : {}}
          >
            Current {trackingMode === "page" ? "page" : "percentage"}:
          </span>
          {isEditing ? (
            <>
              <div className="flex items-center gap-1 w-full sm:flex-1">
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
                  className="flex-1 min-w-[60px] h-7 sm:h-8 text-sm sm:text-base px-2 text-foreground"
                  inputMode="numeric"
                  aria-label={trackingMode === "page" ? "Enter current page" : "Enter percentage"}
                  min="0"
                  max={trackingMode === "page" ? book.totalPages : 100}
                  placeholder={trackingMode === "page" ? "Page" : "%"}
                  autoFocus
                />
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground bg-muted px-2 py-1 rounded">
                  {trackingMode === "page" ? `/ ${book.totalPages}` : "%"}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setTrackingMode(trackingMode === "page" ? "percentage" : "page");
                }}
                className="h-6 sm:h-7 px-2 text-[10px] sm:text-xs flex-shrink-0 font-medium"
                title={trackingMode === "page" ? "Switch to percentage" : "Switch to page number"}
              >
                {trackingMode === "page" ? "Use %" : "Use Page #"}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                className="h-5 w-5 sm:h-6 sm:w-6 p-0 bg-gradient-primary hover:opacity-90 flex-shrink-0"
              >
                <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                className="h-5 w-5 sm:h-6 sm:w-6 p-0 flex-shrink-0"
              >
                <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </Button>
            </>
          ) : (
            <>
              <span className="flex-1 font-medium text-[10px] sm:text-sm">
                {trackingMode === "page" ? `${book.currentPage} / ${book.totalPages}` : `${percentage}%`}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="h-5 w-5 sm:h-6 sm:w-6 p-0"
              >
                <Edit3 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};