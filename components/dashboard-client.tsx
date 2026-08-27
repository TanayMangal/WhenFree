"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function DashboardClient() {
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function createGroup() {
    if (!groupName.trim()) return;
    setBusy(true); setMessage("");
    const supabase = createClient();
    const { data, error } = await supabase.rpc("create_group", { group_name: groupName.trim() });
    setBusy(false);
    if (error) return setMessage(error.message);
    const id = Array.isArray(data) ? data[0]?.id : data?.id;
    if (id) window.location.href = `/groups/${id}`;
  }

  async function joinGroup() {
    if (!inviteCode.trim()) return;
    setBusy(true); setMessage("");
    const supabase = createClient();
    const { data, error } = await supabase.rpc("join_group_by_code", { code: inviteCode.trim().toUpperCase() });
    setBusy(false);
    if (error) return setMessage(error.message);
    if (data) window.location.href = `/groups/${data}`;
  }

  return (
    <div className="grid grid-2">
      <section className="card stack">
        <div><h2 className="h2">Create a group</h2><div className="muted small">You will get an invite code to send to friends.</div></div>
        <div className="field"><label htmlFor="groupName">Group name</label><input id="groupName" className="input" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Robotics friends" /></div>
        <button className="btn" type="button" onClick={createGroup} disabled={busy}>Create group</button>
      </section>

      <section className="card stack">
        <div><h2 className="h2">Join a group</h2><div className="muted small">Paste the invite code your friend sent you.</div></div>
        <div className="field"><label htmlFor="inviteCode">Invite code</label><input id="inviteCode" className="input" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} placeholder="ABC12345" /></div>
        <button className="btn" type="button" onClick={joinGroup} disabled={busy}>Join group</button>
      </section>
      {message && <div className="error">{message}</div>}
    </div>
  );
}
