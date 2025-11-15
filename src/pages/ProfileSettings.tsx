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
import { usePlatform } from "@/hooks/usePlatform";
import { useNavigate } from "react-router-dom";
import { SettingsTabs } from "@/components/SettingsTabs";


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
  const [topFiveBooks, setTopFiveBooks] = useState<string[]>([]);
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
      setTopFiveBooks(Array.isArray(prof?.top_five_books) ? prof.top_five_books as string[] : []);
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

  const handleSave = async () => {
    await saveProfile();
  };

  const handleUpdateEmail = async () => {
    // This would open a dialog or prompt for new email
    toast({ title: "Email change functionality coming soon" });
  };

  const handleUpdatePassword = async () => {
    if (!newPassword) {
      toast({ title: "Please enter a new password", variant: "destructive" });
      return;
    }
    await updatePassword();
  };

  const handleLogout = async () => {
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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/profile">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Profile
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Settings</h1>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <SettingsTabs
          uid={uid}
          favoriteBookId={favoriteBookId}
          currentBookId={currentBookId}
          topFiveBooks={topFiveBooks}
          onFavoriteBookChange={setFavoriteBookId}
          onCurrentBookChange={setCurrentBookId}
          onTopFiveBooksChange={setTopFiveBooks}
          completedBooksThisYear={completedBooksThisYear}
          avatarUrl={avatarUrl}
          bio={bio}
          socialMediaLinks={socialMediaLinks}
          websiteUrl={websiteUrl}
          onBioChange={setBio}
          onSocialMediaLinksChange={setSocialMediaLinks}
          onWebsiteUrlChange={setWebsiteUrl}
          onAvatarClick={() => fileInputRef.current?.click()}
          displayName={displayName}
          username={username}
          email={email}
          birthday={birthday}
          newPassword={newPassword}
          normUsername={normUsername}
          usernameAvailable={usernameAvailable}
          checkingUsername={checkingUsername}
          onDisplayNameChange={setDisplayName}
          onUsernameChange={setUsername}
          onBirthdayChange={setBirthday}
          onNewPasswordChange={setNewPassword}
          onUpdateEmail={handleUpdateEmail}
          onUpdatePassword={handleUpdatePassword}
          displayPreference={displayPreference}
          temperatureUnit={temperatureUnit}
          backgroundColor={backgroundColor}
          textColor={textColor}
          accentColor={accentColor}
          accentTextColor={accentTextColor}
          onDisplayPreferenceChange={setDisplayPreference}
          onTemperatureUnitChange={setTemperatureUnit}
          onBackgroundColorChange={setBackgroundColor}
          onTextColorChange={setTextColor}
          onAccentColorChange={setAccentColor}
          onAccentTextColorChange={setAccentTextColor}
        />

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={usernameAvailable === false}>
            Save All Changes
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Crop Modal */}
      <Dialog open={showCropModal} onOpenChange={setShowCropModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crop your photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedImage && (
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
              >
                <img
                  ref={imgRef}
                  src={selectedImage}
                  alt="Crop preview"
                  style={{ maxHeight: '400px' }}
                />
              </ReactCrop>
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
