import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";

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

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);

  // profile fields
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const normUsername = useMemo(() => normalizeUsername(username), [username]);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // auth fields
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

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
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", user.id)
        .maybeSingle();

      setDisplayName(prof?.display_name ?? "");
      setUsername(prof?.username ?? "");
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
  const saveProfile = async () => {
    try {
      if (!displayName.trim()) return alert("Please enter a display name.");
      if (!normUsername) return alert("Please enter a username.");
      if (usernameAvailable === false) return alert("That username is taken.");

      console.log("Saving profile:", { uid, displayName: displayName.trim(), username: normUsername });

      // First try to update existing profile
      const { data: updateData, error: updateError } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim(), username: normUsername })
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
              email: email // Include email from the current state
            }
          ])
          .select();

        console.log("Insert result:", { insertData, insertError });
        
        if (insertError) throw insertError;
      } else if (updateError) {
        throw updateError;
      }
      
      // Dispatch a custom event to notify other components about the profile update
      window.dispatchEvent(new CustomEvent('profile-updated'));
      
      alert("Profile updated! Your display name will now appear in greetings and social features.");
    } catch (e: any) {
      console.error("Profile save error:", e);
      alert(e?.message ?? "Failed to update profile.");
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
      <h1 className="text-2xl font-bold mb-6">Your Profile</h1>

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
    </div>
  );
}
