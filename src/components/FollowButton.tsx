import { useEffect, useState } from "react";
import { hasSupabase, supabase } from "@/lib/supabase";

export function FollowButton({ targetUserId }: { targetUserId: string }) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSupabase || !supabase) return;
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!myId || !targetUserId || !supabase) return;
    supabase.from("follows")
      .select("follower_id").eq("follower_id", myId).eq("following_id", targetUserId)
      .maybeSingle().then(({ data }) => setFollowing(!!data));
  }, [myId, targetUserId]);

  const toggle = async () => {
    if (!myId || !supabase) return;
    if (following) {
      await supabase.from("follows")
        .delete().eq("follower_id", myId).eq("following_id", targetUserId);
      setFollowing(false);
    } else {
      await supabase.from("follows")
        .insert([{ follower_id: myId, following_id: targetUserId }]);
      setFollowing(true);
    }
  };

  if (myId === targetUserId) return null;

  return (
    <button onClick={toggle} className="px-3 py-2 rounded border">
      {following ? "Following" : "Follow"}
    </button>
  );
}
