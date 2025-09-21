import { useEffect, useState } from "react";
import { hasSupabase, supabase } from "@/lib/supabase";
import { FollowButton } from "@/components/FollowButton";

export default function People() {
  const [profiles, setProfiles] = useState<any[]>([]);
  useEffect(() => {
    if (!hasSupabase || !supabase) return;
    supabase.from("profiles")
      .select("id, display_name, username, avatar_url")
      .order("created_at")
      .then(({ data }) => setProfiles(data ?? []));
  }, []);
  return (
    <div className="container mx-auto px-4 py-6 grid gap-4">
      {profiles.map(p => (
        <div key={p.id} className="flex items-center justify-between bg-card p-3 rounded border">
          <div className="flex items-center gap-3">
            <img src={p.avatar_url || "/readreceipt-logo.png"} className="w-8 h-8 rounded-full" />
            <div>
              <div className="font-medium">{p.display_name || "Reader"}</div>
              <div className="text-xs text-muted-foreground">@{p.username || p.id.slice(0,6)}</div>
            </div>
          </div>
          <FollowButton targetUserId={p.id} />
        </div>
      ))}
    </div>
  );
}
