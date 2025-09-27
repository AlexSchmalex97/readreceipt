import { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, User, ArrowLeft } from "lucide-react";
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { SocialMediaInput } from "@/components/SocialMediaInput";
import { FavoriteBookSelector } from "@/components/FavoriteBookSelector";


function normalizeUsername(raw: string) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

type Identity = {
  id: string;
  provider: string;
  identity_data?: Record<string, any>;
};

export default function ProfileSettings() {
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);

  // profile fields
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [displayPreference, setDisplayPreference] = useState<'quotes' | 'time_weather' | 'both'>('quotes');
  const [temperatureUnit, setTemperatureUnit] = useState<'celsius' | 'fahrenheit'>('celsius');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [birthday, setBirthday] = useState("");
  const [favoriteBookId, setFavoriteBookId] = useState<string | undefined>();
  const [currentBookId, setCurrentBookId] = useState<string | undefined>();
  const [socialMediaLinks, setSocialMediaLinks] = useState<{platform: string, url: string}[]>([]);
  const [websiteUrl, setWebsiteUrl] = useState("");
  
  const [uploading, setUploading] = useState(false);
  const normUsername = useMemo(() => normalizeUsername(username), [username]);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Cropping states
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 90,
    height: 90,
    x: 5,
    y: 5,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  // auth fields
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // providers
  const [identities, setIdentities] = useState<Identity[]>([]);
  const googleLinked = identities.some((i) => i.provider === "google");

  useEffect(() => {
    

    (async () => {
      setLoading(true);
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user ?? null;
      if (!user) {
        setUid(null);
        setLoading(false);
        return;
      }

      setUid(user.id);
      setEmail(user.email ?? "");
      setIdentities((user.identities as any) ?? []);

      // load profile
      const { data: prof, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      console.log("Profile load result:", { prof, profileError, userId: user.id });

      setDisplayName(prof?.display_name ?? "");
      setUsername(prof?.username ?? "");
      setBio(prof?.bio ?? "");
      setDisplayPreference((prof?.display_preference as 'quotes' | 'time_weather' | 'both') ?? 'quotes');
      setTemperatureUnit((prof?.temperature_unit as 'celsius' | 'fahrenheit') ?? 'celsius');
      setAvatarUrl(prof?.avatar_url ?? null);
      setBirthday(prof?.birthday ?? "");
      setFavoriteBookId(prof?.favorite_book_id ?? undefined);
      setCurrentBookId(prof?.current_book_id ?? undefined);
      setSocialMediaLinks(prof?.social_media_links ? Object.entries(prof.social_media_links).map(([platform, url]) => ({ platform, url: url as string })) : []);
      setWebsiteUrl(prof?.website_url ?? "");
      
      setLoading(false);
    })();
  }, []);

  // live username availability (skip if unchanged)
  useEffect(() => {
    (async () => {
      if (!uid) return;
      if (!normUsername) {
        setUsernameAvailable(null);
        return;
      }
      setCheckingUsername(true);
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", normUsername)
        .limit(1);

      const takenByOther =
        (data?.length ?? 0) > 0 && data![0].id !== uid;

      setUsernameAvailable(!takenByOther);
      setCheckingUsername(false);
    })();
  }, [normUsername, uid]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!uid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-card border rounded p-6">
          <div className="font-medium mb-2">You’re not signed in.</div>
          <a className="underline text-primary" href="/">Go back</a>
        </div>
      </div>
    );
  }

  // Actions
  const getCroppedImg = (image: HTMLImageElement, crop: PixelCrop): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('No 2d context'));
        return;
      }

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      canvas.width = crop.width;
      canvas.height = crop.height;

      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width,
        crop.height
      );

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  };

  const uploadAvatar = async (blob: Blob) => {
    if (!uid) return;
    
    setUploading(true);
    try {
      const fileName = `${uid}/avatar.jpg`;

      // Remove old avatar if it exists
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`${uid}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const newAvatarUrl = data.publicUrl;

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({ 
          id: uid,
          avatar_url: newAvatarUrl,
          display_name: displayName.trim() || null,
          username: normUsername || null,
          bio: bio.trim() || null,
          email: email
        });

      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl);
      toast({ title: "Profile photo updated!" });
    } catch (error: any) {
      toast({ 
        title: "Error uploading photo", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async () => {
    if (!imgRef.current || !completedCrop) return;

    try {
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      await uploadAvatar(croppedBlob);
      setShowCropModal(false);
      setSelectedImage(null);
    } catch (error) {
      console.error('Error cropping image:', error);
      toast({ 
        title: "Error cropping image", 
        description: "Please try again",
        variant: "destructive" 
      });
    }
  };

  const saveProfile = async () => {
    try {
      if (!displayName.trim()) return alert("Please enter a display name.");
      if (!normUsername) return alert("Please enter a username.");
      if (usernameAvailable === false) return alert("That username is taken.");

      console.log("Saving profile:", { uid, displayName: displayName.trim(), username: normUsername, bio: bio.trim() });

      // Convert social media links array to object format
      const socialMediaObject = socialMediaLinks.reduce((acc, link) => {
        acc[link.platform] = link.url;
        return acc;
      }, {} as Record<string, string>);

      // Try to update existing profile
      const { data: updateData, error: updateError } = await supabase
        .from("profiles")
        .update({ 
          display_name: displayName.trim(), 
          username: normUsername,
          bio: bio.trim() || null,
          display_preference: displayPreference,
          temperature_unit: temperatureUnit,
          birthday: birthday || null,
          favorite_book_id: favoriteBookId || null,
          current_book_id: currentBookId || null,
          social_media_links: socialMediaObject,
          website_url: websiteUrl || null,
        })
        .eq("id", uid)
        .select();

      console.log("Update result:", { updateData, updateError });

      // If no rows were updated, the profile might not exist, so try to insert
      if (!updateError && (!updateData || updateData.length === 0)) {
        console.log("No profile found, creating new one...");
        const { data: insertData, error: insertError } = await supabase
          .from("profiles")
          .insert([
            {
              id: uid,
              display_name: displayName.trim(),
              username: normUsername,
              bio: bio.trim() || null,
              email: email,
              display_preference: displayPreference,
              temperature_unit: temperatureUnit,
              birthday: birthday || null,
              favorite_book_id: favoriteBookId || null,
              social_media_links: socialMediaObject,
              website_url: websiteUrl || null,
            }
          ])
          .select();

        console.log("Insert result:", { insertData, insertError });
        
        if (insertError) throw insertError;
      } else if (updateError) {
        throw updateError;
      }
      
      // Dispatch events to notify other components about updates
      window.dispatchEvent(new CustomEvent('profile-updated'));
      window.dispatchEvent(new CustomEvent('display-preference-updated'));
      
      toast({ title: "Profile updated!" });
    } catch (e: any) {
      console.error("Profile save error:", e);
      toast({ 
        title: "Error saving profile", 
        description: e?.message ?? "Failed to update profile.",
        variant: "destructive" 
      });
    }
  };

  const updateEmail = async () => {
    try {
      if (!email.trim()) return alert("Enter a valid email.");
      const { error } = await supabase.auth.updateUser({
        email: email.trim(),
      });
      if (error) throw error;
      alert("If your project requires it, check your inbox to confirm the new email.");
    } catch (e: any) {
      alert(e?.message ?? "Failed to update email.");
    }
  };

  const updatePassword = async () => {
    try {
      if (newPassword.length < 6)
        return alert("Password should be at least 6 characters.");
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setNewPassword("");
      alert("Password updated.");
    } catch (e: any) {
      alert(e?.message ?? "Failed to update password.");
    }
  };

  const linkGoogle = async () => {
    try {
      // opens Google consent and returns to the app
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo: window.location.origin + "/profile" },
      } as any);
      if (error) throw error;
    } catch (e: any) {
      // Some setups don’t support linkIdentity yet – fall back to signInWithOAuth
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/profile" },
      });
      if (error) alert(e?.message ?? "Failed to connect Google.");
    }
  };

  const unlinkGoogle = async () => {
    try {
      const google = identities.find((i) => i.provider === "google");
      if (!google) return;
      const { error } = await supabase.auth.unlinkIdentity(google.id as any);
      if (error) throw error;
      setIdentities((prev) => prev.filter((i) => i.id !== google.id));
      alert("Google account unlinked.");
    } catch (e: any) {
      alert(e?.message ?? "Failed to unlink Google.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/profile">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Profile
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Profile Settings</h1>
      </div>

      {/* Profile Photo Section */}
      <section className="bg-card border rounded p-4 mb-6">
        <h2 className="font-semibold mb-3">Profile Photo</h2>
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-muted border-2 border-border">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground hover:opacity-90 transition"
            >
              <Camera className="w-3 h-3" />
            </button>
          </div>
          <div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              variant="outline"
              size="sm"
            >
              {uploading ? "Uploading..." : "Change Photo"}
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              JPG, PNG up to 5MB
            </p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </section>

      <section className="bg-card border rounded p-4 mb-6">
        <h2 className="font-semibold mb-3">Public Profile</h2>
        <div className="text-sm text-muted-foreground mb-4 p-3 bg-accent/30 rounded">
          <strong>Note:</strong> Your display name and username are for social features and will appear in greetings, feeds, and when other users find you. 
          <br />
          <strong>Authentication:</strong> For login, use the same method you signed up with (Google OAuth or email/password).
        </div>
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm text-muted-foreground">Display name</span>
            <input
              className="border rounded px-3 py-2 bg-background"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name (appears in greetings)"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-muted-foreground">Username</span>
            <input
              className="border rounded px-3 py-2 bg-background"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username (for social features)"
              autoComplete="username"
            />
            {username && (
              <div className="text-xs text-muted-foreground">
                @{normUsername}{" "}
                {checkingUsername
                  ? "• checking…"
                  : usernameAvailable == null
                  ? ""
                  : usernameAvailable
                  ? "• available"
                  : "• taken"}
              </div>
            )}
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-muted-foreground">Bio</span>
            <textarea
              className="border rounded px-3 py-2 bg-background resize-none"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell other readers about yourself..."
              rows={3}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-muted-foreground">Birthday</span>
            <input
              type="date"
              className="border rounded px-3 py-2 bg-background"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
            />
          </label>

          <div className="grid gap-1">
            <span className="text-sm text-muted-foreground">Favorite Book</span>
            <FavoriteBookSelector
              value={favoriteBookId}
              onChange={setFavoriteBookId}
            />
          </div>

          <div className="grid gap-1">
            <span className="text-sm text-muted-foreground">Current Book</span>
            <FavoriteBookSelector
              value={currentBookId}
              onChange={setCurrentBookId}
            />
          </div>


          <div className="grid gap-1">
            <SocialMediaInput
              value={socialMediaLinks}
              onChange={setSocialMediaLinks}
            />
          </div>

          <label className="grid gap-1">
            <span className="text-sm text-muted-foreground">Website</span>
            <input
              type="url"
              className="border rounded px-3 py-2 bg-background"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://your-website.com"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-muted-foreground">Header Display</span>
            <select
              className="border rounded px-3 py-2 bg-background"
              value={displayPreference}
              onChange={(e) => setDisplayPreference(e.target.value as 'quotes' | 'time_weather' | 'both')}
            >
              <option value="quotes">Inspirational Quotes</option>
              <option value="time_weather">Date/Time & Weather</option>
              <option value="both">Both (Quotes + Date/Time/Weather)</option>
            </select>
            <div className="text-xs text-muted-foreground">
              Choose what appears in the navigation header between the menu and your greeting.
            </div>
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-muted-foreground">Temperature Unit</span>
            <select
              className="border rounded px-3 py-2 bg-background"
              value={temperatureUnit}
              onChange={(e) => setTemperatureUnit(e.target.value as 'celsius' | 'fahrenheit')}
            >
              <option value="celsius">Celsius (°C)</option>
              <option value="fahrenheit">Fahrenheit (°F)</option>
            </select>
            <div className="text-xs text-muted-foreground">
              Choose your preferred temperature unit for weather display.
            </div>
          </label>

          <div className="flex gap-2">
            <button
              onClick={saveProfile}
              className="px-3 py-2 rounded bg-primary text-primary-foreground"
            >
              Save profile
            </button>
            <a href="/people" className="px-3 py-2 rounded border">
              Find people
            </a>
          </div>
        </div>
      </section>

      <section className="bg-card border rounded p-4 mb-6">
        <h2 className="font-semibold mb-3">Account</h2>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm text-muted-foreground">Email</label>
            <div className="flex gap-2">
              <input
                className="border rounded px-3 py-2 bg-background flex-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
              <button onClick={updateEmail} className="px-3 py-2 rounded border">
                Update email
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              You may receive a confirmation email depending on your project settings.
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm text-muted-foreground">New password</label>
            <div className="flex gap-2">
              <input
                className="border rounded px-3 py-2 bg-background flex-1"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <button onClick={updatePassword} className="px-3 py-2 rounded border">
                Update password
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-card border rounded p-4">
        <h2 className="font-semibold mb-3">Connected accounts</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Google</div>
            <div className="text-xs text-muted-foreground">
              {googleLinked ? "Connected" : "Not connected"}
            </div>
          </div>
          {googleLinked ? (
            <button onClick={unlinkGoogle} className="px-3 py-2 rounded border">
              Unlink
            </button>
          ) : (
            <button
              onClick={linkGoogle}
              className="px-3 py-2 rounded bg-secondary text-secondary-foreground"
            >
              Connect Google
            </button>
          )}
        </div>
      </section>
      </div>

      {/* Crop Modal */}
      <Dialog open={showCropModal} onOpenChange={setShowCropModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crop Your Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedImage && (
              <div className="flex justify-center">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                >
                  <img
                    ref={imgRef}
                    src={selectedImage}
                    alt="Crop preview"
                    style={{ maxHeight: '400px', maxWidth: '100%' }}
                  />
                </ReactCrop>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCropModal(false);
                  setSelectedImage(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCropComplete}
                disabled={uploading || !completedCrop}
              >
                {uploading ? "Uploading..." : "Save Photo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
