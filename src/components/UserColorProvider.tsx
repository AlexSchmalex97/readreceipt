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

    // First, apply the color palette tokens (if any)
    if (userColorPalette && userColorPalette.name !== "default") {
      const palette = userColorPalette as ColorPalette;
      // Base brand tokens
      root.style.setProperty('--primary', palette.primary);
      root.style.setProperty('--secondary', palette.secondary);
      root.style.setProperty('--accent', palette.accent);
      root.style.setProperty('--foreground', palette.foreground);

      // Surfaces (will be overridden below if a background image is active)
      root.style.setProperty('--background', palette.background);
      root.style.setProperty('--card', palette.background);
      root.style.setProperty('--card-foreground', palette.foreground);
      root.style.setProperty('--popover', palette.background);
      root.style.setProperty('--popover-foreground', palette.foreground);

      // Misc
      root.style.setProperty('--muted', palette.secondary);
      root.style.setProperty('--muted-foreground', palette.foreground);
      root.style.setProperty('--accent-foreground', palette.foreground);
      root.style.setProperty('--border', palette.secondary);
      root.style.setProperty('--input', palette.secondary);
      root.style.setProperty('--ring', palette.primary);
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
    } else {
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
        root.style.setProperty('--primary', "30 40% 35%");
        root.style.setProperty('--secondary', "40 20% 85%");
        root.style.setProperty('--accent', "60 20% 80%");
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
        root.style.setProperty('--ring', "30 40% 35%");
      }
    };
  }, [userColorPalette, backgroundImageUrl, backgroundTint]);

  return <>{children}</>;
}