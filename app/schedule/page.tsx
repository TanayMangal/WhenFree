import ScheduleEditor from "@/components/schedule-editor";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SchedulePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: recurring }, { data: exceptions }] = await Promise.all([
    supabase.from("recurring_busy_blocks").select("*").eq("user_id", user.id),
    supabase.from("schedule_exceptions").select("*").eq("user_id", user.id).order("date"),
  ]);

  return (
    <main className="shell stack">
      <div><h1 className="h1">My schedule</h1><div className="muted">Friends only see whether you are free or busy; this MVP does not store event descriptions.</div></div>
      <ScheduleEditor initialRecurring={(recurring ?? []) as any} initialExceptions={(exceptions ?? []) as any} />
    </main>
  );
}
