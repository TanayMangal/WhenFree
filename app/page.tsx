import GoogleSignIn from "@/components/google-sign-in";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="shell">
      <section className="hero">
        <span className="badge">Shared availability without oversharing</span>
        <h1>Find the time when everyone is actually free.</h1>
        <p>
          Add your normal weekly schedule, layer in one-time busy or free exceptions,
          and hover over a group calendar to see exactly who can make a time.
        </p>
        {user ? (
          <Link className="btn" href="/dashboard">Open dashboard</Link>
        ) : (
          <GoogleSignIn />
        )}
      </section>
    </main>
  );
}
