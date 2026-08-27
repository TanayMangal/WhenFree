"use client";

import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }
  return <button className="btn secondary" type="button" onClick={signOut}>Sign out</button>;
}
