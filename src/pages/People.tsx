import { useEffect, useState } from "react";
import { hasSupabase, supabase } from "@/lib/supabase";
import { FollowButton } from "@/components/FollowButton";

export default function People() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const debounced = useDebounce(q, 250);

  useEffect(() => {
    if (!hasSupabase || !supabase) return;
    (async () => {
      setLoading(true);

      // Base query
      let query = supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .order("created_at", { ascending: false })
        .limit(50);

      // If searching, look in display_name OR username (case-insensitive)
      if (debounced.trim()) {
        const like = `%${debounced.trim()}%`;
        query = supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url")
          .or(`display_name.ilike.${like},username.ilike.${like}`)
          .order("created_at", { ascending: false })
          .limit(50);
      }

      const { data, error } = await query;
      if (!error) setResults(data ?? []);
      setLoading(false);
    })();
  }, [debounced]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-bold">Find readers</h1>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name or username"
        className="w-full max-w-md px-3 py-2 rounded border bg-background"
      />

      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : results.length === 0 ? (
        <div className="text-muted-foreground">No users found.</div>
      ) : (
        <div className="grid gap-3">
          {results.map((p) => (
            <div key={p.id} className="flex items-center justify-between bg-card p-3 rounded border">
              <div className="flex items-center gap-3">
                <img
                  src={p.avatar_url || "/assets/readreceipt-logo.png"}
                  className="w-9 h-9 rounded-full"
                />
                <div>
                  <div className="font-medium">{p.display_name || "Reader"}</div>
                  <div className="text-xs text-muted-foreground">@{p.username || p.id.slice(0, 6)}</div>
                </div>
              </div>
              <FollowButton targetUserId={p.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** tiny debounce hook */
function useDebounce<T>(value: T, delay = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
