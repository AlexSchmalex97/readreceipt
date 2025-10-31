import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserColorProvider } from "@/components/UserColorProvider";

// Wrap children and apply user's palette globally if color_palette.apply_globally is true
export default function GlobalUserColors({ children }: { children: React.ReactNode }) {
  const [palette, setPalette] = useState<any | null>(null);
  const applyGlobally = useMemo(() => Boolean(palette?.apply_globally), [palette]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const user = sess.session?.user;
        if (!user) {
          if (mounted) setPalette(null);
          return;
        }
        const { data } = await supabase
          .from("profiles")
          .select("color_palette")
          .eq("id", user.id)
          .single();
        if (!mounted) return;
        setPalette((data as any)?.color_palette || null);
      } catch {
        if (mounted) setPalette(null);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      // reload on auth change
      (async () => {
        const { data: sess } = await supabase.auth.getSession();
        const user = sess.session?.user;
        if (!user) {
          setPalette(null);
          return;
        }
        const { data } = await supabase
          .from("profiles")
          .select("color_palette")
          .eq("id", user.id)
          .single();
        setPalette((data as any)?.color_palette || null);
      })();
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (applyGlobally && palette) {
    return <UserColorProvider userColorPalette={palette}>{children}</UserColorProvider>;
  }
  return <>{children}</>;
}
