import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { UserPlus, Users } from "lucide-react";

interface BookActivity {
  id: string;
  title: string;
  author: string;
  current_page: number;
  total_pages: number;
  user: {
    username: string;
    full_name: string | null;
  };
}

export const SocialFeed = () => {
  const [activities, setActivities] = useState<BookActivity[]>([]);
  const [searchUsername, setSearchUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchFriendsActivities();
    }
  }, [user]);

  const fetchFriendsActivities = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('books')
        .select(`
          id,
          title,
          author,
          current_page,
          total_pages,
          profiles!books_user_id_fkey (
            username,
            full_name
          )
        `)
        .eq('is_public', true)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedActivities = (data || []).map(book => ({
        id: book.id,
        title: book.title,
        author: book.author,
        current_page: book.current_page,
        total_pages: book.total_pages,
        user: {
          username: (book.profiles as any)?.username || 'Unknown',
          full_name: (book.profiles as any)?.full_name || null,
        }
      }));

      setActivities(formattedActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const followUser = async (username: string) => {
    if (!user) return;

    setLoading(true);
    try {
      // Find user by username
      const { data: targetUser, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();

      if (userError) throw new Error('User not found');

      // Check if already following
      const { data: existingFollow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUser.id)
        .single();

      if (existingFollow) {
        toast({ title: "You're already following this user!" });
        return;
      }

      // Create follow relationship
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: targetUser.id,
        });

      if (error) throw error;

      toast({ title: `Now following ${username}!` });
      setSearchUsername("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = (current: number, total: number) => {
    return Math.round((current / total) * 100);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Follow Friends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter username to follow"
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
            />
            <Button
              onClick={() => followUser(searchUsername)}
              disabled={!searchUsername || loading}
            >
              Follow
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Community Reading Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No reading activity to show. Follow some friends to see their progress!
            </p>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="border border-border/50 rounded-lg p-4 bg-gradient-subtle"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-foreground">{activity.title}</h4>
                    <p className="text-sm text-muted-foreground">by {activity.author}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary">
                      @{activity.user.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.user.full_name}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Page {activity.current_page} of {activity.total_pages}</span>
                    <span className="font-medium text-primary">
                      {getProgressPercentage(activity.current_page, activity.total_pages)}%
                    </span>
                  </div>
                  <Progress value={getProgressPercentage(activity.current_page, activity.total_pages)} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};