import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export default function AuthButtons() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          setLoggedIn(true);
          await loadGreeting(data.session.user.id);
        }
      } catch (error) {
        console.error("Auth session error:", error);
      }
    };
    initAuth();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, sess) => {
      if (sess?.user) {
        setLoggedIn(true);
        await loadGreeting(sess.user.id);
      } else {
        setLoggedIn(false);
        setUserName(null);
      }
    });

    return () => {
      try {
        sub?.subscription?.unsubscribe();
      } catch (error) {
        console.error("Auth cleanup error:", error);
      }
    };
  }, []);

  // Refresh greeting if profile updates elsewhere
  useEffect(() => {
    const handleProfileUpdate = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) await loadGreeting(data.session.user.id);
    };
    window.addEventListener("profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("profile-updated", handleProfileUpdate);
  }, []);

  async function loadGreeting(userId: string) {
    try {
      // Prefer profiles.display_name
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle();

      if (prof?.display_name) {
        setUserName(prof.display_name);
        return;
      }

      // Fallback to user_metadata.display_name
      const { data: { user } } = await supabase.auth.getUser();
      const dn =
        (user?.user_metadata as any)?.display_name ??
        (user?.user_metadata as any)?.name ??
        null;
      setUserName(dn);
    } catch (error) {
      console.error("Greeting load error:", error);
    }
  }

  const togglePanel = () => setPanelOpen((v) => !v);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEmailPassword();
    }
  };

  async function handleEmailPassword() {
    try {
      if (!email || !password) return alert("Enter email and password.");

      if (mode === "signin") {
        // ---------- SIGN IN ----------
        // Allow login via username OR email
        let loginEmail = email;
        if (!email.includes("@")) {
          const usernameInput = email.trim().toLowerCase(); // case-insensitive
          const { data: row, error } = await supabase
            .from("profiles")
            .select("email")
            .eq("username", usernameInput)
            .maybeSingle();
          if (error) throw error;
          if (!row?.email) throw new Error("No account found with that username.");
          loginEmail = row.email;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });
        if (error) throw error;

      } else {
        // ---------- SIGN UP ----------
        if (!displayName || !username) {
          return alert("Enter display name and username.");
        }

        // 1) normalize username (NOT case-sensitive)
        const normalizedUsername = username.trim().toLowerCase();

        // 2) check availability in profiles (DB also enforces with lower(username) unique index)
        const { data: taken, error: checkErr } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", normalizedUsername)
          .maybeSingle();
        if (checkErr) throw checkErr;
        if (taken) throw new Error("That username is already taken.");

        // 3) create auth user AND store identity in user_metadata
        //    (DB trigger will auto-create the profiles row from this)
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              username: normalizedUsername,
              display_name: displayName,
            },
          },
        });
        if (signUpError) throw signUpError;

        // 4) DO NOT insert into profiles here — the DB trigger handles it
        alert("Account created. You’re all set!");
      }

      // reset form + close panel
      setPanelOpen(false);
      setEmail("");
      setPassword("");
      setDisplayName("");
      setUsername("");
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
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <div className="relative">
      {loggedIn ? (
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground text-center">
            <div>Happy reading,</div>
            <div>{userName || "Reader"}!</div>
          </div>
          <button
            onClick={signOut}
            className="px-3 py-2 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            Sign out
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={togglePanel}
            className="px-3 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Sign in / Create account
          </button>

          {panelOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded border border-border bg-card p-4 shadow-card z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium">
                  {mode === "signin"
                    ? "Sign in with Email or Username"
                    : "Create an Account"}
                </div>
                <button
                  onClick={() =>
                    setMode((m) => (m === "signin" ? "signup" : "signin"))
                  }
                  className="text-xs underline hover:no-underline"
                >
                  {mode === "signin" ? "Need an account?" : "Have an account?"}
                </button>
              </div>

              <div className="space-y-2 mb-3">
                {mode === "signup" && (
                  <>
                    <input
                      type="text"
                      placeholder="Display name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="text"
                      placeholder="Username (unique)"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </>
                )}

                <input
                  type="text"
                  placeholder={
                    mode === "signin" ? "Email or Username" : "you@example.com"
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-3 py-2 rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  autoComplete="email"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-3 py-2 rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                />

                <button
                  onClick={handleEmailPassword}
                  className="w-full px-3 py-2 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  {mode === "signin" ? "Sign in" : "Create account"}
                </button>
              </div>

              <div className="relative my-3 text-center text-xs text-muted-foreground">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <span className="bg-card px-2">or</span>
              </div>

              <button
                onClick={signInWithGoogle}
                className="w-full px-3 py-2 rounded border border-border hover:bg-accent transition-colors"
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
