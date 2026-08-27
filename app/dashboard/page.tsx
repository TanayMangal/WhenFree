import DashboardClient from "@/components/dashboard-client";
import SignOutButton from "@/components/sign-out-button";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, groups(id,name,invite_code)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true });

  return (
    <main className="shell stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="h1">Your groups</h1>
          <div className="muted">Signed in as {user.email}</div>
        </div>

        <div className="row">
          <Link className="btn secondary" href="/schedule">
            My Schedule
          </Link>
          <SignOutButton />
        </div>
      </div>

      <div className="grid grid-3">
        {(memberships ?? []).map((m: any) => {
          const group = Array.isArray(m.groups) ? m.groups[0] : m.groups;
          if (!group) return null;
          return (
            <Link className="card stack" href={`/groups/${group.id}`} key={group.id}>
              <strong>{group.name}</strong>
              <span className="muted small">Invite code: {group.invite_code}</span>
            </Link>
          );
        })}
      </div>

      <DashboardClient />
    </main>
  );
}
