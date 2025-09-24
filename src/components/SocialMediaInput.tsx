import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Facebook, Twitter, Instagram, Linkedin, Youtube, Globe } from "lucide-react";

interface SocialMediaLink {
  platform: string;
  url: string;
}

interface SocialMediaInputProps {
  value: SocialMediaLink[];
  onChange: (links: SocialMediaLink[]) => void;
}

const SOCIAL_PLATFORMS = [
  { value: "facebook", label: "Facebook", icon: Facebook },
  { value: "twitter", label: "Twitter/X", icon: Twitter },
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
  { value: "youtube", label: "YouTube", icon: Youtube },
  { value: "other", label: "Other", icon: Globe },
];

export const SocialMediaInput = ({ value, onChange }: SocialMediaInputProps) => {
  const [newPlatform, setNewPlatform] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const addLink = () => {
    if (newPlatform && newUrl) {
      onChange([...value, { platform: newPlatform, url: newUrl }]);
      setNewPlatform("");
      setNewUrl("");
    }
  };

  const removeLink = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const getPlatformIcon = (platform: string) => {
    const platformConfig = SOCIAL_PLATFORMS.find(p => p.value === platform);
    return platformConfig?.icon || Globe;
  };

  return (
    <div className="space-y-4">
      <Label>Social Media Links</Label>
      
      {/* Existing links */}
      {value.map((link, index) => {
        const Icon = getPlatformIcon(link.platform);
        return (
          <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium capitalize">{link.platform}</span>
            <span className="text-sm text-muted-foreground flex-1 truncate">{link.url}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeLink(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}

      {/* Add new link */}
      <div className="space-y-2 p-3 border border-dashed rounded-lg">
        <div className="flex gap-2">
          <Select value={newPlatform} onValueChange={setNewPlatform}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select platform" />
            </SelectTrigger>
            <SelectContent>
              {SOCIAL_PLATFORMS.map((platform) => (
                <SelectItem key={platform.value} value={platform.value}>
                  <div className="flex items-center gap-2">
                    <platform.icon className="h-4 w-4" />
                    {platform.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Profile URL"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            className="flex-1"
          />
          <Button type="button" onClick={addLink} disabled={!newPlatform || !newUrl}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
