import { hasSupabase, supabase } from "@/lib/supabase";
import { useEffect, useMemo, useState } from "react";

function normalizeUsername(raw: string) {
  return raw.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
}

export function AuthButtons() {
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");        // NEW
  const [username, setUsername] = useState(""); // NEW
  const normUsername = useMemo(() => normalizeUsername(username), [username]);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Load session + greeting name
  useEffect(() => {
    if (!hasSupabase || !supabase) return;
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);

      if (uid) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", uid)
          .maybeSingle();

        setDisplayName(
          prof?.display_name ??
          data.session?.user?.user_metadata?.name ??
          data.session?.user?.email ??
          "Reader"
        );
      } else {
        setDisplayName(null);
      }
    };
    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      const uid = sess?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        supabase.from("profiles").select("display_name").eq("id", uid).maybeSingle().then(({ data }) => {
          setDisplayName(data?.display_name ?? sess?.user?.user_metadata?.name ?? sess?.user?.email ?? "Reader");
        });
      } else {
        setDisplayName(null);
      }
    });

    return () => { try { sub?.subscription?.unsubscribe(); } catch {} };
  }, []);

  // Username availability check (on signup mode)
  useEffect(() => {
    (async () => {
      if (mode !== "signup" || !normUsername) { setUsernameAvailable(null); return; }
      setChecking(true);
      const { data } = await supabase.from("profiles").select("id").eq("username", normUsername).limit(1);
      setUsernameAvailable(!(data && data.length));
      setChecking(false);
    })();
  }, [mode, normUsername]);

  if (!hasSupabase || !supabase) return null;

  const togglePanel = () => setPanelOpen(v => !v);

  async function handleEmailPassword() {
    try {
      if (!email || !password) return alert("Enter email and password.");

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!name.trim()) return alert("Please enter your name.");
        if (!normUsername) return alert("Please choose a username.");
        if (usernameAvailable === false) return alert("Username is taken.");

        // Create account with name in user metadata; redirect back here
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { name }, // picked up by the trigger for display_name
          },
        });
        if (error) throw error;

        // If a session is already active (email verification off), set username now.
        const { data: u } = await supabase.auth.getUser();
        if (u?.user?.id) {
          await supabase.from("profiles").update({
            display_name: name,
            username: normUsername,
          }).eq("id", u.user.id);
        }

        alert("Account created. If email verification is enabled, check your inbox.");
      }

      setPanelOpen(false);
      setName(""); setUsername(""); setEmail(""); setPassword("");
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

  const signOut = async () => { await supabase.auth.signOut(); };

  // Logged-in view: greeting + sign out (+ link to profile page to edit username later)
  if (userId) {
    return (
      <div className="flex items-center gap-3">
        <a href="/profile" className="text-sm text-muted-foreground hover:text-foreground">
          Happy reading, <span className="font-medium">{displayName ?? "Reader"}</span>!
        </a>
        <button
          onClick={signOut}
          className="px-3 py-2 rounded bg-secondary text-secondary-foreground"
        >
          Sign out
        </button>
      </div>
    );
  }

  // Logged-out view
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
            <>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full mb-2 px-3 py-2 rounded border bg-background"
                autoComplete="name"
              />
              <div className="mb-2">
                <input
                  type="text"
                  placeholder="Username (letters, numbers, _ )"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded border bg-background"
                  autoComplete="username"
                />
                {username && (
                  <div className="text-xs mt-1">
                    @{normUsername}{" "}
                    {checking ? "• checking…" : usernameAvailable == null ? "" : usernameAvailable ? "• available" : "• taken"}
                  </div>
                )}
              </div>
            </>
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

          <button onClick={signInWithGoogle} className="w-full px-3 py-2 rounded border">
            Continue with Google
          </button>
        </div>
      )}
    </div>
  );
}
