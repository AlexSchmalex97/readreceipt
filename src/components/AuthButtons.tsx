async function handleEmailPassword() {
  try {
    if (!password) return alert("Enter your password.");

    if (mode === "signin") {
      if (!identifier.trim()) return alert("Enter your email or username.");

      let emailToUse = "";

      if (identifier.includes("@")) {
        // Looks like an email
        emailToUse = identifier.trim();
      } else {
        // Treat as username: normalize + case-insensitive lookup
        const uname = normalizeUsername(identifier);
        if (!uname) return alert("Enter a valid username.");

        const { data, error, status } = await supabase
          .from("profiles")
          .select("email")
          .ilike("username", uname)   // case-insensitive
          .maybeSingle();

        if (error) {
          console.error("Username lookup error:", error, "status:", status);
          return alert("Could not look up username. If this persists, sign in with email.");
        }
        if (!data?.email) {
          return alert("No account found for that username. Try your email instead.");
        }
        emailToUse = data.email;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });
      if (error) throw error;
    } else {
      // SIGN UP (unchanged)
      if (!name.trim()) return alert("Please enter your name.");
      const norm = normalizeUsername(username);
      if (!norm) return alert("Please choose a username.");
      if (usernameAvailable === false) return alert("Username is taken.");
      if (!email.trim()) return alert("Enter your email.");
      if (!password.trim()) return alert("Create a password.");

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { name },
        },
      });
      if (error) throw error;

      // If session exists immediately (no email confirm), fill profile now
      const { data: u } = await supabase.auth.getUser();
      if (u?.user?.id) {
        await supabase
          .from("profiles")
          .update({ display_name: name, username: norm, email })
          .eq("id", u.user.id);
      }

      alert("Account created. If email verification is enabled, check your inbox.");
    }

    // reset panel inputs
    setPanelOpen(false);
    setName(""); setUsername(""); setIdentifier(""); setEmail(""); setPassword("");
  } catch (e: any) {
    alert(e?.message ?? "Authentication failed.");
  }
}
