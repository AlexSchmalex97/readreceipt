import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowRightLeft, BookOpen, CheckCircle, XCircle, ListTodo } from "lucide-react";

interface BookMoveMenuProps {
  bookId: string;
  currentStatus: 'in_progress' | 'completed' | 'dnf' | 'tbr';
  onMoveToInProgress: (id: string) => void;
  onMoveToCompleted: (id: string) => void;
  onMoveToDNF: (id: string) => void;
  onMoveToTBR: (id: string) => void;
  showMoveToTBR?: boolean;
}

export function BookMoveMenu({
  bookId,
  currentStatus,
  onMoveToInProgress,
  onMoveToCompleted,
  onMoveToDNF,
  onMoveToTBR,
  showMoveToTBR = true,
}: BookMoveMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon-xs"
          variant="ghost"
          className="sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-foreground"
          title="Move to another list"
        >
          <ArrowRightLeft className="w-3 h-3 sm:w-4 sm:h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {currentStatus !== 'in_progress' && (
          <DropdownMenuItem onClick={() => onMoveToInProgress(bookId)}>
            <BookOpen className="w-4 h-4 mr-2" />
            Move to In Progress
          </DropdownMenuItem>
        )}
        {currentStatus !== 'completed' && (
          <DropdownMenuItem onClick={() => onMoveToCompleted(bookId)}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark as Completed
          </DropdownMenuItem>
        )}
        {currentStatus !== 'dnf' && (
          <DropdownMenuItem onClick={() => onMoveToDNF(bookId)}>
            <XCircle className="w-4 h-4 mr-2" />
            Mark as DNF
          </DropdownMenuItem>
        )}
        {showMoveToTBR && currentStatus !== 'tbr' && (
          <DropdownMenuItem onClick={() => onMoveToTBR(bookId)}>
            <ListTodo className="w-4 h-4 mr-2" />
            Move to TBR
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
