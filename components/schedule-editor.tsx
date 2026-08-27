"use client";

import { createClient } from "@/lib/supabase/client";
import WeeklyScheduleGrid from "@/components/weekly-schedule-grid";
import { useMemo, useState } from "react";

type Recurring = { id: string; day_of_week: number; start_time: string; end_time: string };
type Exception = { id: string; date: string; start_time: string | null; end_time: string | null; kind: "busy" | "free"; all_day: boolean };

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ScheduleEditor({ initialRecurring, initialExceptions }: { initialRecurring: Recurring[]; initialExceptions: Exception[] }) {
  const [recurring, setRecurring] = useState(initialRecurring);
  const [exceptions, setExceptions] = useState(initialExceptions);
  const [day, setDay] = useState(1);
  const [start, setStart] = useState("15:00");
  const [end, setEnd] = useState("16:00");
  const [exDate, setExDate] = useState(new Date().toISOString().slice(0, 10));
  const [exStart, setExStart] = useState("15:00");
  const [exEnd, setExEnd] = useState("16:00");
  const [exKind, setExKind] = useState<"busy" | "free">("busy");
  const [allDay, setAllDay] = useState(false);
  const [message, setMessage] = useState("");

  const sortedRecurring = useMemo(() => [...recurring].sort((a,b) => a.day_of_week-b.day_of_week || a.start_time.localeCompare(b.start_time)), [recurring]);

  async function addRecurring() {
    setMessage("");
    if (start >= end) return setMessage("End time must be after start time.");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("recurring_busy_blocks").insert({ user_id: user.id, day_of_week: day, start_time: start, end_time: end }).select().single();
    if (error) return setMessage(error.message);
    setRecurring(v => [...v, data]);
  }

  async function addException() {
    setMessage("");
    if (!allDay && exStart >= exEnd) return setMessage("End time must be after start time.");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = { user_id: user.id, date: exDate, start_time: allDay ? null : exStart, end_time: allDay ? null : exEnd, kind: exKind, all_day: allDay };
    const { data, error } = await supabase.from("schedule_exceptions").insert(payload).select().single();
    if (error) return setMessage(error.message);
    setExceptions(v => [...v, data]);
  }

  async function remove(table: "recurring_busy_blocks" | "schedule_exceptions", id: string) {
    const supabase = createClient();
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return setMessage(error.message);
    if (table === "recurring_busy_blocks") setRecurring(v => v.filter(x => x.id !== id));
    else setExceptions(v => v.filter(x => x.id !== id));
  }

  async function uploadCsv(file: File | undefined) {
    if (!file) return;
    setMessage("");
    const text = await file.text();
    const lines = text.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    const rows = lines.slice(lines[0]?.toLowerCase().startsWith("day,") ? 1 : 0);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = rows.map(line => {
      const [dayRaw, startRaw, endRaw] = line.split(",");
      const dayIndex = /^\d+$/.test(dayRaw) ? Number(dayRaw) : days.findIndex(d => d.toLowerCase().startsWith(dayRaw.trim().toLowerCase()));
      return { user_id: user.id, day_of_week: dayIndex, start_time: startRaw.trim(), end_time: endRaw.trim() };
    }).filter(r => r.day_of_week >= 0 && r.day_of_week <= 6 && r.start_time && r.end_time && r.start_time < r.end_time);

    if (!payload.length) return setMessage("No valid rows found. Use: day,start,end");
    const { data, error } = await supabase.from("recurring_busy_blocks").insert(payload).select();
    if (error) return setMessage(error.message);
    setRecurring(v => [...v, ...(data ?? [])]);
    setMessage(`Imported ${data?.length ?? 0} recurring busy blocks.`);
  }

  return (
  <div className="stack">
    {message && (
      <div className={message.includes("Imported") ? "notice" : "error"}>
        {message}
      </div>
    )}

    <WeeklyScheduleGrid
      recurring={recurring}
      onAdded={(block) => {
        setRecurring((current) => [...current, block]);
        setMessage("Busy time added.");
      }}
      onRemoved={(id) => {
        setRecurring((current) =>
          current.filter((block) => block.id !== id)
        );
      }}
      onMessage={setMessage}
    />

    <div className="grid grid-2">
        <section className="card stack">
          <div><h2 className="h2">Normal weekly schedule</h2><div className="muted small">Add times that are normally busy every week.</div></div>
          <div className="field"><label>Day</label><select className="select" value={day} onChange={e => setDay(Number(e.target.value))}>{days.map((d,i)=><option key={d} value={i}>{d}</option>)}</select></div>
          <div className="grid grid-2">
            <div className="field"><label>Start</label><input className="input" type="time" value={start} onChange={e=>setStart(e.target.value)} /></div>
            <div className="field"><label>End</label><input className="input" type="time" value={end} onChange={e=>setEnd(e.target.value)} /></div>
          </div>
          <button className="btn" type="button" onClick={addRecurring}>Add weekly busy time</button>
          <hr className="divider" />
          <div className="field"><label>Or import a CSV</label><input className="input" type="file" accept=".csv,text/csv" onChange={e=>uploadCsv(e.target.files?.[0])} /><span className="muted small">Format: day,start,end — e.g. Monday,08:00,09:30</span></div>
        </section>

        <section className="card stack">
          <div><h2 className="h2">One-time exception</h2><div className="muted small">Override your normal schedule for one particular date.</div></div>
          <div className="field"><label>Date</label><input className="input" type="date" value={exDate} onChange={e=>setExDate(e.target.value)} /></div>
          <div className="field"><label>Override</label><select className="select" value={exKind} onChange={e=>setExKind(e.target.value as "busy"|"free")}><option value="busy">Busy this time</option><option value="free">Free this time</option></select></div>
          <label className="row"><input type="checkbox" checked={allDay} onChange={e=>setAllDay(e.target.checked)} /> All day</label>
          {!allDay && <div className="grid grid-2">
            <div className="field"><label>Start</label><input className="input" type="time" value={exStart} onChange={e=>setExStart(e.target.value)} /></div>
            <div className="field"><label>End</label><input className="input" type="time" value={exEnd} onChange={e=>setExEnd(e.target.value)} /></div>
          </div>}
          <button className="btn" type="button" onClick={addException}>Add exception</button>
        </section>
      </div>

      <div className="grid grid-2">
        <section className="card"><h2 className="h2">Weekly busy blocks</h2><div className="list">{sortedRecurring.length ? sortedRecurring.map(x => <div className="list-item" key={x.id}><div><strong>{days[x.day_of_week]}</strong><div className="muted small">{x.start_time.slice(0,5)}–{x.end_time.slice(0,5)}</div></div><button className="btn danger" type="button" onClick={()=>remove("recurring_busy_blocks", x.id)}>Delete</button></div>) : <div className="muted">Nothing added yet.</div>}</div></section>
        <section className="card"><h2 className="h2">Exceptions</h2><div className="list">{exceptions.length ? exceptions.sort((a,b)=>a.date.localeCompare(b.date)).map(x => <div className="list-item" key={x.id}><div><strong>{x.date} — {x.kind.toUpperCase()}</strong><div className="muted small">{x.all_day ? "All day" : `${x.start_time?.slice(0,5)}–${x.end_time?.slice(0,5)}`}</div></div><button className="btn danger" type="button" onClick={()=>remove("schedule_exceptions", x.id)}>Delete</button></div>) : <div className="muted">No one-time exceptions.</div>}</div></section>
      </div>
    </div>
  );
}
