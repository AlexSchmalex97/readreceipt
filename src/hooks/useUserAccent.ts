import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AccentPalette {
  headerTextColor?: string;
  accentCardColor: string;
  accentTextColor: string;
  progressBarColor: string;
}

// Default medium brown color for progress bar
const DEFAULT_PROGRESS_BAR_COLOR = "#8B6914";

// Accept either hex ("#RRGGBB") or bare HSL triplet ("210 80% 45%")
// and return a CSS-ready color string.
const isHslTriplet = (v: unknown): v is string => {
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (!s) return false;
  // matches: "H S% L%" (optionally with "/ A" or "/ A%")
  return /^\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%(?:\s*\/\s*(?:0?\.\d+|1|\d+(?:\.\d+)?%))?$/.test(s);
};

const toCssColor = (v: unknown): string | undefined => {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  if (isHslTriplet(s)) return `hsl(${s})`;
  return s;
};

// Read the user's saved accent colours directly from their profile
// so Profile, Home, Feed, Settings, etc. all stay in sync.
export function useUserAccent(): AccentPalette {
  const [palette, setPalette] = useState<AccentPalette>({
    accentCardColor: "hsl(var(--card))",
    accentTextColor: "hsl(var(--card-foreground))",
    headerTextColor: "hsl(var(--foreground))",
    progressBarColor: DEFAULT_PROGRESS_BAR_COLOR,
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("color_palette")
        .eq("id", user.id)
        .single();

      const colorPalette = (profile as any)?.color_palette || {};

      // Stored fields from Display settings
      const accentCardColor: string =
        toCssColor(colorPalette.accent_color || colorPalette.accent) ?? "hsl(var(--card))";
      const headerTextColor: string | undefined = toCssColor(
        colorPalette.text_color || colorPalette.foreground
      );

      // Compute readable text colour for accent sections, with optional override
      const computeAccentText = () => {
        const customText: string | undefined =
          colorPalette.accent_text_color || colorPalette.accentTextColor;
        const cssCustomText = toCssColor(customText);
        if (cssCustomText) return cssCustomText;

        const hex = accentCardColor;
        if (!hex || hex[0] !== "#" || (hex.length !== 7 && hex.length !== 4)) {
          return "hsl(var(--card-foreground))";
        }
        const expand = (h: string) =>
          h.length === 4
            ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`
            : h;
        const full = expand(hex);
        const r = parseInt(full.slice(1, 3), 16);
        const g = parseInt(full.slice(3, 5), 16);
        const b = parseInt(full.slice(5, 7), 16);
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return lum < 128 ? "#FFFFFF" : "#1A1A1A";
      };

      // Get progress bar color with default
      const progressBarColor: string =
        toCssColor(colorPalette.progress_bar_color) ?? DEFAULT_PROGRESS_BAR_COLOR;

      setPalette({
        headerTextColor,
        accentCardColor,
        accentTextColor: computeAccentText(),
        progressBarColor,
      });
    };

    load();
  }, []);

  return palette;
}
