import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, X, Image as ImageIcon, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SavedBackground {
  id: string;
  image_url: string;
  tint_color: string | null;
  tint_opacity: number;
  name: string | null;
}

interface BackgroundImageSettingsProps {
  backgroundImageUrl: string | null;
  backgroundTint: { color: string; opacity: number } | null;
  backgroundType: 'color' | 'image';
  onUpdate: () => void;
}

const PRESET_TINT_COLORS = [
  { name: "Black", value: "#000000" },
  { name: "White", value: "#FFFFFF" },
  { name: "Warm", value: "#FFA500" },
  { name: "Cool", value: "#0080FF" },
  { name: "Purple", value: "#8B00FF" },
  { name: "Green", value: "#00A36C" },
  { name: "Red", value: "#DC143C" },
  { name: "Blue", value: "#1E90FF" },
];

export function BackgroundImageSettings({ 
  backgroundImageUrl, 
  backgroundTint,
  backgroundType,
  onUpdate 
}: BackgroundImageSettingsProps) {
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [savedBackgrounds, setSavedBackgrounds] = useState<SavedBackground[]>([]);
  const [activeBackgroundId, setActiveBackgroundId] = useState<string | null>(null);
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
  const [tintColor, setTintColor] = useState("#000000");
  const [tintOpacity, setTintOpacity] = useState(0);
  const [backgroundName, setBackgroundName] = useState("");
  const { toast } = useToast();

  // Load saved backgrounds
  useEffect(() => {
    loadSavedBackgrounds();
  }, []);

  const loadSavedBackgrounds = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data } = await supabase
      .from("saved_backgrounds")
      .select("*")
      .eq("user_id", user.user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setSavedBackgrounds(data as SavedBackground[]);
    }

    // Load active background ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("active_background_id")
      .eq("id", user.user.id)
      .single();

    setActiveBackgroundId((profile as any)?.active_background_id || null);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

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

      const fileExt = file.name.split('.').pop();
      const fileName = `background-${user.user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setNewImageUrl(publicUrl);
      setTintColor("#000000");
      setTintOpacity(0);

      toast({
        title: "Image uploaded!",
        description: "Now add a name and save your background."
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

  const handleSaveBackground = async () => {
    if (!newImageUrl) {
      toast({
        title: "No image to save",
        description: "Please upload an image first",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from("saved_backgrounds")
        .insert({
          user_id: user.user.id,
          image_url: newImageUrl,
          tint_color: tintOpacity > 0 ? tintColor : null,
          tint_opacity: tintOpacity,
          name: backgroundName || "Untitled Background"
        })
        .select()
        .single();

      if (error) throw error;

      setNewImageUrl(null);
      setBackgroundName("");
      setTintColor("#000000");
      setTintOpacity(0);
      loadSavedBackgrounds();

      toast({
        title: "Background saved!",
        description: "Your background has been added to your collection."
      });
    } catch (error) {
      console.error("Error saving background:", error);
      toast({
        title: "Error saving background",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleSelectBackground = async (backgroundId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          background_type: 'image',
          active_background_id: backgroundId
        })
        .eq("id", user.user.id);

      if (error) throw error;

      setActiveBackgroundId(backgroundId);
      onUpdate();
      window.dispatchEvent(new CustomEvent('profile-background-changed'));

      toast({
        title: "Background applied!",
        description: "Your photo background is now active."
      });
    } catch (error) {
      console.error("Error selecting background:", error);
      toast({
        title: "Error applying background",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleUseColorBackground = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          background_type: 'color',
          active_background_id: null
        })
        .eq("id", user.user.id);

      if (error) throw error;

      setActiveBackgroundId(null);
      onUpdate();
      window.dispatchEvent(new CustomEvent('profile-background-changed'));

      toast({
        title: "Color background activated!",
        description: "Switched to color background mode."
      });
    } catch (error) {
      console.error("Error switching to color:", error);
      toast({
        title: "Error switching background",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleDeleteBackground = async (backgroundId: string) => {
    try {
      const { error } = await supabase
        .from("saved_backgrounds")
        .delete()
        .eq("id", backgroundId);

      if (error) throw error;

      loadSavedBackgrounds();
      window.dispatchEvent(new CustomEvent('profile-background-changed'));

      toast({
        title: "Background deleted",
        description: "Your background has been removed."
      });
    } catch (error) {
      console.error("Error deleting background:", error);
      toast({
        title: "Error deleting background",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue={backgroundType === 'image' ? 'photos' : 'color'} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="photos" className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Photo Backgrounds
          </TabsTrigger>
          <TabsTrigger value="color" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Color Background
          </TabsTrigger>
        </TabsList>

        <TabsContent value="photos" className="space-y-4">
          {/* Upload New Background */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Upload New Background</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="background-upload-settings"
                disabled={isUploadingImage}
              />
              <label 
                htmlFor="background-upload-settings" 
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
          </div>

          {/* New Image Preview and Tint Settings */}
          {newImageUrl && (
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="relative h-32 rounded-lg overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    background: tintOpacity > 0
                      ? `linear-gradient(${tintColor}${Math.round(tintOpacity * 255).toString(16).padStart(2, '0')}, ${tintColor}${Math.round(tintOpacity * 255).toString(16).padStart(2, '0')}), url(${newImageUrl})`
                      : `url(${newImageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />
              </div>

              <Input
                placeholder="Background name (e.g., 'Autumn Forest')"
                value={backgroundName}
                onChange={(e) => setBackgroundName(e.target.value)}
              />

              <div>
                <Label className="text-sm mb-2 block">Tint Color</Label>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_TINT_COLORS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setTintColor(preset.value)}
                      className={`h-10 rounded border-2 transition-all ${
                        tintColor === preset.value
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50'
                      }`}
                      style={{ backgroundColor: preset.value }}
                      title={preset.name}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-sm">Tint Opacity</Label>
                  <span className="text-sm text-muted-foreground">{Math.round(tintOpacity * 100)}%</span>
                </div>
                <Slider
                  value={[tintOpacity]}
                  onValueChange={([value]) => setTintOpacity(value)}
                  min={0}
                  max={1}
                  step={0.01}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveBackground} className="flex-1">
                  Save Background
                </Button>
                <Button onClick={() => setNewImageUrl(null)} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Saved Backgrounds Grid */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Saved Backgrounds</Label>
            {savedBackgrounds.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No saved backgrounds yet. Upload one above to get started!
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {savedBackgrounds.map((bg) => (
                  <div
                    key={bg.id}
                    className={`relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      activeBackgroundId === bg.id
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleSelectBackground(bg.id)}
                  >
                    <div
                      className="h-24 bg-cover bg-center"
                      style={{
                        background: bg.tint_opacity > 0 && bg.tint_color
                          ? `linear-gradient(${bg.tint_color}${Math.round(bg.tint_opacity * 255).toString(16).padStart(2, '0')}, ${bg.tint_color}${Math.round(bg.tint_opacity * 255).toString(16).padStart(2, '0')}), url(${bg.image_url})`
                          : `url(${bg.image_url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    />
                    <div className="p-2 bg-card/90 backdrop-blur-sm">
                      <p className="text-xs font-medium truncate">{bg.name || "Untitled"}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBackground(bg.id);
                      }}
                      className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {activeBackgroundId === bg.id && (
                      <div className="absolute top-1 left-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                        Active
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="color" className="space-y-4">
          <div className="text-center py-8">
            <Palette className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              {backgroundType === 'color' 
                ? "You're currently using a color background. Customize it in the 'Profile Colors' section below."
                : "Switch to color background mode to use your custom color palette instead of a photo."}
            </p>
            {backgroundType !== 'color' && (
              <Button onClick={handleUseColorBackground}>
                Use Color Background
              </Button>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}