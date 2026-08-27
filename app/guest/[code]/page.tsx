import GroupAvailability from "@/components/group-availability";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function GuestGroupPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_group_guest_view",
    {
      code: decodeURIComponent(code),
    }
  );

  if (error || !data) {
    notFound();
  }

  const group = data.group;
  const members = data.members ?? [];
  const recurring = data.recurring ?? [];
  const exceptions = data.exceptions ?? [];

  return (
    <main className="shell stack">
      <Link className="btn secondary" href="/">
        Back to Home
      </Link>
      <div>
        <span className="badge">
          Guest View
        </span>

        <h1
          className="h1"
          style={{ marginTop: 10 }}
        >
          {group.name}
        </h1>

        <div className="muted">
          Read-only availability view. Sign in if you
          want to join the group or edit your schedule.
        </div>
      </div>

      <GroupAvailability
        members={members}
        recurring={recurring}
        exceptions={exceptions}
      />
    </main>
  );
}