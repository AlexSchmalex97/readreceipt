import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";

interface BackgroundImageSettingsProps {
  backgroundImageUrl: string | null;
  backgroundTint: { color: string; opacity: number } | null;
  onUpdate: () => void;
}

export function BackgroundImageSettings({ 
  backgroundImageUrl, 
  backgroundTint,
  onUpdate 
}: BackgroundImageSettingsProps) {
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [tintColor, setTintColor] = useState(backgroundTint?.color || "#000000");
  const [tintOpacity, setTintOpacity] = useState(backgroundTint?.opacity || 0);
  const { toast } = useToast();

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

      const tintData = tintOpacity > 0 ? { color: tintColor, opacity: tintOpacity } : null;

      const { error } = await supabase
        .from("profiles")
        .update({ background_tint: tintData })
        .eq("id", user.user.id);

      if (error) throw error;

      onUpdate();

      toast({
        title: "Tint updated!",
        description: "Your background tint has been saved."
      });
    } catch (error) {
      console.error("Error updating tint:", error);
      toast({
        title: "Error updating tint",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

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
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Label className="text-sm min-w-20">Tint Color</Label>
              <input
                type="color"
                value={tintColor}
                onChange={(e) => setTintColor(e.target.value)}
                className="h-10 w-20 rounded border cursor-pointer"
              />
              <Input
                type="text"
                value={tintColor}
                onChange={(e) => setTintColor(e.target.value)}
                className="flex-1"
                placeholder="#000000"
              />
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
            <Button onClick={handleTintUpdate} className="w-full">
              Apply Tint
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}