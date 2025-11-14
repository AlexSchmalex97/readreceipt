import { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, User, ArrowLeft, Link2, LogOut } from "lucide-react";
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { SocialMediaInput } from "@/components/SocialMediaInput";
import { FavoriteBookSelector } from "@/components/FavoriteBookSelector";
import { ReadingGoals } from "@/components/ReadingGoals";
import { usePlatform } from "@/hooks/usePlatform";
import { useNavigate } from "react-router-dom";


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
  const [completedBooksThisYear, setCompletedBooksThisYear] = useState(0);
  const { isIOS, isReadReceiptApp } = usePlatform();
  const navigate = useNavigate();

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
  const [backgroundColor, setBackgroundColor] = useState("#F5F1E8");
  const [customHex, setCustomHex] = useState("");
  const [textColor, setTextColor] = useState<string>("");
  const [textHex, setTextHex] = useState<string>("");
  const [accentColor, setAccentColor] = useState<string>("");
  const [accentHex, setAccentHex] = useState<string>("");
  const [savedCustomAccents, setSavedCustomAccents] = useState<string[]>([]);
  const [accentTextColor, setAccentTextColor] = useState<string>("");
  const [accentTextHex, setAccentTextHex] = useState<string>("");
  const [savedCustomAccentTexts, setSavedCustomAccentTexts] = useState<string[]>([]);
  const [applyGlobally, setApplyGlobally] = useState<boolean>(false);
  const [savedCustomColors, setSavedCustomColors] = useState<string[]>([]);
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
      setBackgroundColor((prof as any)?.background_color ?? "#F5F1E8");
      const cp = (prof as any)?.color_palette || {};
      setApplyGlobally(Boolean(cp?.apply_globally));
      setSavedCustomColors(Array.isArray(cp?.custom_colors) ? cp.custom_colors : []);
      setSavedCustomAccents(Array.isArray(cp?.custom_accents) ? cp.custom_accents : []);
      setSavedCustomAccentTexts(Array.isArray(cp?.custom_accent_texts) ? cp.custom_accent_texts : []);
      setTextColor(cp?.text_color || "");
      setAccentColor(cp?.accent_color || "");
      setAccentTextColor(cp?.accent_text_color || "");
      
      // Completed reads this year: entries count + books without entries fallback
      const computeCompletedCount = async () => {
        const y = new Date().getFullYear();
        const start = `${y}-01-01`;
        const end = `${y}-12-31`;
  
        const { data: entries, error: entriesError } = await supabase
          .from('reading_entries')
          .select('id, book_id')
          .eq('user_id', user.id)
          .not('finished_at', 'is', null)
          .gte('finished_at', start)
          .lte('finished_at', end);
  
        const entryCount = entries?.length ?? 0;
        const booksWithEntry = new Set((entries ?? []).map((e: any) => e.book_id));
  
        const { data: books, error: booksError } = await supabase
          .from('books')
          .select('id, current_page, total_pages, finished_at, created_at, status')
          .eq('user_id', user.id);
  
        let extra = 0;
        if (books) {
          extra = books.filter((b: any) => {
            if (booksWithEntry.has(b.id)) return false;
            if (b.status === 'dnf') return false;
            const completedFlag = (b.status === 'completed') || ((b.current_page ?? 0) >= (b.total_pages ?? 0));
            if (!completedFlag) return false;
            if (b.finished_at) {
              const fy = new Date(b.finished_at).getFullYear();
              return fy === y;
            }
            if (b.status === 'completed' && b.created_at) {
              const cy = new Date(b.created_at).getFullYear();
              return cy === y;
            }
            return false;
          }).length;
        }
  
        const totalCompletedThisYear = entryCount + extra;
        console.log("Settings completedThisYear (merged):", { entryCount, extra, total: totalCompletedThisYear, entriesError, booksError });
        setCompletedBooksThisYear(totalCompletedThisYear);
      };

      await computeCompletedCount();
      
      setLoading(false);

      // Refresh when reading entries change
      const onEntriesChanged = () => { computeCompletedCount(); };
      window.addEventListener('reading-entries-changed', onEntriesChanged);
      // Cleanup listener when component unmounts
      return () => window.removeEventListener('reading-entries-changed', onEntriesChanged);
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

      // Build color palette from selections
      const hexToHSL = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0; const l = (max + min) / 2;
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
          }
          h = h / 6;
        }
        return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
      };
      const isDarkHex = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return lum < 128;
      };
      const chosenTextHex = textColor || (isDarkHex(backgroundColor) ? "#FFFFFF" : "#1A1A1A");
      const newColorPalette: any = {
        apply_globally: applyGlobally,
        custom_colors: savedCustomColors,
        custom_accents: savedCustomAccents,
        custom_accent_texts: savedCustomAccentTexts,
        text_color: textColor || null,
        accent_color: accentColor || null,
        accent_text_color: accentTextColor || null,
      };
      if (applyGlobally) {
        newColorPalette.background = hexToHSL(backgroundColor);
        newColorPalette.foreground = hexToHSL(chosenTextHex);
      }

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
          background_color: backgroundColor,
          color_palette: newColorPalette,
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
              background_color: backgroundColor,
              color_palette: newColorPalette,
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

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({ title: "Signed out successfully" });
      navigate("/");
    } catch (e: any) {
      toast({ 
        title: "Error signing out", 
        description: e?.message,
        variant: "destructive" 
      });
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

      {/* Reading Goals Section */}
      <section className="bg-card border rounded p-4 mb-6">
        <h2 className="font-semibold mb-3">Reading Goals</h2>
        <ReadingGoals userId={uid || ""} completedBooksThisYear={completedBooksThisYear} />
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
            <FavoriteBookSelector
              label="Favourite Book"
              placeholder="Select your favourite book..."
              value={favoriteBookId}
              onChange={setFavoriteBookId}
            />
          </div>

          <div className="grid gap-1">
            <FavoriteBookSelector
              label="Current Read"
              placeholder="Select your current read..."
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

          <div className="grid gap-1">
            <span className="text-sm text-muted-foreground">Profile Background Color</span>
            <div className="grid gap-3">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { name: 'Beige', value: '#F5F1E8' },
                  { name: 'Red', value: '#FEE2E2' },
                  { name: 'Blue', value: '#DBEAFE' },
                  { name: 'Pink', value: '#FCE7F3' },
                  { name: 'Black', value: '#1F2937' },
                  { name: 'Green', value: '#D1FAE5' },
                  { name: 'Orange', value: '#FED7AA' },
                  { name: 'Yellow', value: '#FEF3C7' },
                ].map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setBackgroundColor(color.value)}
                    className={`h-12 rounded border-2 transition-all ${
                      backgroundColor === color.value 
                        ? 'border-primary ring-2 ring-primary/20' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  className="border rounded px-3 py-2 bg-background flex-1"
                  value={customHex}
                  onChange={(e) => setCustomHex(e.target.value)}
                  placeholder="#FFFFFF"
                  maxLength={7}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (/^#[0-9A-F]{6}$/i.test(customHex)) {
                      setBackgroundColor(customHex);
                      toast({ title: "Custom color applied!" });
                    } else {
                      toast({ 
                        title: "Invalid hex code", 
                        description: "Please enter a valid hex code (e.g., #FF5733)",
                        variant: "destructive" 
                      });
                    }
                  }}
                  className="px-3 py-2 rounded border hover:bg-accent"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!/^#[0-9A-F]{6}$/i.test(customHex)) {
                      toast({ title: "Invalid hex code", description: "Please enter a valid hex code", variant: "destructive" });
                      return;
                    }
                    try {
                      const { data: user } = await supabase.auth.getUser();
                      if (!user.user) return;
                      const newColors = [...new Set([...savedCustomColors, customHex])].slice(0, 8);
                      const { data: cpRow, error: cpErr } = await supabase
                        .from('profiles')
                        .select('color_palette')
                        .eq('id', user.user.id)
                        .single();
                      if (cpErr) throw cpErr;
                      const currentPalette: any = (cpRow as any)?.color_palette || {};
                      const nextPalette = { ...currentPalette, custom_colors: newColors };
                      const { error } = await supabase
                        .from('profiles')
                        .update({ color_palette: nextPalette })
                        .eq('id', user.user.id);
                      if (error) throw error;
                      setSavedCustomColors(newColors);
                      toast({ title: 'Custom color saved!' });
                    } catch (e:any) {
                      toast({ title: 'Error saving color', description: e?.message || 'Try again', variant: 'destructive' });
                    }
                  }}
                  className="px-3 py-2 rounded border hover:bg-accent"
                >
                  Save
                </button>
              </div>

              {savedCustomColors.length > 0 && (
                <div className="grid grid-cols-6 gap-2">
                  {savedCustomColors.map((hex, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setBackgroundColor(hex)}
                      className={`h-8 rounded border-2 ${backgroundColor === hex ? 'border-primary' : 'border-border'}`}
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                </div>
              )}

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={applyGlobally} onChange={(e) => setApplyGlobally(e.target.checked)} />
                <span>Apply this color to all pages (only you will see it)</span>
              </label>

              <div className="text-xs text-muted-foreground">
                Choose a preset color or enter a custom hex code. Public visitors see your profile background only. If applied globally, your app uses your palette while logged in.
              </div>
            </div>
          </div>

          <div className="grid gap-1">
            <span className="text-sm text-muted-foreground">Profile Text Color</span>
            <div className="grid grid-cols-6 gap-2 mb-3">
              {[
                { name: 'Default (Auto)', value: '' },
                { name: 'Black', value: '#1A1A1A' },
                { name: 'White', value: '#FFFFFF' },
                { name: 'Tan', value: '#7A5C3A' },
                { name: 'Brown', value: '#5C3B28' },
                { name: 'Dark Olive', value: '#3D4A3D' },
                { name: 'Plum', value: '#4E2A3A' },
                { name: 'Indigo', value: '#3F4C8A' },
              ].map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setTextColor(color.value)}
                  className={`h-10 rounded border-2 transition-all ${
                    textColor === color.value 
                      ? 'border-primary ring-2 ring-primary/20' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  style={{ backgroundColor: color.value || 'transparent' }}
                  title={color.name}
                />
              ))}
            </div>

            {savedCustomColors.length > 0 && (
              <div className="grid grid-cols-6 gap-2 mb-3">
                {savedCustomColors.map((hex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setTextColor(hex)}
                    className={`h-8 rounded border-2 ${textColor === hex ? 'border-primary' : 'border-border'}`}
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
              </div>
            )}

            <div className="flex gap-2 items-center">
              <input
                type="text"
                className="border rounded px-3 py-2 bg-background flex-1"
                value={textHex}
                onChange={(e) => setTextHex(e.target.value)}
                placeholder="#FFFFFF (leave empty for auto)"
                maxLength={7}
              />
              <button
                type="button"
                onClick={() => {
                  if (!textHex) { setTextColor(""); toast({ title: 'Using auto contrast' }); return; }
                  if (/^#[0-9A-F]{6}$/i.test(textHex)) { setTextColor(textHex); toast({ title: 'Text color applied!' }); }
                  else { toast({ title: 'Invalid hex code', variant: 'destructive' }); }
                }}
                className="px-3 py-2 rounded border hover:bg-accent"
              >
                Apply
              </button>
              <button type="button" onClick={() => { setTextHex(""); setTextColor(""); }} className="px-3 py-2 rounded border hover:bg-accent">Auto</button>
              <button
                type="button"
                onClick={async () => {
                  if (!/^#[0-9A-F]{6}$/i.test(textHex)) {
                    toast({ title: 'Invalid hex code', description: 'Please enter a valid hex code', variant: 'destructive' });
                    return;
                  }
                  try {
                    const { data: user } = await supabase.auth.getUser();
                    if (!user.user) return;
                    const newColors = [...new Set([...savedCustomColors, textHex])].slice(0, 8);
                    const { data: cpRow, error: cpErr } = await supabase
                      .from('profiles')
                      .select('color_palette')
                      .eq('id', user.user.id)
                      .single();
                    if (cpErr) throw cpErr;
                    const currentPalette: any = (cpRow as any)?.color_palette || {};
                    const nextPalette = { ...currentPalette, custom_colors: newColors };
                    const { error } = await supabase
                      .from('profiles')
                      .update({ color_palette: nextPalette })
                      .eq('id', user.user.id);
                    if (error) throw error;
                    setSavedCustomColors(newColors);
                    toast({ title: 'Custom color saved!' });
                  } catch (e:any) {
                    toast({ title: 'Error saving color', description: e?.message || 'Try again', variant: 'destructive' });
                  }
                }}
                className="px-3 py-2 rounded border hover:bg-accent"
              >
                Save
              </button>
            </div>
            <div className="text-xs text-muted-foreground">This affects text in your profile (name, username, bio, etc). Leave empty to auto-adjust based on background.</div>
          </div>

          <div className="grid gap-1">
            <span className="text-sm text-muted-foreground">Profile Accent Color</span>
            <div className="grid grid-cols-6 gap-2 mb-3">
              {[
                { name: 'Default (White)', value: '' },
                { name: 'Light Beige', value: '#F5F1E8' },
                { name: 'Soft Blue', value: '#E3F2FD' },
                { name: 'Pale Green', value: '#E8F5E9' },
                { name: 'Light Pink', value: '#FCE4EC' },
                { name: 'Lavender', value: '#F3E5F5' },
                { name: 'Peach', value: '#FFF3E0' },
                { name: 'Mint', value: '#E0F2F1' },
              ].map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setAccentColor(color.value)}
                  className={`h-10 rounded border-2 transition-all ${
                    accentColor === color.value 
                      ? 'border-primary ring-2 ring-primary/20' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  style={{ backgroundColor: color.value || '#ffffff' }}
                  title={color.name}
                />
              ))}
            </div>

            {savedCustomAccents.length > 0 && (
              <div className="grid grid-cols-6 gap-2 mb-3">
                {savedCustomAccents.map((hex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAccentColor(hex)}
                    className={`h-8 rounded border-2 ${accentColor === hex ? 'border-primary' : 'border-border'}`}
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
              </div>
            )}

            <div className="flex gap-2 items-center">
              <input
                type="text"
                className="border rounded px-3 py-2 bg-background flex-1"
                value={accentHex}
                onChange={(e) => setAccentHex(e.target.value)}
                placeholder="#FFFFFF (leave empty for white)"
                maxLength={7}
              />
              <button
                type="button"
                onClick={() => {
                  if (!accentHex) { setAccentColor(""); toast({ title: 'Using default white' }); return; }
                  if (/^#[0-9A-F]{6}$/i.test(accentHex)) { setAccentColor(accentHex); toast({ title: 'Accent color applied!' }); }
                  else { toast({ title: 'Invalid hex code', variant: 'destructive' }); }
                }}
                className="px-3 py-2 rounded border hover:bg-accent"
              >
                Apply
              </button>
              <button type="button" onClick={() => { setAccentHex(""); setAccentColor(""); }} className="px-3 py-2 rounded border hover:bg-accent">Default</button>
              <button
                type="button"
                onClick={async () => {
                  if (!/^#[0-9A-F]{6}$/i.test(accentHex)) {
                    toast({ title: 'Invalid hex code', description: 'Please enter a valid hex code', variant: 'destructive' });
                    return;
                  }
                  try {
                    const { data: user } = await supabase.auth.getUser();
                    if (!user.user) return;
                    const newAccents = [...new Set([...savedCustomAccents, accentHex])].slice(0, 8);
                    const { data: cpRow, error: cpErr } = await supabase
                      .from('profiles')
                      .select('color_palette')
                      .eq('id', user.user.id)
                      .single();
                    if (cpErr) throw cpErr;
                    const currentPalette: any = (cpRow as any)?.color_palette || {};
                    const nextPalette = { ...currentPalette, custom_accents: newAccents };
                    const { error } = await supabase
                      .from('profiles')
                      .update({ color_palette: nextPalette })
                      .eq('id', user.user.id);
                    if (error) throw error;
                    setSavedCustomAccents(newAccents);
                    toast({ title: 'Custom accent saved!' });
                  } catch (e:any) {
                    toast({ title: 'Error saving color', description: e?.message || 'Try again', variant: 'destructive' });
                  }
                }}
                className="px-3 py-2 rounded border hover:bg-accent"
              >
                Save
              </button>
            </div>
            <div className="text-xs text-muted-foreground">This affects cards, sections, and buttons in your profile (Favourite Book, Currently Reading, 2025 Reading Goal, etc).</div>
          </div>

          <div className="grid gap-1">
            <span className="text-sm text-muted-foreground">Accent Text Color</span>
            <div className="grid grid-cols-6 gap-2 mb-3">
              {[
                { name: 'Default (Auto)', value: '' },
                { name: 'Black', value: '#1A1A1A' },
                { name: 'White', value: '#FFFFFF' },
                { name: 'Dark Gray', value: '#4A4A4A' },
                { name: 'Light Gray', value: '#E0E0E0' },
                { name: 'Navy', value: '#2C3E50' },
              ].map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setAccentTextColor(color.value)}
                  className={`h-10 rounded border-2 transition-all ${
                    accentTextColor === color.value 
                      ? 'border-primary ring-2 ring-primary/20' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  style={{ backgroundColor: color.value || '#ffffff' }}
                  title={color.name}
                />
              ))}
            </div>

            {savedCustomAccentTexts.length > 0 && (
              <div className="grid grid-cols-6 gap-2 mb-3">
                {savedCustomAccentTexts.map((hex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAccentTextColor(hex)}
                    className={`h-8 rounded border-2 ${accentTextColor === hex ? 'border-primary' : 'border-border'}`}
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
              </div>
            )}

            <div className="flex gap-2 items-center">
              <input
                type="text"
                className="border rounded px-3 py-2 bg-background flex-1"
                value={accentTextHex}
                onChange={(e) => setAccentTextHex(e.target.value)}
                placeholder="#1A1A1A"
                maxLength={7}
              />
              <button
                type="button"
                onClick={() => {
                  if (/^#[0-9A-F]{6}$/i.test(accentTextHex)) {
                    setAccentTextColor(accentTextHex);
                    toast({ title: "Custom accent text color applied!" });
                  } else {
                    toast({ 
                      title: "Invalid hex code", 
                      description: "Please enter a valid hex code (e.g., #1A1A1A)",
                      variant: "destructive" 
                    });
                  }
                }}
                className="px-3 py-2 rounded border hover:bg-accent"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!/^#[0-9A-F]{6}$/i.test(accentTextHex)) {
                    toast({ title: "Invalid hex code", description: "Please enter a valid hex code", variant: "destructive" });
                    return;
                  }
                  try {
                    const { data: user } = await supabase.auth.getUser();
                    if (!user.user) return;
                    const newTexts = [...new Set([...savedCustomAccentTexts, accentTextHex])].slice(0, 6);
                    const { data: cpRow, error: cpErr } = await supabase
                      .from('profiles')
                      .select('color_palette')
                      .eq('id', user.user.id)
                      .single();
                    if (cpErr) throw cpErr;
                    const currentPalette: any = (cpRow as any)?.color_palette || {};
                    const nextPalette = { ...currentPalette, custom_accent_texts: newTexts };
                    const { error } = await supabase
                      .from('profiles')
                      .update({ color_palette: nextPalette })
                      .eq('id', user.user.id);
                    if (error) throw error;
                    setSavedCustomAccentTexts(newTexts);
                    toast({ title: 'Custom accent text color saved!' });
                  } catch (e:any) {
                    toast({ title: 'Error saving color', description: e?.message || 'Try again', variant: 'destructive' });
                  }
                }}
                className="px-3 py-2 rounded border hover:bg-accent"
              >
                Save
              </button>
            </div>
            <div className="text-xs text-muted-foreground">This affects text within the accented sections (Currently Reading book title, Favourite Book title, etc). Leave empty to auto-adjust based on accent color.</div>
          </div>

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

      <section className="bg-card border rounded p-4 mb-6">
        <h2 className="font-semibold mb-3">Integrations</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Connect with other reading platforms to sync your library
        </p>
        <Link to="/integrations">
          <Button variant="outline" className="gap-2">
            <Link2 className="h-4 w-4" />
            Manage Integrations
          </Button>
        </Link>
      </section>

      {(isIOS || isReadReceiptApp) && (
        <section className="bg-card border rounded p-4">
          <h2 className="font-semibold mb-3">Sign Out</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Sign out of your account
          </p>
          <Button 
            variant="destructive" 
            className="gap-2"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </section>
      )}
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
