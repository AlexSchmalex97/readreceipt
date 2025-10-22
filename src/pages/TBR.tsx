import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { TBRList } from "@/components/TBRList";
import { useToast } from "@/hooks/use-toast";
import { usePlatform } from "@/hooks/usePlatform";
import { useSwipeBack } from "@/hooks/useSwipeBack";

const TBR = () => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isIOS, isReadReceiptApp } = usePlatform();
  
  // Enable swipe-back gesture on iOS
  useSwipeBack(isIOS || isReadReceiptApp);

  useEffect(() => {
    // Check authentication status
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
        setUserId(session.user.id);
      } else {
        navigate("/auth");
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true);
        setUserId(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleMoveToReading = async (book: { title: string; author: string; totalPages: number; coverUrl?: string }) => {
    if (!userId) return;

    try {
      const { error } = await supabase.from("books").insert({
        user_id: userId,
        title: book.title,
        author: book.author,
        total_pages: book.totalPages,
        current_page: 0,
        cover_url: book.coverUrl,
        status: "in_progress",
        started_at: new Date().toISOString().split('T')[0],
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `"${book.title}" has been moved to your reading list`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to move book to reading list",
        variant: "destructive",
      });
    }
  };

  const handleMoveToCompleted = async (tbrBookId: string) => {
    if (!userId) return;

    try {
      // Get the TBR book details
      const { data: tbrBook, error: fetchError } = await supabase
        .from("tbr_books")
        .select("*")
        .eq("id", tbrBookId)
        .single();

      if (fetchError || !tbrBook) throw fetchError;

      // Insert into books table
      const { error: insertError } = await supabase.from("books").insert({
        user_id: userId,
        title: tbrBook.title,
        author: tbrBook.author,
        total_pages: tbrBook.total_pages || 0,
        current_page: tbrBook.total_pages || 0,
        cover_url: tbrBook.cover_url,
        status: "finished",
        finished_at: new Date().toISOString().split('T')[0],
      });

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: `"${tbrBook.title}" has been moved to completed books`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to move book to completed",
        variant: "destructive",
      });
    }
  };

  const handleMoveToDNF = async (tbrBookId: string) => {
    if (!userId) return;

    try {
      // Get the TBR book details
      const { data: tbrBook, error: fetchError } = await supabase
        .from("tbr_books")
        .select("*")
        .eq("id", tbrBookId)
        .single();

      if (fetchError || !tbrBook) throw fetchError;

      // For now, just delete from TBR (you can expand this to add DNF tracking)
      const { error: deleteError } = await supabase
        .from("tbr_books")
        .delete()
        .eq("id", tbrBookId);

      if (deleteError) throw deleteError;

      toast({
        title: "Success",
        description: `"${tbrBook.title}" has been marked as DNF`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to mark book as DNF",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">To Be Read</h1>
        <TBRList
          userId={userId}
          onMoveToReading={handleMoveToReading}
          onMoveToCompleted={handleMoveToCompleted}
          onMoveToDNF={handleMoveToDNF}
        />
      </main>
    </div>
  );
};

export default TBR;
