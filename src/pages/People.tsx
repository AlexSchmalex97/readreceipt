import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FollowButton } from "@/components/FollowButton";
import { Navigation } from "@/components/Navigation";

export default function People() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const debounced = useDebounce(q, 250);

  useEffect(() => {
    (async () => {
      setLoading(true);

      try {
        const term = debounced.trim();
        
        // Use direct query but only select safe fields (no email)
        let req = supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url, created_at")
          .order("created_at", { ascending: false })
          .limit(50);

        if (term) {
          req = supabase
            .from("profiles")
            .select("id, display_name, username, avatar_url, created_at")
            .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
            .order("created_at", { ascending: false })
            .limit(50);
        }

        const { data, error } = await req;
        
        if (!error) {
          setResults(data ?? []);
        } else {
          console.error('Error fetching profiles:', error);
          setResults([]);
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        setResults([]);
      }
      
      setLoading(false);
    })();
  }, [debounced]);

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Navigation />
      <div className="container mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-bold">Find readers</h1>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by @username or display name"
        className="w-full max-w-md px-3 py-2 rounded border bg-background"
      />

      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : results.length === 0 ? (
        <div className="text-muted-foreground">No users found.</div>
      ) : (
        <div className="grid gap-3">
          {results.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between bg-card p-3 rounded border hover:shadow-md transition-shadow"
            >
              <Link
                to={`/user/${p.id}`}
                className="flex items-center gap-3 flex-1 hover:text-primary transition-colors"
              >
                <img
                  src={p.avatar_url || "/assets/readreceipt-logo.png"}
                  className="w-9 h-9 rounded-full"
                  alt="Profile"
                />
                <div>
                  <div className="font-medium">{p.display_name || "Reader"}</div>
                  <div className="text-xs text-muted-foreground">
                    @{p.username || p.id.slice(0, 6)}
                  </div>
                </div>
              </Link>
              <FollowButton targetUserId={p.id} />
            </div>
          ))}
        </div>
      )}
      </div>
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
