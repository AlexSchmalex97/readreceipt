import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";
import { Link } from "react-router-dom";

interface FollowersDialogProps {
  userId: string;
  type: "followers" | "following";
  count: number;
}

interface ProfileData {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export function FollowersDialog({ userId, type, count }: FollowersDialogProps) {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadProfiles();
    }
  }, [open, userId, type]);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      if (type === "followers") {
        // Get people who follow this user
        const { data: follows } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("following_id", userId);

        if (follows && follows.length > 0) {
          const followerIds = follows.map(f => f.follower_id);
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, display_name, username, avatar_url")
            .in("id", followerIds);
          
          setProfiles(profilesData || []);
        } else {
          setProfiles([]);
        }
      } else {
        // Get people this user follows
        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", userId);

        if (follows && follows.length > 0) {
          const followingIds = follows.map(f => f.following_id);
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, display_name, username, avatar_url")
            .in("id", followingIds);
          
          setProfiles(profilesData || []);
        } else {
          setProfiles([]);
        }
      }
    } catch (error) {
      console.error("Error loading profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          <span className="font-semibold">{count}</span>
          <span className="text-muted-foreground">{type === "followers" ? "Followers" : "Following"}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{type === "followers" ? "Followers" : "Following"}</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : profiles.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No {type === "followers" ? "followers" : "following"} yet
          </div>
        ) : (
          <div className="space-y-2">
            {profiles.map((profile) => (
              <Link
                key={profile.id}
                to={`/${profile.username || profile.id}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
              >
                <img
                  src={profile.avatar_url || "/assets/default-avatar.png"}
                  alt={profile.display_name || profile.username || "User"}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {profile.display_name || profile.username}
                  </p>
                  {profile.display_name && profile.username && (
                    <p className="text-sm text-muted-foreground truncate">
                      @{profile.username}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
