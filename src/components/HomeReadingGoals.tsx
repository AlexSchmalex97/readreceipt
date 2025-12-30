import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, Minus, Share2 } from "lucide-react";
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
  compact?: boolean;
  progressBarColor?: string;
}

// Default medium brown color for progress bar
const DEFAULT_PROGRESS_BAR_COLOR = "#8B6914";

// Helper to darken a hex color by a percentage
function darkenHex(hex: string, percent: number): string {
  if (!hex || hex[0] !== '#' || (hex.length !== 7 && hex.length !== 4)) {
    return hex;
  }
  const expand = (h: string) =>
    h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h;
  const full = expand(hex);
  const r = Math.max(0, Math.round(parseInt(full.slice(1, 3), 16) * (1 - percent)));
  const g = Math.max(0, Math.round(parseInt(full.slice(3, 5), 16) * (1 - percent)));
  const b = Math.max(0, Math.round(parseInt(full.slice(5, 7), 16) * (1 - percent)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export const HomeReadingGoals = ({ userId, completedBooksThisYear, isOwnProfile = true, accentColor, accentTextColor, compact = false, progressBarColor: propProgressBarColor }: HomeReadingGoalsProps) => {
  const [goal, setGoal] = useState<ReadingGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);

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

  const handleShare = async () => {
    if (!goal) return;
    
    setIsSharing(true);
    try {
      const totalProgress = completedBooksThisYear + (goal.manual_count || 0);
      const progressPercentage = Math.min((totalProgress / goal.goal_count) * 100, 100);
      
      // Create a canvas to generate the share image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      // Set canvas size
      canvas.width = 600;
      canvas.height = 400;
      
      // Background
      const bgColor = accentColor || '#1a1a2e';
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add subtle gradient overlay
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, 'rgba(255,255,255,0.1)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Text color
      const textColor = accentTextColor || '#ffffff';
      
      // Title
      ctx.fillStyle = textColor;
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`📚 ${currentYear} Reading Goal`, canvas.width / 2, 70);
      
      // Progress text
      ctx.font = '28px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${totalProgress} of ${goal.goal_count} books read`, canvas.width / 2, 130);
      
      // Progress bar background
      const barX = 60;
      const barY = 170;
      const barWidth = 480;
      const barHeight = 40;
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.roundRect(barX, barY, barWidth, barHeight, 20);
      ctx.fill();
      
      // Progress bar fill
      const progressWidth = (progressPercentage / 100) * barWidth;
      const progressColor = propProgressBarColor || DEFAULT_PROGRESS_BAR_COLOR;
      ctx.fillStyle = progressColor;
      ctx.beginPath();
      ctx.roundRect(barX, barY, progressWidth, barHeight, 20);
      ctx.fill();
      
      // Percentage
      ctx.fillStyle = textColor;
      ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${Math.round(progressPercentage)}%`, canvas.width / 2, 280);
      
      // Motivational message
      ctx.font = '20px system-ui, -apple-system, sans-serif';
      const message = progressPercentage >= 100 
        ? "🎉 Goal achieved!" 
        : progressPercentage >= 75 
          ? "Almost there! 💪" 
          : progressPercentage >= 50 
            ? "Halfway there! 📖" 
            : "Keep reading! 📚";
      ctx.fillText(message, canvas.width / 2, 330);
      
      // Branding
      ctx.font = '16px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = textColor;
      ctx.globalAlpha = 0.7;
      ctx.fillText('ReadReceipt', canvas.width / 2, 375);
      ctx.globalAlpha = 1;
      
      // Convert to blob and share
      canvas.toBlob(async (blob) => {
        if (!blob) {
          throw new Error('Failed to create image');
        }
        
        const file = new File([blob], 'reading-goal.png', { type: 'image/png' });
        
        // Check if Web Share API is available with files
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `My ${currentYear} Reading Goal`,
            text: `I've read ${totalProgress} of ${goal.goal_count} books this year! ${Math.round(progressPercentage)}% complete.`,
            files: [file]
          });
        } else if (navigator.share) {
          // Fallback to sharing without file
          await navigator.share({
            title: `My ${currentYear} Reading Goal`,
            text: `📚 I've read ${totalProgress} of ${goal.goal_count} books this year! ${Math.round(progressPercentage)}% complete. #ReadReceipt`
          });
        } else {
          // Fallback: download the image
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'reading-goal.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          toast({
            title: "Image downloaded!",
            description: "Share it on your favorite social media platform.",
          });
        }
        
        setIsSharing(false);
      }, 'image/png');
    } catch (error: any) {
      console.error('Error sharing:', error);
      if (error.name !== 'AbortError') {
        toast({
          title: "Couldn't share",
          description: error.message || "Please try again",
          variant: "destructive",
        });
      }
      setIsSharing(false);
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

  // Use prop progress bar color, or fall back to default medium brown
  const progressBarColor = propProgressBarColor || DEFAULT_PROGRESS_BAR_COLOR;

  // Compact mode for profile page - just the content, no wrapper card
  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" style={{ color: accentTextColor || 'hsl(var(--primary))' }} />
            <h3 className="text-xs font-semibold" style={{ color: accentTextColor }}>
              {currentYear} Reading Goal
            </h3>
          </div>
          {isOwnProfile && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleShare}
              disabled={isSharing}
              className="h-5 w-5 p-0"
              style={{ color: accentTextColor }}
              title="Share reading goal"
            >
              <Share2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="flex justify-between items-center text-[10px]">
          <span style={{ color: accentTextColor }}>
            Progress: {totalProgress}/{goal.goal_count} books
          </span>
          <span className="font-semibold" style={{ color: accentTextColor }}>
            {Math.round(progressPercentage)}%
          </span>
        </div>
        <Progress 
          value={progressPercentage} 
          className="h-2 bg-foreground/20 border border-foreground/30"
          indicatorClassName="bg-none"
          indicatorStyle={{ backgroundColor: progressBarColor }}
        />
        {isOwnProfile && (
          <div className="flex items-center justify-between gap-1 pt-1">
            <span className="text-[9px]" style={{ color: accentTextColor }}>
              Manual count: {goal.manual_count}
            </span>
            <div className="flex gap-0.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateManualCount(false)}
                disabled={goal.manual_count === 0}
                className="h-4 w-4 p-0"
                style={{ borderColor: accentTextColor, color: accentTextColor }}
              >
                <Minus className="h-2 w-2" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateManualCount(true)}
                className="h-4 w-4 p-0"
                style={{ borderColor: accentTextColor, color: accentTextColor }}
              >
                <Plus className="h-2 w-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Create a contrasting border color for better visibility
  const borderStyle = accentColor 
    ? { borderColor: accentTextColor || 'hsl(var(--foreground))' }
    : { borderColor: 'hsl(var(--border))' };

  return (
    <Card 
      className="shadow-soft border-2 hover:shadow-lg transition-all duration-300 w-full"
      style={{ 
        ...borderStyle,
        backgroundColor: accentColor || 'hsl(var(--card))' 
      }}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Target className="w-4 h-4" style={{ color: accentTextColor || 'hsl(var(--primary))' }} />
            <h3 className="text-sm sm:text-base font-semibold" style={{ color: accentTextColor }}>
              {currentYear} Reading Goal
            </h3>
          </div>
          {isOwnProfile && goal && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleShare}
              disabled={isSharing}
              className="h-6 w-6 p-0"
              style={{ color: accentTextColor }}
              title="Share reading goal"
            >
              <Share2 className="h-3.5 w-3.5" />
            </Button>
          )}
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
            <Progress 
              value={progressPercentage} 
              className="h-2.5 bg-foreground/20 border border-foreground/30"
              indicatorClassName="bg-none"
              indicatorStyle={{ backgroundColor: progressBarColor }}
            />
            
            {isOwnProfile && (
              <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t" style={{ borderColor: accentTextColor || 'hsl(var(--border))' }}>
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