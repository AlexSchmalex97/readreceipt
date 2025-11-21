import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AccentPalette {
  headerTextColor?: string;
  accentCardColor: string;
  accentTextColor: string;
}

// Reuse the same accent color logic used on the profile page
export function useUserAccent(): AccentPalette {
  const [palette, setPalette] = useState<AccentPalette>({
    accentCardColor: "#ffffff",
    accentTextColor: "#1A1A1A",
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
      const accentCardColor: string = colorPalette.accent_color || "#ffffff";
      const headerTextColor: string | undefined = colorPalette.text_color;

      // Compute readable text color for accent sections (same as ProfileDisplay)
      const computeAccentText = () => {
        const customTextHex: string | undefined = colorPalette.accent_text_color;
        if (customTextHex) return customTextHex;
        const hex = accentCardColor;
        if (!hex || hex[0] !== "#" || (hex.length !== 7 && hex.length !== 4)) {
          return "#1A1A1A";
        }
        const expand = (h: string) => (h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h);
        const full = expand(hex);
        const r = parseInt(full.slice(1, 3), 16);
        const g = parseInt(full.slice(3, 5), 16);
        const b = parseInt(full.slice(5, 7), 16);
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return lum < 128 ? "#FFFFFF" : "#1A1A1A";
      };

      setPalette({
        headerTextColor,
        accentCardColor,
        accentTextColor: computeAccentText(),
      });
    };

    load();
  }, []);

  return palette;
}
