import { hasSupabase, supabase } from "@/lib/supabase";
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
    if (!hasSupabase || !supabase) return;

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        setLoggedIn(true);
        await fetchProfile(data.session.user.id);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      if (sess?.user) {
        setLoggedIn(true);
        fetchProfile(sess.user.id);
      } else {
        setLoggedIn(false);
        setUserName(null);
      }
    });

    return () => {
      try {
        sub?.subscription?.unsubscribe();
      } catch {}
    };
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();
    if (data) setUserName(data.display_name);
  }

  const togglePanel = () => setPanelOpen((v) => !v);

  async function handleEmailPassword() {
    try {
      if (!email || !password) return alert("Enter email and password.");

      if (mode === "signin") {
        // Allow login via username OR email
        let loginEmail = email;
        if (!email.includes("@")) {
          // looks like a username → look it up
          const { data: userByUsername } = await supabase
            .from("profiles")
            .select("id, email")
            .eq("username", email.toLowerCase())
            .single();
          if (!userByUsername) throw new Error("No account with that username.");
          loginEmail = userByUsername.email;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });
        if (error) throw error;
      } else {
        // Sign up new user
        if (!displayName || !username) {
          return alert("Enter display name and username.");
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;

        if (data.user) {
          await supabase.from("profiles").insert([
            {
              id: data.user.id,
              email,
              display_name: displayName,
              username: username.toLowerCase(),
            },
          ]);
        }

        alert("Account created. Check your email if verification is required.");
      }

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
    await supabase.auth.signOut();
  };

  if (!hasSupabase || !supabase) return null;

  return (
    <div className="relative">
      {loggedIn ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Happy reading, {userName || "Reader"}!
          </span>
          <button
            onClick={signOut}
            className="px-3 py-2 rounded bg-secondary text-secondary-foreground"
          >
            Sign out
          </button>
        </div>
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
                  {mode === "signin"
                    ? "Sign in with Email or Username"
                    : "Create an Account"}
                </div>
                <button
                  onClick={() =>
                    setMode((m) => (m === "signin" ? "signup" : "signin"))
                  }
                  className="text-xs underline"
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
                      className="w-full px-3 py-2 rounded border bg-background"
                    />
                    <input
                      type="text"
                      placeholder="Username (unique)"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2 rounded border bg-background"
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
                  className="w-full px-3 py-2 rounded border bg-background"
                  autoComplete="email"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded border bg-background"
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
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
