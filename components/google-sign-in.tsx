"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function GoogleSignIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="stack">
      <button className="btn" type="button" onClick={signIn} disabled={loading}>
        {loading ? "Opening Google…" : "Continue with Google"}
      </button>
      {error && <div className="error small">{error}</div>}
    </div>
  );
}
