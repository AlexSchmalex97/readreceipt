import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";

interface BackgroundImageSettingsProps {
  backgroundImageUrl: string | null;
  backgroundTint: { color: string; opacity: number } | null;
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
  onUpdate 
}: BackgroundImageSettingsProps) {
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [tintColor, setTintColor] = useState(backgroundTint?.color || "#000000");
  const [tintOpacity, setTintOpacity] = useState(backgroundTint?.opacity || 0);
  const [previewTintColor, setPreviewTintColor] = useState(backgroundTint?.color || "#000000");
  const [previewTintOpacity, setPreviewTintOpacity] = useState(backgroundTint?.opacity || 0);
  const { toast } = useToast();

  // Update preview when saved values change
  useEffect(() => {
    setTintColor(backgroundTint?.color || "#000000");
    setTintOpacity(backgroundTint?.opacity || 0);
    setPreviewTintColor(backgroundTint?.color || "#000000");
    setPreviewTintOpacity(backgroundTint?.opacity || 0);
  }, [backgroundTint]);

  // Apply preview to background element
  useEffect(() => {
    if (!backgroundImageUrl) return;

    const previewElement = document.getElementById('background-preview');
    if (!previewElement) return;

    if (previewTintOpacity > 0) {
      const hexOpacity = Math.round(previewTintOpacity * 255).toString(16).padStart(2, '0');
      previewElement.style.background = `linear-gradient(${previewTintColor}${hexOpacity}, ${previewTintColor}${hexOpacity}), url(${backgroundImageUrl})`;
    } else {
      previewElement.style.backgroundImage = `url(${backgroundImageUrl})`;
      previewElement.style.background = '';
    }
  }, [previewTintColor, previewTintOpacity, backgroundImageUrl]);

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

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ background_image_url: publicUrl })
        .eq("id", user.user.id);

      if (updateError) throw updateError;

      onUpdate();

      toast({
        title: "Background image uploaded!",
        description: "Your background image has been updated."
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
        .update({ background_image_url: null, background_tint: null })
        .eq("id", user.user.id);

      if (error) throw error;

      onUpdate();

      toast({
        title: "Background image removed",
        description: "Your background has been reset."
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

  const handleTintUpdate = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const tintData = previewTintOpacity > 0 ? { color: previewTintColor, opacity: previewTintOpacity } : null;

      const { error } = await supabase
        .from("profiles")
        .update({ background_tint: tintData })
        .eq("id", user.user.id);

      if (error) throw error;

      setTintColor(previewTintColor);
      setTintOpacity(previewTintOpacity);
      onUpdate();

      toast({
        title: "Tint saved!",
        description: "Your background tint has been saved."
      });
    } catch (error) {
      console.error("Error updating tint:", error);
      toast({
        title: "Error saving tint",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const hasUnsavedChanges = previewTintColor !== tintColor || previewTintOpacity !== tintOpacity;

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium mb-3 block">Background Image</Label>
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
        )}
      </div>

      {backgroundImageUrl && (
        <div className="space-y-4 pt-4 border-t">
          <Label className="text-sm font-medium">Background Tint</Label>
          
          {/* Preview */}
          <div className="relative h-32 rounded-lg border overflow-hidden">
            <div
              id="background-preview"
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${backgroundImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded">
                Preview
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Color Presets */}
            <div>
              <Label className="text-sm mb-2 block">Tint Color</Label>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_TINT_COLORS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setPreviewTintColor(preset.value)}
                    className={`h-10 rounded border-2 transition-all ${
                      previewTintColor === preset.value
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    }`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.name}
                  />
                ))}
              </div>
            </div>

            {/* Opacity Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm">Tint Opacity</Label>
                <span className="text-sm text-muted-foreground">{Math.round(previewTintOpacity * 100)}%</span>
              </div>
              <Slider
                value={[previewTintOpacity]}
                onValueChange={([value]) => setPreviewTintOpacity(value)}
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />
            </div>

            {/* Save Button */}
            {hasUnsavedChanges && (
              <Button onClick={handleTintUpdate} className="w-full">
                Save Tint
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}