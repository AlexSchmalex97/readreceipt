import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Palette, Upload, X } from "lucide-react";
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
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Load saved custom colors and background image on mount
  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("color_palette, background_image_url")
        .eq("id", user.user.id)
        .single();
      if (data?.color_palette && typeof data.color_palette === 'object' && 'custom_colors' in data.color_palette) {
        const customColors = data.color_palette.custom_colors;
        if (Array.isArray(customColors)) {
          setSavedCustomColors(customColors as string[]);
        }
      }
      if (data?.background_image_url) {
        setBackgroundImageUrl(data.background_image_url);
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
        description: "Please enter a valid 6-digit hex code (e.g., #FF5733)",
        variant: "destructive"
      });
      return;
    }

    const hexToHSL = (hex: string): string => {
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

      h = Math.round(h * 360);
      s = Math.round(s * 100);
      l = Math.round(l * 100);

      return `${h} ${s}% ${l}%`;
    };

    const hslBackground = hexToHSL(customHexInput);
    const customPalette: ColorPalette = {
      name: "custom",
      primary: "30 40% 35%",
      secondary: "40 20% 85%",
      accent: "60 20% 80%",
      background: hslBackground,
      foreground: "30 25% 20%"
    };

    await handlePaletteSelect(customPalette);
  };

  const handleSaveCustomHex = async () => {
    if (!/^#[0-9A-F]{6}$/i.test(customHexInput)) {
      toast({
        title: "Invalid hex code",
        description: "Please enter a valid 6-digit hex code (e.g., #FF5733)",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const newColors = Array.from(new Set([...savedCustomColors, customHexInput])).slice(0, 10);

      const { data } = await supabase
        .from("profiles")
        .select("color_palette")
        .eq("id", user.user.id)
        .single();

      const existingPalette = (data?.color_palette && typeof data.color_palette === 'object') ? data.color_palette : {};
      
      const updatedPalette = {
        ...existingPalette,
        custom_colors: newColors
      };

      const { error } = await supabase
        .from("profiles")
        .update({ color_palette: updatedPalette })
        .eq("id", user.user.id);

      if (error) throw error;

      setSavedCustomColors(newColors);
      setCustomHexInput("");

      toast({
        title: "Custom color saved!",
        description: "Your custom color has been saved to your palette."
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploadingImage(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `background-${user.user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Save to saved_backgrounds and activate as current background
      // 1) Keep profile field for backwards-compat preview
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ background_image_url: publicUrl })
        .eq("id", user.user.id);
      if (updateError) throw updateError;

      // 2) Create a saved background entry
      const { data: savedBg, error: saveBgError } = await supabase
        .from("saved_backgrounds")
        .insert({
          user_id: user.user.id,
          image_url: publicUrl,
          name: "Uploaded Background",
          tint_color: null,
          tint_opacity: 0
        })
        .select()
        .single();
      if (saveBgError) throw saveBgError;

      // 3) Activate photo backgrounds
      const { error: activateError } = await supabase
        .from("profiles")
        .update({
          background_type: 'image',
          active_background_id: savedBg.id
        })
        .eq("id", user.user.id);
      if (activateError) throw activateError;

      setBackgroundImageUrl(publicUrl);
      setIsOpen(false);
      onPaletteChange?.();

      toast({
        title: "Background image uploaded!",
        description: "Saved to your Background Photos and set as active."
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error uploading image",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveBackgroundImage = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ background_image_url: null })
        .eq("id", user.user.id);

      if (error) throw error;

      setBackgroundImageUrl(null);
      onPaletteChange?.();

      toast({
        title: "Background image removed",
        description: "Your background has been reset to color palette."
      });
    } catch (error) {
      console.error("Error removing background image:", error);
      toast({
        title: "Error removing image",
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
          <DialogTitle>Customize Your Background</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Background Image Section */}
          <div>
            <h3 className="text-sm font-medium mb-3">Background Image</h3>
            {backgroundImageUrl ? (
              <div className="relative">
                <img 
                  src={backgroundImageUrl} 
                  alt="Current background" 
                  className="w-full h-32 object-cover rounded-lg border"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveBackgroundImage}
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="background-upload"
                  disabled={isUploadingImage}
                />
                <label 
                  htmlFor="background-upload" 
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <div className="text-sm">
                    <span className="font-medium text-primary">Click to upload</span>
                    <span className="text-muted-foreground"> or drag and drop</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Max file size: 5MB
                  </p>
                </label>
                {isUploadingImage && (
                  <p className="text-sm text-muted-foreground mt-2">Uploading...</p>
                )}
              </div>
            )}
          </div>

          {/* Color Palettes Section */}
          <div>
            <h3 className="text-sm font-medium mb-3">Preset Color Palettes</h3>
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

          {/* Custom Color Section */}
          <div>
            <h3 className="text-sm font-medium mb-3">Custom Color</h3>
            <div className="flex gap-2 items-center mb-3">
              <input
                type="text"
                placeholder="#FF5733"
                value={customHexInput}
                onChange={(e) => setCustomHexInput(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 border rounded-md text-sm"
                maxLength={7}
              />
              <Button onClick={handleCustomHexApply} variant="secondary">
                Apply
              </Button>
              <Button onClick={handleSaveCustomHex} variant="outline">
                Save
              </Button>
            </div>
            
            {savedCustomColors.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Saved custom colors:</p>
                <div className="flex gap-2 flex-wrap">
                  {savedCustomColors.map((color, idx) => (
                    <div
                      key={idx}
                      className="w-8 h-8 rounded-md border cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => setCustomHexInput(color)}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}