import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Edit3, Check, X, Target, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ReadingGoal {
  id: string;
  year: number;
  goal_count: number;
  manual_count: number;
}

interface ReadingGoalsProps {
  userId: string | null;
  completedBooksThisYear: number;
}

export const ReadingGoals = ({ userId, completedBooksThisYear }: ReadingGoalsProps) => {
  const [goal, setGoal] = useState<ReadingGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [isEditingManual, setIsEditingManual] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [manualInput, setManualInput] = useState("");
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
      const { data, error } = await supabase
        .from("reading_goals")
        .select("*")
        .eq("user_id", userId)
        .eq("year", currentYear)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setGoal(data);
        setGoalInput(data.goal_count.toString());
        setManualInput(data.manual_count?.toString() || "0");
      } else {
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
        setGoalInput("12");
        setManualInput("0");
      }
    } catch (error) {
      console.error("Error loading reading goal:", error);
      toast({
        title: "Error loading reading goal",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateGoal = async (field: 'goal_count' | 'manual_count', value: number) => {
    if (!userId || !goal) return;

    try {
      const { error } = await supabase
        .from("reading_goals")
        .update({ [field]: value })
        .eq("id", goal.id);

      if (error) throw error;

      setGoal(prev => prev ? { ...prev, [field]: value } : null);
      
      toast({
        title: "Goal updated! 🎯",
        description: field === 'goal_count' ? "Your reading goal has been updated" : "Manual count updated",
      });
    } catch (error) {
      console.error("Error updating goal:", error);
      toast({
        title: "Error updating goal",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleSaveGoal = () => {
    const newGoal = parseInt(goalInput);
    if (isNaN(newGoal) || newGoal < 1 || newGoal > 1000) {
      toast({
        title: "Invalid goal",
        description: "Please enter a number between 1 and 1000",
        variant: "destructive",
      });
      return;
    }
    updateGoal('goal_count', newGoal);
    setIsEditingGoal(false);
  };

  const handleSaveManual = () => {
    const newCount = parseInt(manualInput);
    if (isNaN(newCount) || newCount < 0 || newCount > 1000) {
      toast({
        title: "Invalid count",
        description: "Please enter a number between 0 and 1000",
        variant: "destructive",
      });
      return;
    }
    updateGoal('manual_count', newCount);
    setIsEditingManual(false);
  };

  const handleCancelGoal = () => {
    setGoalInput(goal?.goal_count.toString() || "12");
    setIsEditingGoal(false);
  };

  const handleCancelManual = () => {
    setManualInput(goal?.manual_count?.toString() || "0");
    setIsEditingManual(false);
  };

  if (!userId) {
    return (
      <Card className="shadow-card bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Reading Goals {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Sign in to track your reading goals
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="shadow-card bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Reading Goals {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-2 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!goal) return null;

  const totalProgress = completedBooksThisYear + (goal.manual_count || 0);
  const percentage = Math.min(Math.round((totalProgress / goal.goal_count) * 100), 100);
  const booksLeft = Math.max(goal.goal_count - totalProgress, 0);

  return (
    <Card className="shadow-card bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Reading Goals {currentYear}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress visualization */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-primary">{percentage}%</span>
          </div>
          <Progress 
            value={percentage} 
            className="h-3" 
          />
          <div className="text-center">
            <span className="text-2xl font-bold text-primary">{totalProgress}</span>
            <span className="text-muted-foreground"> / {goal.goal_count} books</span>
          </div>
        </div>

        {/* Goal setting */}
        <div className="flex items-center gap-2 justify-between">
          <span className="text-sm text-muted-foreground">Annual Goal:</span>
          {isEditingGoal ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className="w-20 h-8"
                min="1"
                max="1000"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleSaveGoal}
                className="h-8 w-8 p-0 bg-gradient-primary hover:opacity-90"
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelGoal}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-medium">{goal.goal_count} books</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditingGoal(true)}
                className="h-8 w-8 p-0"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Manual count adjustment */}
        <div className="flex items-center gap-2 justify-between">
          <span className="text-sm text-muted-foreground">Manual Count:</span>
          {isEditingManual ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="w-20 h-8"
                min="0"
                max="1000"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleSaveManual}
                className="h-8 w-8 p-0 bg-gradient-primary hover:opacity-90"
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelManual}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-medium">{goal.manual_count || 0} books</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditingManual(true)}
                className="h-8 w-8 p-0"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Stats breakdown */}
        <div className="bg-accent/50 rounded-lg p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Completed this year:</span>
            <span className="font-medium">{completedBooksThisYear}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Manual additions:</span>
            <span className="font-medium">{goal.manual_count || 0}</span>
          </div>
          <div className="flex justify-between text-sm font-medium border-t pt-2">
            <span>Books remaining:</span>
            <span className="text-primary">{booksLeft}</span>
          </div>
        </div>

        {/* Encouraging message */}
        <div className="text-center">
          {percentage >= 100 ? (
            <p className="text-sm font-medium text-green-600">
              🎉 Congratulations! You've reached your reading goal! 🎉
            </p>
          ) : percentage >= 75 ? (
            <p className="text-sm font-medium text-primary">
              📚 You're almost there! Keep up the great work!
            </p>
          ) : percentage >= 50 ? (
            <p className="text-sm font-medium text-primary">
              🚀 Halfway there! You're doing amazing!
            </p>
          ) : percentage >= 25 ? (
            <p className="text-sm font-medium text-primary">
              💪 Great progress! Keep the momentum going!
            </p>
          ) : (
            <p className="text-sm font-medium text-primary">
              🌟 Every book counts! You've got this!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};