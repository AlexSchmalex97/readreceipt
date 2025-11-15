import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ReadingGoals } from "@/components/ReadingGoals";
import { FavoriteBookSelector } from "@/components/FavoriteBookSelector";
import { TopFiveBooksDialog } from "@/components/TopFiveBooksDialog";
import { SocialMediaInput } from "@/components/SocialMediaInput";
import { BookOpen, User, Settings as SettingsIcon, Palette, Camera } from "lucide-react";

interface SettingsTabsProps {
  uid: string | null;
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
  onDisplayPreferenceChange: (pref: 'quotes' | 'time_weather' | 'both') => void;
  onTemperatureUnitChange: (unit: 'celsius' | 'fahrenheit') => void;
  onBackgroundColorChange: (color: string) => void;
  onTextColorChange: (color: string) => void;
  onAccentColorChange: (color: string) => void;
  onAccentTextColorChange: (color: string) => void;
}

export function SettingsTabs(props: SettingsTabsProps) {
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
        <Card>
          <CardHeader>
            <CardTitle>Reading Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <ReadingGoals userId={props.uid} completedBooksThisYear={props.completedBooksThisYear} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Favorite Book</CardTitle>
          </CardHeader>
          <CardContent>
            <FavoriteBookSelector
              value={props.favoriteBookId}
              onChange={props.onFavoriteBookChange}
            />
          </CardContent>
        </Card>

        <Card>
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
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Five Books</CardTitle>
          </CardHeader>
          <CardContent>
            <TopFiveBooksDialog
              currentTopFive={props.topFiveBooks}
              onSave={() => {}}
            >
              <Button variant="outline">Edit Top Five</Button>
            </TopFiveBooksDialog>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Profile Settings Tab */}
      <TabsContent value="profile" className="space-y-6">
        <Card>
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
        </Card>

        <Card>
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
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Social Media Links</CardTitle>
          </CardHeader>
          <CardContent>
            <SocialMediaInput
              value={props.socialMediaLinks}
              onChange={props.onSocialMediaLinksChange}
            />
          </CardContent>
        </Card>

        <Card>
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
        </Card>
      </TabsContent>

      {/* Account Settings Tab */}
      <TabsContent value="account" className="space-y-6">
        <Card>
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
        </Card>

        <Card>
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
        </Card>

        <Card>
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
        </Card>

        <Card>
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
        </Card>

        <Card>
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
        </Card>
      </TabsContent>

      {/* Display Settings Tab */}
      <TabsContent value="display" className="space-y-6">
        <Card>
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
        </Card>

        <Card>
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
        </Card>

        <Card>
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
            <div>
              <Label>Accent Color</Label>
              <Input
                type="color"
                value={props.accentColor}
                onChange={(e) => props.onAccentColorChange(e.target.value)}
                className="h-10 w-full"
              />
            </div>
            <div>
              <Label>Accent Text Color</Label>
              <Input
                type="color"
                value={props.accentTextColor}
                onChange={(e) => props.onAccentTextColorChange(e.target.value)}
                className="h-10 w-full"
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
