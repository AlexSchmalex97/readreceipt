import { hasSupabase, supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export function AuthButtons() {
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");       // 👈 NEW
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Load auth state + profile name
  useEffect(() => {
    if (!hasSupabase || !supabase) return;

    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);

      if (uid) {
        // Prefer profiles.display_name; fall back to user metadata name or email
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", uid)
          .maybeSingle();

        const fallback =
          data.session?.user?.user_metadata?.name ??
          data.session?.user?.email ??
          "Reader";

        setDisplayName(prof?.display_name || fallback);
      } else {
        setDisplayName(null);
      }
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      const uid = sess?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        supabase
          .from("profiles")
          .select("display_name")
          .eq("id", uid)
          .maybeSingle()
          .then(({ data }) => {
            const fallback =
              sess?.user?.user_metadata?.name ?? sess?.user?.email ?? "Reader";
            setDisplayName(data?.display_name || fallback);
          });
      } else {
        setDisplayName(null);
      }
    });

    return () => {
      try { sub?.subscription?.unsubscribe(); } catch {}
    };
  }, []);

  if (!hasSupabase || !supabase) return null;

  const togglePanel = () => setPanelOpen(v => !v);

  async function handleEmailPassword() {
    try {
      if (!email || !password) return alert("Enter email and password.");

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        // SIGN UP: include Name in user metadata so your trigger fills profiles.display_name
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { name }, // 👈 raw_user_meta_data->>'name'
          },
        });
        if (error) throw error;

        // If verification is OFF and we already have a session, ensure profile has the name
        const { data: u } = await supabase.auth.getUser();
        if (u?.user?.id && name) {
          await supabase.from("profiles").update({ display_name: name }).eq("id", u.user.id);
        }

        alert("Account created. If email verification is enabled, check your inbox.");
      }

      setPanelOpen(false);
      setName(""); setEmail(""); setPassword("");
    } catch (e: any) {
      alert(e?.message ?? "Authentication failed.");
    }
  }

  async function signInWithGoogle() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (e: any) {
      alert(e?.message ?? "Google sign-in failed.");
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // Logged-in view: greeting + Sign out
  if (userId) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm">
          Happy reading, <span className="font-medium">{displayName ?? "Reader"}</span>!
        </span>
        <button
          onClick={signOut}
          className="px-3 py-2 rounded bg-secondary text-secondary-foreground"
        >
          Sign out
        </button>
      </div>
    );
  }

  // Logged-out view: button → panel (with Name on Create account)
  return (
    <div className="relative">
      <button
        onClick={togglePanel}
        className="px-3 py-2 rounded bg-primary text-primary-foreground"
      >
        Sign in / Create account
      </button>

      {panelOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded border border-border bg-card p-4 shadow-card z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">
              {mode === "signin" ? "Sign in with Email" : "Create an Account"}
            </div>
            <button
              onClick={() => setMode(m => (m === "signin" ? "signup" : "signin"))}
              className="text-xs underline"
            >
              {mode === "signin" ? "Need an account?" : "Have an account?"}
            </button>
          </div>

          {mode === "signup" && (
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mb-2 px-3 py-2 rounded border bg-background"
              autoComplete="name"
            />
          )}

          <div className="space-y-2 mb-3">
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded border bg-background"
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded border bg-background"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
            <button
              onClick={handleEmailPassword}
              className="w-full px-3 py-2 rounded bg-secondary text-secondary-foreground"
            >
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </div>

          <div className="relative my-3 text-center text-xs text-muted-foreground">
            <span className="bg-card px-2">or</span>
          </div>

          <button
            onClick={signInWithGoogle}
            className="w-full px-3 py-2 rounded border"
          >
            Continue with Google
          </button>
        </div>
      )}
    </div>
  );
}
