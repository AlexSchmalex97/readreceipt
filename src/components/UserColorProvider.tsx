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

    // Apply background image if present
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
    } else {
      body.style.background = '';
      body.style.backgroundImage = '';
      body.style.backgroundSize = '';
      body.style.backgroundPosition = '';
      body.style.backgroundAttachment = '';
    }

    // Apply color palette if present and not using default
    if (userColorPalette && userColorPalette.name !== "default") {
      const palette = userColorPalette as ColorPalette;
      
      root.style.setProperty('--primary', palette.primary);
      root.style.setProperty('--secondary', palette.secondary);
      root.style.setProperty('--accent', palette.accent);
      root.style.setProperty('--background', palette.background);
      root.style.setProperty('--foreground', palette.foreground);
      root.style.setProperty('--card', palette.background);
      root.style.setProperty('--card-foreground', palette.foreground);
      root.style.setProperty('--popover', palette.background);
      root.style.setProperty('--popover-foreground', palette.foreground);
      root.style.setProperty('--muted', palette.secondary);
      root.style.setProperty('--muted-foreground', palette.foreground);
      root.style.setProperty('--accent-foreground', palette.foreground);
      root.style.setProperty('--border', palette.secondary);
      root.style.setProperty('--input', palette.secondary);
      root.style.setProperty('--ring', palette.primary);
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