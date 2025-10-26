import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ReadingGoal {
  id: string;
  year: number;
  goal_count: number;
  manual_count: number;
}

interface HomeReadingGoalsProps {
  userId: string | null;
  completedBooksThisYear: number;
  isOwnProfile?: boolean;
}

export const HomeReadingGoals = ({ userId, completedBooksThisYear, isOwnProfile = true }: HomeReadingGoalsProps) => {
  const [goal, setGoal] = useState<ReadingGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (userId) {
      loadReadingGoal();
    }
  }, [userId]);

  const loadReadingGoal = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      if (isOwnProfile) {
        // Own profile: try to read from reading_goals table
        const { data, error } = await supabase
          .from("reading_goals")
          .select("*")
          .eq("user_id", userId)
          .eq("year", currentYear)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          // Create default goal for current year
          const { data: newGoal, error: createError } = await supabase
            .from("reading_goals")
            .insert({
              user_id: userId,
              year: currentYear,
              goal_count: 12,
              manual_count: 0
            })
            .select()
            .single();

          if (createError) throw createError;
          setGoal(newGoal);
        } else {
          setGoal(data);
        }
      } else {
        // Other user's profile: use public RPC function
        const { data, error } = await supabase
          .rpc('get_reading_goal_public', {
            p_user_id: userId,
            p_year: currentYear
          });

        if (error) {
          console.error("Error loading reading goal via RPC:", error);
          // If no goal exists, show a default
          setGoal(null);
        } else if (data && data.length > 0) {
          setGoal(data[0]);
        } else {
          setGoal(null);
        }
      }
    } catch (error: any) {
      console.error("Error loading reading goal:", error);
      setGoal(null);
    } finally {
      setLoading(false);
    }
  };

  const updateManualCount = async (increment: boolean) => {
    if (!goal || !userId) return;

    const newCount = Math.max(0, goal.manual_count + (increment ? 1 : -1));
    
    try {
      const { error } = await supabase
        .from("reading_goals")
        .update({ manual_count: newCount })
        .eq("id", goal.id);

      if (error) throw error;

      setGoal({ ...goal, manual_count: newCount });
      
      toast({
        title: `Manual count ${increment ? 'increased' : 'decreased'}`,
        description: `Now at ${newCount} books`,
      });
    } catch (error: any) {
      console.error("Error updating manual count:", error);
      toast({
        title: "Error updating count",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) return null;

  // If no goal exists for other users, show a message
  if (!goal && !isOwnProfile) {
    return (
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="p-2 sm:p-4">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
            <Target className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary" />
            <span className="text-xs sm:text-base font-semibold text-foreground">{currentYear} Reading Goal</span>
          </div>
          <p className="text-[10px] sm:text-sm text-muted-foreground">No goal set yet.</p>
        </CardContent>
      </Card>
    );
  }

  if (!goal) return null;

  const totalProgress = completedBooksThisYear + (goal.manual_count || 0);
  const progressPercentage = Math.min((totalProgress / goal.goal_count) * 100, 100);
  const booksRemaining = Math.max(goal.goal_count - totalProgress, 0);

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
      <CardContent className="p-2 sm:p-4">
        <div className="flex items-center justify-between mb-1.5 sm:mb-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Target className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary" />
            <span className="text-xs sm:text-base font-semibold text-foreground">{currentYear} Reading Goal</span>
          </div>
          <div className="text-[10px] sm:text-sm text-muted-foreground">
            {totalProgress} of {goal.goal_count} books
          </div>
        </div>
        
        <Progress value={progressPercentage} className="h-2 sm:h-3 mb-1.5 sm:mb-3" />
        
        <div className="flex items-center justify-between text-[10px] sm:text-sm">
          <div className="text-muted-foreground">
            {booksRemaining > 0 ? `${booksRemaining} books to go!` : "Goal achieved! 🎉"}
          </div>
          {isOwnProfile && goal.manual_count > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[9px] sm:text-xs text-muted-foreground">Manual:</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => updateManualCount(false)}
                className="h-5 w-5 sm:h-6 sm:w-6 p-0"
              >
                <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </Button>
              <span className="text-[10px] sm:text-xs font-medium w-3 sm:w-4 text-center">{goal.manual_count}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => updateManualCount(true)}
                className="h-5 w-5 sm:h-6 sm:w-6 p-0"
              >
                <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </Button>
            </div>
          )}
          
          {isOwnProfile && goal.manual_count === 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => updateManualCount(true)}
              className="h-5 px-1.5 sm:h-6 sm:px-2 text-[10px] sm:text-xs"
            >
              <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
              Add manual
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};