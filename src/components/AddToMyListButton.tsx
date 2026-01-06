import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, BookOpen, Clock, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AddToMyListButtonProps {
  book: {
    title: string;
    author: string;
    cover_url?: string | null;
    total_pages?: number | null;
  };
  variant?: "icon" | "button";
  size?: "sm" | "default";
}

export function AddToMyListButton({ book, variant = "button", size = "sm" }: AddToMyListButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [addedTo, setAddedTo] = useState<'tbr' | 'in_progress' | null>(null);

  const addToTBR = async () => {
    setIsAdding(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) {
        toast.error("Please sign in to add books");
        return;
      }

      // Check if book already exists in TBR
      const { data: existing } = await supabase
        .from("tbr_books")
        .select("id")
        .eq("user_id", session.session.user.id)
        .ilike("title", book.title)
        .ilike("author", book.author)
        .maybeSingle();

      if (existing) {
        toast.info("This book is already in your TBR");
        return;
      }

      const { error } = await supabase.from("tbr_books").insert({
        user_id: session.session.user.id,
        title: book.title,
        author: book.author,
        cover_url: book.cover_url || null,
        total_pages: book.total_pages || null,
        priority: 0,
      });

      if (error) throw error;
      toast.success(`Added "${book.title}" to your TBR`);
      setAddedTo('tbr');
    } catch (error) {
      console.error("Error adding to TBR:", error);
      toast.error("Failed to add book to TBR");
    } finally {
      setIsAdding(false);
    }
  };

  const addToInProgress = async () => {
    setIsAdding(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) {
        toast.error("Please sign in to add books");
        return;
      }

      // Check if book already exists in books
      const { data: existing } = await supabase
        .from("books")
        .select("id")
        .eq("user_id", session.session.user.id)
        .ilike("title", book.title)
        .ilike("author", book.author)
        .maybeSingle();

      if (existing) {
        toast.info("This book is already in your library");
        return;
      }

      const { error } = await supabase.from("books").insert({
        user_id: session.session.user.id,
        title: book.title,
        author: book.author,
        cover_url: book.cover_url || null,
        total_pages: book.total_pages || 0,
        current_page: 0,
        status: "in_progress",
        started_at: new Date().toISOString().split('T')[0],
      });

      if (error) throw error;
      toast.success(`Added "${book.title}" to your reading list`);
      setAddedTo('in_progress');
    } catch (error) {
      console.error("Error adding to reading list:", error);
      toast.error("Failed to add book to reading list");
    } finally {
      setIsAdding(false);
    }
  };

  if (addedTo) {
    return (
      <div className="flex items-center gap-1 text-xs text-green-600">
        <Check className="w-3 h-3" />
        <span>Added</span>
      </div>
    );
  }

  if (variant === "icon") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 shrink-0"
            disabled={isAdding}
          >
            {isAdding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={addToTBR}>
            <Clock className="w-4 h-4 mr-2" />
            Add to my TBR
          </DropdownMenuItem>
          <DropdownMenuItem onClick={addToInProgress}>
            <BookOpen className="w-4 h-4 mr-2" />
            Start reading
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size={size}
          disabled={isAdding}
          className="gap-1"
        >
          {isAdding ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Plus className="w-3 h-3" />
          )}
          Add to my list
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={addToTBR}>
          <Clock className="w-4 h-4 mr-2" />
          Add to my TBR
        </DropdownMenuItem>
        <DropdownMenuItem onClick={addToInProgress}>
          <BookOpen className="w-4 h-4 mr-2" />
          Start reading
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
