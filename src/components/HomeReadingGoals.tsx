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
  accentColor?: string;
  accentTextColor?: string;
}

export const HomeReadingGoals = ({ userId, completedBooksThisYear, isOwnProfile = true, accentColor, accentTextColor }: HomeReadingGoalsProps) => {
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
    <Card 
      className="shadow-soft border-2 hover:shadow-lg transition-all duration-300 w-full"
      style={{ borderColor: accentColor || 'hsl(var(--border))', backgroundColor: accentColor || 'hsl(var(--card))' }}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Target className="w-4 h-4" style={{ color: accentTextColor || 'hsl(var(--primary))' }} />
            <h3 className="text-sm sm:text-base font-semibold" style={{ color: accentTextColor }}>
              {currentYear} Reading Goal
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground">Loading...</p>
          </div>
        ) : goal ? (
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex justify-between items-center text-[11px] sm:text-xs">
              <span style={{ color: accentTextColor }}>
                Progress: {totalProgress}/{goal.goal_count} books
              </span>
              <span className="font-semibold" style={{ color: accentTextColor }}>
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-1.5" />
            
            {isOwnProfile && (
              <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t" style={{ borderColor: accentColor ? `${accentColor}40` : 'hsl(var(--border))' }}>
                <span className="text-[10px]" style={{ color: accentTextColor }}>
                  Manual count: {goal.manual_count}
                </span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateManualCount(false)}
                    disabled={goal.manual_count === 0}
                    className="h-5 w-5 p-0"
                    style={{ 
                      borderColor: accentTextColor,
                      color: accentTextColor
                    }}
                  >
                    <Minus className="h-2.5 w-2.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateManualCount(true)}
                    className="h-5 w-5 p-0"
                    style={{ 
                      borderColor: accentTextColor,
                      color: accentTextColor
                    }}
                  >
                    <Plus className="h-2.5 w-2.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-[10px] text-muted-foreground">No reading goal set for {currentYear}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Helper function to get contrasting text color
function getContrastColor(hexColor: string): string {
  if (!hexColor || hexColor[0] !== '#') return 'hsl(var(--foreground))';
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum < 128 ? '#FFFFFF' : '#1A1A1A';
}