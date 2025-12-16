import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UserColorProvider } from "@/components/UserColorProvider";

// Wrap children and apply user's color palette globally when signed in
export default function GlobalUserColors({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [palette, setPalette] = useState<any | null>(null);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [backgroundTint, setBackgroundTint] = useState<{ color: string; opacity: number } | null>(null);
  
  // Check if we're viewing another user's profile (/:username route)
  const isViewingUserProfile = useMemo(() => {
    const path = location.pathname;
    // Exclude known routes, anything else with pattern /:username is a user profile
    const knownRoutes = [
      '/', '/home', '/auth', '/contact', '/feed', '/people', '/reviews', 
      '/profile', '/settings', '/tbr', '/more', '/completed', '/integrations', '/notifications'
    ];
    const isKnownRoute = knownRoutes.includes(path) || path.startsWith('/profile/');
    return !isKnownRoute && path !== '/' && path.length > 1;
  }, [location.pathname]);

  // Build a safe, complete palette with fallbacks to current CSS tokens
  const effectivePalette = useMemo(() => {
    if (!palette) return null;
    const cs = getComputedStyle(document.documentElement);
    const read = (k: string) => cs.getPropertyValue(`--${k}`).trim();
    const p: any = palette;
    // Normalize keys from stored color_palette (accent_color, text_color, etc.)
    const accentColor = p.accent || p.accent_color || read("accent");
    const background = p.background || p.background_color || read("background");
    const foreground = p.foreground || p.text_color || read("foreground");
    return {
      name: p.name || "custom",
      primary: p.primary || accentColor || read("primary"),
      secondary: p.secondary || read("secondary"),
      accent: accentColor,
      background,
      foreground,
    };
  }, [palette]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const user = sess.session?.user;
        if (!user) {
          if (mounted) {
            setPalette(null);
            setBackgroundImageUrl(null);
            setBackgroundTint(null);
          }
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
          if (!mounted) return;
          if (bgData) {
            setBackgroundImageUrl(bgData.image_url);
            setBackgroundTint(bgData.tint_color && (bgData.tint_opacity as number) > 0
              ? { color: bgData.tint_color, opacity: bgData.tint_opacity as number }
              : null
            );
          } else {
            setBackgroundImageUrl(null);
            setBackgroundTint(null);
          }
        } else {
          setBackgroundImageUrl(null);
          setBackgroundTint(null);
        }
      } catch {
        if (mounted) {
          setPalette(null);
          setBackgroundImageUrl(null);
          setBackgroundTint(null);
        }
      }
    };

    // Initial load
    load();

    // Reload on auth changes
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    // Listen for profile updates from settings
    const onProfileChanged = () => load();
    window.addEventListener('profile-updated', onProfileChanged);

    // Listen for explicit background updates from settings
    const onBgChanged = () => load();
    window.addEventListener('profile-background-changed', onBgChanged);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      window.removeEventListener('profile-updated', onProfileChanged);
      window.removeEventListener('profile-background-changed', onBgChanged);
    };
  }, []);

  // Don't apply logged-in user's customizations when viewing another user's profile
  // Let the UserProfile page handle customizations for the viewed user
  if (isViewingUserProfile) {
    return <>{children}</>;
  }

  // Always apply background image and full color palette globally when user is logged in.
  // Full palette is always applied for the logged-in user's experience.
  const paletteForTheme = effectivePalette || null;

  if (backgroundImageUrl || paletteForTheme) {
    return (
      <UserColorProvider
        userColorPalette={paletteForTheme || undefined}
        backgroundImageUrl={backgroundImageUrl}
        backgroundTint={backgroundTint}
      >
        {children}
      </UserColorProvider>
    );
  }
  return <>{children}</>;
}
