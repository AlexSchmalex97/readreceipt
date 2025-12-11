import { useState } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ReadingGoals } from "@/components/ReadingGoals";
import { FavoriteBookSelector } from "@/components/FavoriteBookSelector";
import { TopFiveBooksDialog } from "@/components/TopFiveBooksDialog";
import { SocialMediaInput } from "@/components/SocialMediaInput";
import { BackgroundImageSettings } from "@/components/BackgroundImageSettings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, User, Settings as SettingsIcon, Palette, Camera, Link as LinkIcon, Upload, Download } from "lucide-react";
import { useUserAccent } from "@/hooks/useUserAccent";

interface Identity {
  id: string;
  provider: string;
}

interface SettingsTabsProps {
  uid: string | null;
  identities: Identity[];
  googleLinked: boolean;
  onLinkGoogle: () => void;
  onUnlinkGoogle: () => void;
  // Reading Settings
  favoriteBookId?: string;
  currentBookId?: string;
  topFiveBooks: string[];
  onFavoriteBookChange: (bookId: string | undefined) => void;
  onCurrentBookChange: (bookId: string | undefined) => void;
  onTopFiveBooksChange: (bookIds: string[]) => void;
  completedBooksThisYear: number;

  // Profile Settings
  avatarUrl: string | null;
  bio: string;
  socialMediaLinks: { platform: string; url: string }[];
  websiteUrl: string;
  onBioChange: (bio: string) => void;
  onSocialMediaLinksChange: (links: { platform: string; url: string }[]) => void;
  onWebsiteUrlChange: (url: string) => void;
  onAvatarClick: () => void;

  // Account Settings
  displayName: string;
  username: string;
  email: string;
  birthday: string;
  newPassword: string;
  normUsername: string;
  usernameAvailable: boolean | null;
  checkingUsername: boolean;
  onDisplayNameChange: (name: string) => void;
  onUsernameChange: (username: string) => void;
  onBirthdayChange: (birthday: string) => void;
  onNewPasswordChange: (password: string) => void;
  onUpdateEmail: () => void;
  onUpdatePassword: () => void;

  // Display Settings
  displayPreference: 'quotes' | 'time_weather' | 'both';
  temperatureUnit: 'celsius' | 'fahrenheit';
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  accentTextColor: string;
  backgroundImageUrl: string | null;
  backgroundTint: { color: string; opacity: number } | null;
  backgroundType: 'color' | 'image';
  onDisplayPreferenceChange: (pref: 'quotes' | 'time_weather' | 'both') => void;
  onTemperatureUnitChange: (unit: 'celsius' | 'fahrenheit') => void;
  onBackgroundColorChange: (color: string) => void;
  onTextColorChange: (color: string) => void;
  onAccentColorChange: (color: string) => void;
  onAccentTextColorChange: (color: string) => void;
  onBackgroundUpdate: () => void;
}

export function SettingsTabs(props: SettingsTabsProps) {
  const { toast } = useToast();
  const { accentCardColor, accentTextColor: userAccentTextColor } = useUserAccent();
  
  // Wrapper component for styled cards
  const StyledCard = ({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
    <Card 
      className={className} 
      style={{ backgroundColor: accentCardColor, color: userAccentTextColor }}
      {...rest}
    >
      {children}
    </Card>
  );
  
  return (
    <Tabs defaultValue="reading" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="reading" className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          <span className="hidden sm:inline">Reading</span>
        </TabsTrigger>
        <TabsTrigger value="profile" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Profile</span>
        </TabsTrigger>
        <TabsTrigger value="account" className="flex items-center gap-2">
          <SettingsIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Account</span>
        </TabsTrigger>
        <TabsTrigger value="display" className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          <span className="hidden sm:inline">Display</span>
        </TabsTrigger>
      </TabsList>

      {/* Reading Settings Tab */}
      <TabsContent value="reading" className="space-y-6">
        <StyledCard>
          <CardHeader>
            <CardTitle>Reading Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <ReadingGoals userId={props.uid} completedBooksThisYear={props.completedBooksThisYear} />
          </CardContent>
        </StyledCard>

        <StyledCard>
          <CardHeader>
            <CardTitle>Favorite Book</CardTitle>
          </CardHeader>
          <CardContent>
            <FavoriteBookSelector
              value={props.favoriteBookId}
              onChange={props.onFavoriteBookChange}
            />
          </CardContent>
        </StyledCard>

        <StyledCard>
          <CardHeader>
            <CardTitle>Currently Reading</CardTitle>
          </CardHeader>
          <CardContent>
            <FavoriteBookSelector
              value={props.currentBookId}
              onChange={props.onCurrentBookChange}
              label="Currently Reading Book"
              placeholder="Select your currently reading book..."
            />
          </CardContent>
        </StyledCard>

        <StyledCard>
          <CardHeader>
            <CardTitle>Top Five Books</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Select up to 10 of your favorite books for your Top Ten. Drag to reorder. Your Top Five will show on your profile.
            </p>
            <TopFiveBooksDialog
              currentTopFive={props.topFiveBooks}
              onSave={() => window.location.reload()}
            >
              <Button variant="outline">
                {props.topFiveBooks.length === 0 ? 'Edit Top Ten' : `Edit Top Ten (${props.topFiveBooks.length}/10)`}
              </Button>
            </TopFiveBooksDialog>
          </CardContent>
        </StyledCard>

        <StyledCard>
          <CardHeader>
            <CardTitle>Data Import & Export</CardTitle>
            <CardDescription>
              Import your library from Goodreads, Fable, StoryGraph, or Bookly, or export your ReadReceipt library
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Goodreads CSV</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Import your Goodreads library or export your ReadReceipt library in Goodreads CSV format
              </p>
              <div className="flex gap-4">
                <Button 
                  onClick={async () => {
                    try {
                      const { exportToGoodreadsCSV, downloadCSV } = await import("@/lib/csvExport");
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) return;
                      const csvContent = await exportToGoodreadsCSV(user.id);
                      const timestamp = new Date().toISOString().split("T")[0];
                      downloadCSV(csvContent, `readreceipt-export-${timestamp}.csv`);
                      toast({
                        title: "Export successful",
                        description: "Your library has been exported to CSV format",
                      });
                    } catch (error: any) {
                      toast({
                        title: "Export failed",
                        description: error.message,
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export to CSV
                </Button>
                <Button variant="outline" asChild>
                  <label className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    Import CSV
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const { importGoodreadsCSV } = await import("@/lib/csvImport");
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) return;
                          const csvContent = await file.text();
                          const { imported, errors } = await importGoodreadsCSV(csvContent, user.id);
                          toast({
                            title: "Import complete",
                            description: `Successfully imported ${imported} books${errors.length > 0 ? `. ${errors.length} errors occurred.` : ""}`,
                          });
                        } catch (error: any) {
                          toast({
                            title: "Import failed",
                            description: error.message,
                            variant: "destructive",
                          });
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                </Button>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> Fable, StoryGraph, and Bookly also support Goodreads CSV format. 
                Export your library from those platforms and import it here using the same CSV import feature.
              </p>
            </div>
          </CardContent>
        </StyledCard>
      </TabsContent>

      {/* Profile Settings Tab */}
      <TabsContent value="profile" className="space-y-6">
        <StyledCard>
          <CardHeader>
            <CardTitle>Profile Photo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                {props.avatarUrl ? (
                  <img src={props.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-16 h-16 text-muted-foreground" />
                )}
              </div>
            </div>
            <Button onClick={props.onAvatarClick} variant="outline">
              <Camera className="mr-2 h-4 w-4" />
              Change Photo
            </Button>
          </CardContent>
        </StyledCard>

        <StyledCard>
          <CardHeader>
            <CardTitle>Bio</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Tell us about yourself..."
              value={props.bio}
              onChange={(e) => props.onBioChange(e.target.value)}
              className="min-h-[100px]"
            />
          </CardContent>
        </StyledCard>

        <StyledCard>
          <CardHeader>
            <CardTitle>Social Media Links</CardTitle>
          </CardHeader>
          <CardContent>
            <SocialMediaInput
              value={props.socialMediaLinks}
              onChange={props.onSocialMediaLinksChange}
            />
          </CardContent>
        </StyledCard>

        <StyledCard>
          <CardHeader>
            <CardTitle>Website URL</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="https://yourwebsite.com"
              value={props.websiteUrl}
              onChange={(e) => props.onWebsiteUrlChange(e.target.value)}
            />
          </CardContent>
        </StyledCard>
      </TabsContent>

      {/* Account Settings Tab */}
      <TabsContent value="account" className="space-y-6">
        <StyledCard>
          <CardHeader>
            <CardTitle>Display Name</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Your display name"
              value={props.displayName}
              onChange={(e) => props.onDisplayNameChange(e.target.value)}
            />
          </CardContent>
        </StyledCard>

        <StyledCard>
          <CardHeader>
            <CardTitle>Username</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="username"
              value={props.username}
              onChange={(e) => props.onUsernameChange(e.target.value)}
            />
            {props.normUsername && props.normUsername !== props.username && (
              <p className="text-sm text-muted-foreground">
                Will be saved as: {props.normUsername}
              </p>
            )}
            {props.checkingUsername && (
              <p className="text-sm text-muted-foreground">Checking availability...</p>
            )}
            {props.usernameAvailable === false && (
              <p className="text-sm text-destructive">Username is already taken</p>
            )}
            {props.usernameAvailable === true && (
              <p className="text-sm text-green-600">Username is available</p>
            )}
          </CardContent>
        </StyledCard>

        <StyledCard>
          <CardHeader>
            <CardTitle>Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="email"
              placeholder="email@example.com"
              value={props.email}
              disabled
            />
            <Button onClick={props.onUpdateEmail} variant="outline">
              Change Email
            </Button>
          </CardContent>
        </StyledCard>

        <StyledCard>
          <CardHeader>
            <CardTitle>Password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="New password"
              value={props.newPassword}
              onChange={(e) => props.onNewPasswordChange(e.target.value)}
            />
            <Button onClick={props.onUpdatePassword}>
              Update Password
            </Button>
          </CardContent>
        </StyledCard>

        <StyledCard>
          <CardHeader>
            <CardTitle>Birthday</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="date"
              value={props.birthday}
              onChange={(e) => props.onBirthdayChange(e.target.value)}
            />
          </CardContent>
        </StyledCard>

        <StyledCard>
          <CardHeader>
            <CardTitle>Connected Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Google</p>
                  <p className="text-xs text-muted-foreground">
                    {props.googleLinked ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </div>
              {props.googleLinked ? (
                <Button variant="outline" size="sm" onClick={props.onUnlinkGoogle}>
                  Disconnect
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={props.onLinkGoogle}>
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Connect
                </Button>
              )}
            </div>
          </CardContent>
        </StyledCard>

      </TabsContent>

      {/* Display Settings Tab */}
      <TabsContent value="display" className="space-y-6">
        <StyledCard>
          <CardHeader>
            <CardTitle>Background Image</CardTitle>
            <CardDescription>Upload a custom background image for your profile</CardDescription>
          </CardHeader>
          <CardContent>
            <BackgroundImageSettings
              backgroundImageUrl={props.backgroundImageUrl}
              backgroundTint={props.backgroundTint}
              backgroundType={props.backgroundType}
              onUpdate={props.onBackgroundUpdate}
            />
          </CardContent>
        </StyledCard>

        <StyledCard>
          <CardHeader>
            <CardTitle>Header Display</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label>Display Preference</Label>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={props.displayPreference === 'quotes' ? 'default' : 'outline'}
                onClick={() => props.onDisplayPreferenceChange('quotes')}
                size="sm"
              >
                Quotes Only
              </Button>
              <Button
                variant={props.displayPreference === 'time_weather' ? 'default' : 'outline'}
                onClick={() => props.onDisplayPreferenceChange('time_weather')}
                size="sm"
              >
                Time & Weather
              </Button>
              <Button
                variant={props.displayPreference === 'both' ? 'default' : 'outline'}
                onClick={() => props.onDisplayPreferenceChange('both')}
                size="sm"
              >
                Both
              </Button>
            </div>
          </CardContent>
        </StyledCard>

        <StyledCard>
          <CardHeader>
            <CardTitle>Temperature Unit</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button
              variant={props.temperatureUnit === 'celsius' ? 'default' : 'outline'}
              onClick={() => props.onTemperatureUnitChange('celsius')}
              size="sm"
            >
              Celsius
            </Button>
            <Button
              variant={props.temperatureUnit === 'fahrenheit' ? 'default' : 'outline'}
              onClick={() => props.onTemperatureUnitChange('fahrenheit')}
              size="sm"
            >
              Fahrenheit
            </Button>
          </CardContent>
        </StyledCard>

        <StyledCard>
          <CardHeader>
            <CardTitle>Profile Colors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Background Color</Label>
              <Input
                type="color"
                value={props.backgroundColor}
                onChange={(e) => props.onBackgroundColorChange(e.target.value)}
                className="h-10 w-full"
              />
            </div>
            <div>
              <Label>Text Color</Label>
              <Input
                type="color"
                value={props.textColor}
                onChange={(e) => props.onTextColorChange(e.target.value)}
                className="h-10 w-full"
              />
            </div>
            <div style={{ backgroundColor: props.accentColor }}>
              <Label style={{ color: props.accentTextColor }}>Accent Color</Label>
              <Input
                type="color"
                value={props.accentColor}
                onChange={(e) => props.onAccentColorChange(e.target.value)}
                className="h-10 w-full"
              />
            </div>
            <div style={{ backgroundColor: props.accentColor }}>
              <Label style={{ color: props.accentTextColor }}>Accent Text Color</Label>
              <Input
                type="color"
                value={props.accentTextColor}
                onChange={(e) => props.onAccentTextColorChange(e.target.value)}
                className="h-10 w-full"
              />
            </div>
          </CardContent>
        </StyledCard>
      </TabsContent>
    </Tabs>
  );
}
