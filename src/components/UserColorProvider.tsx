import { useEffect } from "react";

type ColorPalette = {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
};

type UserColorProviderProps = {
  userColorPalette?: any;
  backgroundImageUrl?: string | null;
  backgroundTint?: { color: string; opacity: number } | null;
  children: React.ReactNode;
};

export function UserColorProvider({ userColorPalette, backgroundImageUrl, backgroundTint, children }: UserColorProviderProps) {
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    const isHex = (v: unknown): v is string =>
      typeof v === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());

    const hexToHsl = (hex: string): string => {
      const h = hex.trim().toLowerCase();
      const full = h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h;
      const r = parseInt(full.slice(1, 3), 16) / 255;
      const g = parseInt(full.slice(3, 5), 16) / 255;
      const b = parseInt(full.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;
      let hh = 0;
      let ss = 0;
      const ll = (max + min) / 2;

      if (d !== 0) {
        ss = d / (1 - Math.abs(2 * ll - 1));
        switch (max) {
          case r:
            hh = ((g - b) / d + (g < b ? 6 : 0)) * 60;
            break;
          case g:
            hh = ((b - r) / d + 2) * 60;
            break;
          case b:
            hh = ((r - g) / d + 4) * 60;
            break;
        }
      }

      return `${Math.round(hh)} ${Math.round(ss * 100)}% ${Math.round(ll * 100)}%`;
    };

    const normalizeHsl = (value: unknown): string | undefined => {
      if (value == null) return undefined;
      const v = String(value).trim();
      if (!v) return undefined;
      if (isHex(v)) return hexToHsl(v);
      return v;
    };

    const hslLightness = (hslTriplet: string | undefined) => {
      if (!hslTriplet) return null;
      const m = hslTriplet.match(/\b(\d+(?:\.\d+)?)%\b\s*(?:\/|$)/g);
      // expects "H S% L%"; we want L% (3rd token)
      const parts = hslTriplet.split(" ");
      const l = parts?.[2];
      const n = l ? parseFloat(l.replace("%", "")) : NaN;
      return Number.isFinite(n) ? n : null;
    };

    // First, apply the color palette tokens (if any)
    if (userColorPalette && userColorPalette.name !== "default") {
      const p: any = userColorPalette;
      const name: string = p.name || (p.apply_globally ? "custom" : "accent-only");

      const primary = normalizeHsl(p.primary ?? p.accent ?? p.accent_color);
      const accent = normalizeHsl(p.accent ?? p.accent_color ?? p.primary);
      const secondary = normalizeHsl(p.secondary);
      const background = normalizeHsl(p.background ?? p.background_color);
      const foreground = normalizeHsl(p.foreground ?? p.text_color);

      // Base brand tokens
      if (primary) root.style.setProperty("--primary", primary);
      if (accent) root.style.setProperty("--accent", accent);
      if (primary || accent) root.style.setProperty("--ring", primary || accent!);

      // Keep gradients in sync with the active accent
      if (accent) root.style.setProperty("--progress-start", accent);
      if (primary || accent) root.style.setProperty("--progress-end", (primary || accent!) as string);
      if (accent) root.style.setProperty("--reading-pink", accent);
      if (primary || accent) root.style.setProperty("--reading-red", (primary || accent!) as string);

      // Improve contrast automatically for primary foreground
      const l = hslLightness(primary || accent);
      if (l != null) {
        root.style.setProperty("--primary-foreground", l > 65 ? "0 0% 10%" : "0 0% 100%");
      }

      // Only apply full palette customizations if not accent-only mode
      if (name !== "accent-only") {
        if (secondary) {
          root.style.setProperty("--secondary", secondary);
          root.style.setProperty("--muted", secondary);
          root.style.setProperty("--border", secondary);
          root.style.setProperty("--input", secondary);
        }
        if (foreground) {
          root.style.setProperty("--foreground", foreground);
          root.style.setProperty("--card-foreground", foreground);
          root.style.setProperty("--popover-foreground", foreground);
          root.style.setProperty("--muted-foreground", foreground);
          root.style.setProperty("--accent-foreground", foreground);
        }
        // Surfaces (will be overridden below if a background image is active)
        if (background) {
          root.style.setProperty("--background", background);
          root.style.setProperty("--card", background);
          root.style.setProperty("--popover", background);
        }
      }
    }

    // Then, apply background image (and make surfaces transparent) if present
    if (backgroundImageUrl) {
      // Apply tint overlay if configured
      if (backgroundTint && backgroundTint.opacity > 0) {
        const { color, opacity } = backgroundTint;
        const hexOpacity = Math.round(opacity * 255).toString(16).padStart(2, '0');
        body.style.background = `linear-gradient(${color}${hexOpacity}, ${color}${hexOpacity}), url(${backgroundImageUrl})`;
        body.style.backgroundSize = 'cover';
        body.style.backgroundPosition = 'center';
        body.style.backgroundAttachment = 'fixed';
      } else {
        body.style.backgroundImage = `url(${backgroundImageUrl})`;
        body.style.backgroundSize = 'cover';
        body.style.backgroundPosition = 'center';
        body.style.backgroundAttachment = 'fixed';
      }

      // Make the default surfaces translucent neutral so the body image shows through
      // while keeping cards/header readable. Individual components can still override
      // colours (e.g. via useUserAccent) on top of this.
      root.style.setProperty('--background', '0 0% 100% / 0');
      root.style.setProperty('--card', '0 0% 100% / 0.8');
      root.style.setProperty('--popover', '0 0% 100% / 0.9');
      // Ensure popovers (like date pickers) stay readable on top of the light popover surface
      root.style.setProperty('--popover-foreground', '0 0% 10%');
      // No background image → clear any body applied backgrounds
      body.style.background = '';
      body.style.backgroundImage = '';
      body.style.backgroundSize = '';
      body.style.backgroundPosition = '';
      body.style.backgroundAttachment = '';
      // When image is not active, leave palette-driven tokens as set above
    }

    // Cleanup function to reset to default
    return () => {
      const body = document.body;
      
      // Reset background image
      body.style.background = '';
      body.style.backgroundImage = '';
      body.style.backgroundSize = '';
      body.style.backgroundPosition = '';
      body.style.backgroundAttachment = '';

      // Reset to default colors if custom palette was applied
      if (userColorPalette && userColorPalette.name !== "default") {
        // Always reset primary/accent/ring
        root.style.setProperty('--primary', "30 40% 35%");
        root.style.setProperty('--accent', "60 20% 80%");
        root.style.setProperty('--ring', "30 40% 35%");
        
        // Only reset full palette if not accent-only
        if (userColorPalette.name !== "accent-only") {
          root.style.setProperty('--secondary', "40 20% 85%");
          root.style.setProperty('--background', "40 30% 96%");
          root.style.setProperty('--foreground', "30 25% 20%");
          root.style.setProperty('--card', "40 30% 98%");
          root.style.setProperty('--card-foreground', "30 25% 20%");
          root.style.setProperty('--popover', "40 30% 98%");
          root.style.setProperty('--popover-foreground', "30 25% 20%");
          root.style.setProperty('--muted', "40 15% 88%");
          root.style.setProperty('--muted-foreground', "30 15% 40%");
          root.style.setProperty('--accent-foreground', "30 25% 20%");
          root.style.setProperty('--border', "40 20% 85%");
          root.style.setProperty('--input', "40 20% 90%");
        }
      }
    };
  }, [userColorPalette, backgroundImageUrl, backgroundTint]);

  return <>{children}</>;
}