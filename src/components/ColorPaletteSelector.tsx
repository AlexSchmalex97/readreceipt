import { useState } from "react";
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
  const { toast } = useToast();

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

  const applyPalette = (palette: ColorPalette) => {
    const root = document.documentElement;
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose Your Color Palette</DialogTitle>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}