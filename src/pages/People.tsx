import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FollowButton } from "@/components/FollowButton";
import { Navigation } from "@/components/Navigation";
import { RefreshCw } from "lucide-react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useToast } from "@/hooks/use-toast";
import { usePlatform } from "@/hooks/usePlatform";

export default function People() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();
  const { isIOS } = usePlatform();

  const { scrollableRef, pullDistance, isRefreshing, showPullIndicator } = usePullToRefresh({
    onRefresh: async () => {
      // Re-run search if there's a query
      if (q.trim()) {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .rpc('get_safe_public_profiles', { 
              search: q.trim(), 
              limit_count: 50 
            });
          if (!error) {
            setResults(data ?? []);
          }
        } catch (error) {
          console.error('Error:', error);
        }
        setLoading(false);
      }
      toast({
        title: "Refreshed!",
        description: "Search results updated.",
      });
    },
  });

  const debounced = useDebounce(q, 250);

  useEffect(() => {
    (async () => {
      const term = debounced.trim();
      
      // Don't search if there's no search term
      if (!term) {
        setResults([]);
        setLoading(false);
        setHasSearched(false);
        return;
      }

      setLoading(true);
      setHasSearched(true);

      try {
        const { data, error } = await supabase
          .rpc('get_safe_public_profiles', { 
            search: term, 
            limit_count: 50 
          });
        
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
      <div 
        ref={scrollableRef}
        className="relative overflow-y-auto"
        style={{ height: isIOS ? 'calc(100vh - 64px - 64px)' : 'calc(100vh - 64px)' }}
      >
        {/* Pull-to-refresh indicator */}
        {showPullIndicator && (
          <div 
            className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 z-10"
            style={{ 
              height: `${pullDistance}px`,
              opacity: Math.min(pullDistance / 80, 1),
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <RefreshCw 
                className={`w-6 h-6 text-primary ${isRefreshing ? 'animate-spin' : ''}`}
                style={{
                  transform: `rotate(${pullDistance * 3}deg)`,
                }}
              />
              <span className="text-xs text-muted-foreground">
                {isRefreshing ? 'Refreshing...' : pullDistance >= 80 ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </div>
          </div>
        )}

      <div className="container mx-auto px-4 py-6 space-y-4"
        style={{ paddingTop: showPullIndicator ? `${pullDistance + 24}px` : undefined }}
      >
      <h1 className="text-2xl font-bold">Find readers</h1>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by @username or display name"
        className="w-full max-w-md px-3 py-2 rounded border bg-background"
      />

      {loading ? (
        <div className="text-muted-foreground">Searching…</div>
      ) : !hasSearched ? (
        <div className="text-muted-foreground">Enter a username or display name to find readers.</div>
      ) : results.length === 0 ? (
        <div className="text-muted-foreground">No users found for "{q.trim()}".</div>
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
