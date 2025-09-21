import { useEffect, useMemo, useState } from "react";
import { hasSupabase, supabase } from "@/lib/supabase";

function normalizeUsername(raw: string) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function Profile() {
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // profile fields
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const normUsername = useMemo(() => normalizeUsername(username), [username]);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUser, setCheckingUser] = useState(false);

  // auth fields
  const [email, setEmail] = useState("");
  const [linkedGoogle, setLinkedGoogle] = useState(false);

  // password change fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // status
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);

  useEffect(() => {
    if (!hasSupabase || !supabase) return;

    (async () => {
      setLoading(true);
      const { data: userRes } = await supabase.auth.getUser();
      const u = userRes.user;
      if (!u) {
        setUid(null);
        setLoading(false);
        return;
      }

      setUid(u.id);
      setEmail(u.email ?? "");

      // identities array can tell us which providers are linked
      const googleLinked = (u.identities || []).some((id: any) => id.provider === "google");
      setLinkedGoogle(!!googleLinked);

      // Load profile (display_name, username)
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name, username, email")
        .eq("id", u.id)
        .maybeSingle();

      setDisplayName(prof?.display_name ?? u.user_metadata?.name ?? "");
      setUsername(prof?.username ?? "");
      // email is also kept in profiles.email (for search); show auth email as the editable source
      setLoading(false);
    })();
  }, []);

  // Check username availability
  useEffect(() => {
    if (!hasSupabase || !supabase) return;
    if (!uid) return;
    const run = async () => {
      if (!normUsername) {
        setUsernameAvailable(null);
        return;
      }
      setCheckingUser(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", normUsername)
        .limit(1);
      if (!error) {
        // available if nobody has it OR the only row is me
        setUsernameAvailable(!data?.length || data[0].id === uid);
      }
      setCheckingUser(false);
    };
    run();
  }, [normUsername, uid]);

  const saveProfile = async () => {
    if (!uid) return;
    if (!displayName.trim()) return alert("Please enter a display name.");
    if (!normUsername) return alert("Please choose a username.");
    if (usernameAvailable === false) return alert("Username is taken.");

    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim(), username: normUsername })
      .eq("id", uid);
    setSavingProfile(false);

    if (error) alert(error.message);
    else alert("Profile saved!");
  };

  const saveEmail = async () => {
    if (!uid) return;
    if (!email.trim()) return alert("Please enter an email.");
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    setSavingEmail(false);
    if (error) alert(error.message);
    else {
      alert(
        "Email update requested. If email confirmation is enabled, check your inbox to confirm the change."
      );
      // Also mirror into profiles for search (non-blocking)
      supabase.from("profiles").update({ email: email.trim() }).eq("id", uid);
    }
  };

  const savePassword = async () => {
    if (!uid) return;
    if (newPassword.length < 8) return alert("Password must be at least 8 characters.");
    if (newPassword !== confirmPassword) return alert("Passwords do not match.");
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) alert(error.message);
    else {
      alert("Password updated.");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  // Link/Unlink Google (feature-detected)
  const linkGoogle = async () => {
    try {
      setLinkingGoogle(true);
      // Newer supabase-js: linkIdentity (recommended)
      // @ts-ignore - feature detect at runtime
      if (typeof supabase.auth.linkIdentity === "function") {
        // @ts-ignore
        const { error } = await supabase.auth.linkIdentity({ provider: "google" });
        setLinkingGoogle(false);
        if (error) return alert(error.message);
        // The SDK will redirect to Google; after returning, identities should include Google.
        return;
      }
      // Fallback: start a Google OAuth flow; if session exists, GoTrue will link
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      setLinkingGoogle(false);
      if (error) alert(error.message);
    } catch (e: any) {
      setLinkingGoogle(false);
      alert(e?.message ?? "Failed to link Google.");
    }
  };

  const unlinkGoogle = async () => {
    try {
      // Newer supabase-js: unlinkIdentity with identity_id
      const { data: userRes } = await supabase.auth.getUser();
      const u = userRes.user;
      const googleIdentity = (u?.identities || []).find((i: any) => i.provider === "google");
      // @ts-ignore - feature detect at runtime
      if (googleIdentity && typeof supabase.auth.unlinkIdentity === "function") {
        // @ts-ignore
        const { error } = await supabase.auth.unlinkIdentity({ identity_id: googleIdentity.identity_id });
        if (error) return alert(error.message);
        alert("Google account unlinked.");
        setLinkedGoogle(false);
        return;
      }
      alert("Unlink not supported by this client version. Update @supabase/supabase-js to use unlinkIdentity.");
    } catch (e: any) {
      alert(e?.message ?? "Failed to unlink Google.");
    }
  };

  if (!hasSupabase || !supabase) {
    return <div className="p-6">Supabase is not configured.</div>;
  }
  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading…</div>;
  }
  if (!uid) {
    return <div className="p-6">Please sign in to edit your profile.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">Your Profile</h1>

      {/* Display name + Username */}
      <section className="bg-card p-4 rounded border space-y-3">
        <div className="font-medium">Public profile</div>

        <label className="block text-sm">Display name</label>
        <input
          className="w-full px-3 py-2 rounded border bg-background"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g., Alex"
        />

        <label className="block text-sm mt-3">Username (unique)</label>
        <input
          className="w-full px-3 py-2 rounded border bg-background"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="your_handle"
        />
        {username && (
          <div className="text-xs mt-1">
            @{normUsername}{" "}
            {checkingUser
              ? "• checking…"
              : usernameAvailable == null
              ? ""
              : usernameAvailable
              ? "• available"
              : "• taken"}
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={saveProfile}
            disabled={savingProfile}
            className="px-4 py-2 rounded bg-primary text-primary-foreground"
          >
            {savingProfile ? "Saving…" : "Save profile"}
          </button>
        </div>
      </section>

      {/* Email */}
      <section className="bg-card p-4 rounded border space-y-3">
        <div className="font-medium">Email</div>
        <input
          className="w-full px-3 py-2 rounded border bg-background"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          type="email"
          autoComplete="email"
        />
        <div>
          <button
            onClick={saveEmail}
            disabled={savingEmail}
            className="px-4 py-2 rounded bg-secondary text-secondary-foreground"
          >
            {savingEmail ? "Updating…" : "Update email"}
          </button>
          <p className="text-xs text-muted-foreground mt-2">
            If email verification is enabled, you’ll receive a confirmation link.
          </p>
        </div>
      </section>

      {/* Password */}
      <section className="bg-card p-4 rounded border space-y-3">
        <div className="font-medium">Password</div>
        <input
          className="w-full px-3 py-2 rounded border bg-background"
          type="password"
          placeholder="New password (min 8 chars)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
        />
        <input
          className="w-full px-3 py-2 rounded border bg-background"
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />
        <div>
          <button
            onClick={savePassword}
            disabled={savingPassword}
            className="px-4 py-2 rounded border"
          >
            {savingPassword ? "Saving…" : "Update password"}
          </button>
        </div>
      </section>

      {/* Google link/unlink */}
      <section className="bg-card p-4 rounded border space-y-3">
        <div className="font-medium">Linked accounts</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Google</div>
            <div className="text-xs text-muted-foreground">
              {linkedGoogle ? "Linked" : "Not linked"}
            </div>
          </div>
          {linkedGoogle ? (
            <button onClick={unlinkGoogle} className="px-4 py-2 rounded border">
              Unlink Google
            </button>
          ) : (
            <button
              onClick={linkGoogle}
              disabled={linkingGoogle}
              className="px-4 py-2 rounded border"
            >
              {linkingGoogle ? "Opening…" : "Link Google"}
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          If your Supabase client doesn’t support identity linking, update <code>@supabase/supabase-js</code>.
        </p>
      </section>
    </div>
  );
}
