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
  children: React.ReactNode;
};

export function UserColorProvider({ userColorPalette, children }: UserColorProviderProps) {
  useEffect(() => {
    if (userColorPalette && userColorPalette.name !== "default") {
      const palette = userColorPalette as ColorPalette;
      const root = document.documentElement;
      
      // Apply user's custom color palette
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

    // Cleanup function to reset to default colors when component unmounts
    return () => {
      if (userColorPalette && userColorPalette.name !== "default") {
        const root = document.documentElement;
        // Reset to default colors
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
  }, [userColorPalette]);

  return <>{children}</>;
}