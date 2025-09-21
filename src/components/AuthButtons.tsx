import { supabase } from "@/lib/supabase";

export function AuthButtons() {
  const signInWithGitHub = async () => {
    await supabase.auth.signInWithOAuth({ provider: "github" });
  };
  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  };
  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <div className="flex gap-2">
      <button onClick={signInWithGitHub} className="px-3 py-2 rounded bg-primary text-primary-foreground">Sign in with GitHub</button>
      <button onClick={signInWithGoogle} className="px-3 py-2 rounded bg-secondary text-secondary-foreground">Google</button>
      <button onClick={signOut} className="px-3 py-2 rounded border">Sign out</button>
    </div>
  );
}
