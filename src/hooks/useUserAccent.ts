import { useEffect, useState } from "react";

interface AccentPalette {
  headerTextColor?: string;
  accentCardColor: string;
  accentTextColor: string;
}

// Read accent colors from the current theme CSS variables so
// GlobalUserColors / UserColorProvider automatically flow through.
export function useUserAccent(): AccentPalette {
  const [palette, setPalette] = useState<AccentPalette>(() => ({
    accentCardColor: "hsl(var(--card))",
    accentTextColor: "hsl(var(--card-foreground))",
    headerTextColor: "hsl(var(--foreground))",
  }));

  useEffect(() => {
    // Guard for non-browser environments
    if (typeof window === "undefined") return;

    const cs = getComputedStyle(document.documentElement);
    const read = (token: string) => cs.getPropertyValue(`--${token}`).trim();
    const toHsl = (value: string | null | undefined) => {
      if (!value) return "";
      const trimmed = value.trim();
      if (trimmed.startsWith("hsl(")) return trimmed;
      return `hsl(${trimmed})`;
    };

    const card = read("card") || read("accent") || read("background");
    const cardFg = read("card-foreground") || read("accent-foreground") || read("foreground");
    const header = read("foreground") || cardFg;

    setPalette({
      accentCardColor: toHsl(card) || "hsl(var(--card))",
      accentTextColor: toHsl(cardFg) || "hsl(var(--card-foreground))",
      headerTextColor: toHsl(header) || "hsl(var(--foreground))",
    });
  }, []);

  return palette;
}
