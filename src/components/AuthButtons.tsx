import { hasSupabase, supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export function AuthButtons() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!hasSupabase || !supabase) return;
    supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session?.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) =>
      setLoggedIn(!!sess?.user)
    );
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
        // If email confirmation is ON, user must click verify email before session starts
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin }
        });
        if (error) throw error;
        alert("Account created. Check your email if verification is required.");
      }
      setPanelOpen(false);
      setEmail(""); setPassword("");
    } catch (e: any) {
      alert(e?.message ?? "Authentication failed.");
    }
  }

  async function signInWithGoogle() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (e: any) {
      alert(e?.message ?? "Google sign-in failed.");
    }
  }

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <div className="relative">
      {loggedIn ? (
        <button
          onClick={signOut}
          className="px-3 py-2 rounded bg-secondary text-secondary-foreground"
        >
          Sign out
        </button>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
