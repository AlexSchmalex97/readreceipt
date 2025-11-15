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
  children: React.ReactNode;
};

export function UserColorProvider({ userColorPalette, backgroundImageUrl, children }: UserColorProviderProps) {
  useEffect(() => {
    const root = document.documentElement;

    // Apply background image if present
    if (backgroundImageUrl) {
      root.style.setProperty('background-image', `url(${backgroundImageUrl})`);
      root.style.setProperty('background-size', 'cover');
      root.style.setProperty('background-position', 'center');
      root.style.setProperty('background-attachment', 'fixed');
    } else {
      root.style.removeProperty('background-image');
      root.style.removeProperty('background-size');
      root.style.removeProperty('background-position');
      root.style.removeProperty('background-attachment');
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
      // Reset background image
      root.style.removeProperty('background-image');
      root.style.removeProperty('background-size');
      root.style.removeProperty('background-position');
      root.style.removeProperty('background-attachment');

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
  }, [userColorPalette, backgroundImageUrl]);

  return <>{children}</>;
}