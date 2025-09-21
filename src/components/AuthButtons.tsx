import { hasSupabase, supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export function AuthButtons() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [email, setEmail] = useState("");

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

  const signIn = () => setChooserOpen((v) => !v);

  async function signInWithGoogle() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
      if (error) throw error;
    } catch (e: any) {
      alert(e?.message ?? "Google sign-in failed.");
    }
  }

// in AuthButtons.tsx
async function signInWithEmail() {
  try {
    if (!email) return alert("Enter your email address first.");
    const { error } = await supabase!.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }, // 👈 key line
    });
    if (error) throw error;
    alert("Check your email for a login link.");
    setChooserOpen(false);
  } catch (e: any) {
    alert(e?.message ?? "Email sign-in failed.");
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
            onClick={signIn}
            className="px-3 py-2 rounded bg-primary text-primary-foreground"
          >
            Sign in / Create account
          </button>

          {chooserOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded border border-border bg-card p-4 shadow-card z-10 space-y-3">
              <button
                onClick={signInWithGoogle}
                className="w-full px-3 py-2 rounded bg-secondary text-secondary-foreground"
              >
                Continue with Google
              </button>

              <div className="space-y-2">
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded border bg-background"
                />
                <button
                  onClick={signInWithEmail}
                  className="w-full px-3 py-2 rounded bg-secondary text-secondary-foreground"
                >
                  Send magic link
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
