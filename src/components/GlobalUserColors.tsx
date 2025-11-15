import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserColorProvider } from "@/components/UserColorProvider";

// Wrap children and apply user's palette globally if color_palette.apply_globally is true
export default function GlobalUserColors({ children }: { children: React.ReactNode }) {
  const [palette, setPalette] = useState<any | null>(null);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const applyGlobally = useMemo(() => Boolean(palette?.apply_globally), [palette]);

  // Build a safe, complete palette with fallbacks to current CSS tokens
  const effectivePalette = useMemo(() => {
    if (!palette) return null;
    const cs = getComputedStyle(document.documentElement);
    const read = (k: string) => cs.getPropertyValue(`--${k}`).trim();
    return {
      name: palette.name || "custom",
      primary: palette.primary || read("primary"),
      secondary: palette.secondary || read("secondary"),
      accent: palette.accent || read("accent"),
      background: palette.background || read("background"),
      foreground: palette.foreground || read("foreground"),
      // Provide foreground fallbacks if only background provided
    };
  }, [palette]);

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
          .select("color_palette, background_image_url")
          .eq("id", user.id)
          .single();
        if (!mounted) return;
        setPalette((data as any)?.color_palette || null);
        setBackgroundImageUrl((data as any)?.background_image_url || null);
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
          .select("color_palette, background_image_url")
          .eq("id", user.id)
          .single();
        setPalette((data as any)?.color_palette || null);
        setBackgroundImageUrl((data as any)?.background_image_url || null);
      })();
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (applyGlobally && (effectivePalette || palette)) {
    return <UserColorProvider userColorPalette={effectivePalette || palette} backgroundImageUrl={backgroundImageUrl}>{children}</UserColorProvider>;
  }
  return <>{children}</>;
}
