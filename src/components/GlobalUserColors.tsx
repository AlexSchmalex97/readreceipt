import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserColorProvider } from "@/components/UserColorProvider";

// Wrap children and apply user's palette globally if color_palette.apply_globally is true
export default function GlobalUserColors({ children }: { children: React.ReactNode }) {
  const [palette, setPalette] = useState<any | null>(null);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [backgroundTint, setBackgroundTint] = useState<{ color: string; opacity: number } | null>(null);
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
          .select("color_palette, background_type, active_background_id")
          .eq("id", user.id)
          .single();
        if (!mounted) return;
        setPalette((data as any)?.color_palette || null);
        
        // Load background based on type
        if ((data as any)?.background_type === 'image' && (data as any)?.active_background_id) {
          const { data: bgData } = await supabase
            .from("saved_backgrounds")
            .select("image_url, tint_color, tint_opacity")
            .eq("id", (data as any).active_background_id)
            .single();
          
          if (bgData) {
            setBackgroundImageUrl(bgData.image_url);
            setBackgroundTint(bgData.tint_color && bgData.tint_opacity > 0 
              ? { color: bgData.tint_color, opacity: bgData.tint_opacity as number }
              : null
            );
          }
        } else {
          setBackgroundImageUrl(null);
          setBackgroundTint(null);
        }
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
          .select("color_palette, background_type, active_background_id")
          .eq("id", user.id)
          .single();
        setPalette((data as any)?.color_palette || null);
        
        // Load background based on type
        if ((data as any)?.background_type === 'image' && (data as any)?.active_background_id) {
          const { data: bgData } = await supabase
            .from("saved_backgrounds")
            .select("image_url, tint_color, tint_opacity")
            .eq("id", (data as any).active_background_id)
            .single();
          
          if (bgData) {
            setBackgroundImageUrl(bgData.image_url);
            setBackgroundTint(bgData.tint_color && bgData.tint_opacity > 0 
              ? { color: bgData.tint_color, opacity: bgData.tint_opacity as number }
              : null
            );
          }
        } else {
          setBackgroundImageUrl(null);
          setBackgroundTint(null);
        }
      })();
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (applyGlobally && (effectivePalette || palette)) {
    return <UserColorProvider userColorPalette={effectivePalette || palette} backgroundImageUrl={backgroundImageUrl} backgroundTint={backgroundTint}>{children}</UserColorProvider>;
  }
  return <>{children}</>;
}
