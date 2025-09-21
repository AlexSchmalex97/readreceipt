import { hasSupabase, supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export function AuthButtons() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (!hasSupabase || !supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session?.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setLoggedIn(!!sess?.user);
    });
    return () => {
      try {
        sub?.subscription?.unsubscribe();
      } catch {}
    };
  }, []);

  if (!hasSupabase || !supabase) {
    return null; // hide buttons if Supabase isn’t configured
  }

  const signIn = async () => {
    // use GitHub as default provider, can swap to "google" if you prefer
    await supabase.auth.signInWithOAuth({ provider: "github" });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div>
      {loggedIn ? (
        <button
          onClick={signOut}
          className="px-3 py-2 rounded bg-secondary text-secondary-foreground"
        >
          Sign out
        </button>
      ) : (
        <button
          onClick={signIn}
          className="px-3 py-2 rounded bg-primary text-primary-foreground"
        >
          Sign in / Create account
        </button>
      )}
    </div>
  );
}
