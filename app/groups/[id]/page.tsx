import GroupAvailability from "@/components/group-availability";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: membership } = await supabase.from("group_members").select("group_id").eq("group_id", id).eq("user_id", user.id).maybeSingle();
  if (!membership) notFound();

  const [{ data: group }, { data: memberRows }] = await Promise.all([
    supabase.from("groups").select("id,name,invite_code").eq("id", id).single(),
    supabase.from("group_members").select("user_id, profiles(display_name,email)").eq("group_id", id),
  ]);
  if (!group) notFound();

  const members = (memberRows ?? []).map((m: any) => {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return { id: m.user_id, name: p?.display_name || p?.email || "Friend" };
  });
  const ids = members.map(m => m.id);

  const [{ data: recurring }, { data: exceptions }] = ids.length ? await Promise.all([
    supabase.from("recurring_busy_blocks").select(`user_id, day_of_week, start_time, end_time, schedule_period_id, schedule_periods (
      start_date,
      end_date
    )
  `)
  .in("user_id", ids),
    supabase.from("schedule_exceptions").select("user_id,date,start_time,end_time,kind,all_day").in("user_id", ids),
  ]) : [{data:[]},{data:[]}];

  return (
    <main className="shell stack">
      <div>
        <span className="badge">Invite code: {group.invite_code}</span>
        <h1 className="h1" style={{marginTop:10}}>{group.name}</h1>
        <div className="muted">Hover over any slot to see exactly who is free. The app stores availability only, not the reason someone is busy.</div>
      </div>
      <GroupAvailability members={members} recurring={(recurring ?? []) as any} exceptions={(exceptions ?? []) as any} />
    </main>
  );
}
