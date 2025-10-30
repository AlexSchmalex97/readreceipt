import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type ColorPalette = {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
};

const COLOR_PALETTES: ColorPalette[] = [
  {
    name: "default",
    primary: "30 40% 35%",
    secondary: "40 20% 85%",
    accent: "60 20% 80%",
    background: "40 30% 96%",
    foreground: "30 25% 20%"
  },
  {
    name: "ocean",
    primary: "210 80% 45%",
    secondary: "210 20% 85%",
    accent: "200 30% 80%",
    background: "210 30% 96%",
    foreground: "210 25% 20%"
  },
  {
    name: "forest",
    primary: "120 50% 35%",
    secondary: "120 20% 85%",
    accent: "100 30% 80%",
    background: "120 30% 96%",
    foreground: "120 25% 20%"
  },
  {
    name: "sunset",
    primary: "15 80% 55%",
    secondary: "15 20% 85%",
    accent: "30 50% 80%",
    background: "15 30% 96%",
    foreground: "15 25% 20%"
  },
  {
    name: "purple",
    primary: "270 60% 45%",
    secondary: "270 20% 85%",
    accent: "280 30% 80%",
    background: "270 30% 96%",
    foreground: "270 25% 20%"
  },
  {
    name: "rose",
    primary: "340 70% 45%",
    secondary: "340 20% 85%",
    accent: "350 30% 80%",
    background: "340 30% 96%",
    foreground: "340 25% 20%"
  }
];

type ColorPaletteSelectorProps = {
  currentPalette?: any;
  onPaletteChange?: () => void;
};

export function ColorPaletteSelector({ currentPalette, onPaletteChange }: ColorPaletteSelectorProps) {
  const [selectedPalette, setSelectedPalette] = useState<string>(currentPalette?.name || "default");
  const [isOpen, setIsOpen] = useState(false);
  const [customHexInput, setCustomHexInput] = useState("");
  const [savedCustomColors, setSavedCustomColors] = useState<string[]>([]);
  const { toast } = useToast();

  // Load saved custom colors on mount
  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("color_palette")
        .eq("id", user.user.id)
        .single();
      if (data?.color_palette && typeof data.color_palette === 'object' && 'custom_colors' in data.color_palette) {
        const customColors = data.color_palette.custom_colors;
        if (Array.isArray(customColors)) {
          setSavedCustomColors(customColors as string[]);
        }
      }
    })();
  }, []);

  const handlePaletteSelect = async (palette: ColorPalette) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ color_palette: palette })
        .eq("id", user.user.id);

      if (error) throw error;

      setSelectedPalette(palette.name);
      applyPalette(palette);
      setIsOpen(false);
      onPaletteChange?.();
      
      toast({
        title: "Color palette updated!",
        description: "Your new color palette has been saved."
      });
    } catch (error) {
      console.error("Error updating color palette:", error);
      toast({
        title: "Error updating palette",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleCustomHexApply = async () => {
    if (!/^#[0-9A-F]{6}$/i.test(customHexInput)) {
      toast({
        title: "Invalid hex code",
        description: "Please enter a valid hex code (e.g., #FF5733)",
        variant: "destructive"
      });
      return;
    }

    // Convert hex to HSL
    const hexToHSL = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    const hsl = hexToHSL(customHexInput);
    const customPalette: ColorPalette = {
      name: "custom",
      primary: hsl,
      secondary: `${hsl.split(' ')[0]} 20% 85%`,
      accent: `${hsl.split(' ')[0]} 30% 80%`,
      background: `${hsl.split(' ')[0]} 30% 96%`,
      foreground: parseInt(hsl.split('%')[2]) < 50 ? "0 0% 100%" : "0 0% 20%",
    };

    await handlePaletteSelect(customPalette);
  };

  const handleSaveCustomHex = async () => {
    if (!/^#[0-9A-F]{6}$/i.test(customHexInput)) {
      toast({
        title: "Invalid hex code",
        description: "Please enter a valid hex code",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const newCustomColors = [...new Set([...savedCustomColors, customHexInput])].slice(0, 8);
      
      const { error } = await supabase
        .from("profiles")
        .update({
          color_palette: {
            ...currentPalette,
            custom_colors: newCustomColors
          }
        })
        .eq("id", user.user.id);

      if (error) throw error;

      setSavedCustomColors(newCustomColors);
      toast({
        title: "Custom color saved!",
        description: "Your custom color has been added to your saved colors."
      });
    } catch (error) {
      console.error("Error saving custom color:", error);
      toast({
        title: "Error saving color",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const applyPalette = (palette: ColorPalette) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', palette.primary);
    root.style.setProperty('--secondary', palette.secondary);
    root.style.setProperty('--accent', palette.accent);
    root.style.setProperty('--background', palette.background);
    
    // Auto-detect if foreground should be white for dark colors
    const bgLightness = parseInt(palette.background.split('%')[2] || "96");
    const autoForeground = bgLightness < 50 ? "0 0% 100%" : palette.foreground;
    
    root.style.setProperty('--foreground', autoForeground);
    root.style.setProperty('--card', palette.background);
    root.style.setProperty('--card-foreground', autoForeground);
    root.style.setProperty('--popover', palette.background);
    root.style.setProperty('--popover-foreground', autoForeground);
    root.style.setProperty('--muted', palette.secondary);
    root.style.setProperty('--muted-foreground', autoForeground);
    root.style.setProperty('--accent-foreground', autoForeground);
    root.style.setProperty('--border', palette.secondary);
    root.style.setProperty('--input', palette.secondary);
    root.style.setProperty('--ring', palette.primary);
  };

  const getPalettePreview = (palette: ColorPalette) => (
    <div className="flex gap-1">
      <div 
        className="w-4 h-4 rounded-full border"
        style={{ backgroundColor: `hsl(${palette.primary})` }}
      />
      <div 
        className="w-4 h-4 rounded-full border"
        style={{ backgroundColor: `hsl(${palette.secondary})` }}
      />
      <div 
        className="w-4 h-4 rounded-full border"
        style={{ backgroundColor: `hsl(${palette.accent})` }}
      />
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Palette className="w-4 h-4" />
          Color Palette
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose Your Color Palette</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-3">Preset Palettes</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {COLOR_PALETTES.map((palette) => (
                <Card 
                  key={palette.name}
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    selectedPalette === palette.name ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handlePaletteSelect(palette)}
                >
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm capitalize">{palette.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    {getPalettePreview(palette)}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">Custom Color</h3>
            <div className="flex gap-2 items-center mb-3">
              <input
                type="text"
                className="border rounded px-3 py-2 bg-background flex-1"
                value={customHexInput}
                onChange={(e) => setCustomHexInput(e.target.value)}
                placeholder="#FF5733"
                maxLength={7}
              />
              <Button onClick={handleCustomHexApply} variant="outline">
                Apply
              </Button>
              <Button onClick={handleSaveCustomHex} variant="outline">
                Save
              </Button>
            </div>
            
            {savedCustomColors.length > 0 && (
              <>
                <h4 className="text-xs text-muted-foreground mb-2">Saved Custom Colors</h4>
                <div className="grid grid-cols-4 gap-2">
                  {savedCustomColors.map((hex, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCustomHexInput(hex);
                        handleCustomHexApply();
                      }}
                      className="h-12 rounded border-2 border-border hover:border-primary/50 transition-all"
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}