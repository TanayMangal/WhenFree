"use client";

import { useMemo, useState } from "react";

type Member = { id: string; name: string };
type Recurring = { user_id: string; day_of_week: number; start_time: string; end_time: string };
type Exception = { user_id: string; date: string; start_time: string | null; end_time: string | null; kind: "busy" | "free"; all_day: boolean };

function mondayOf(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function isoLocal(d: Date) { const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,"0"); const day=String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${day}`; }
function minutes(t: string | null) { if (!t) return 0; const [h,m]=t.slice(0,5).split(":").map(Number); return h*60+m; }
function overlaps(start: number, end: number, a: string | null, b: string | null, allDay = false) { return allDay || (start < minutes(b) && end > minutes(a)); }
function fmtTime(min: number) { const h=Math.floor(min/60); const m=min%60; const hour=((h+11)%12)+1; return `${hour}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`; }

export default function GroupAvailability({ members, recurring, exceptions }: { members: Member[]; recurring: Recurring[]; exceptions: Exception[] }) {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const days = useMemo(() => Array.from({length:7},(_,i)=>addDays(weekStart,i)), [weekStart]);
  const slots = useMemo(() => Array.from({length:30},(_,i)=>8*60+i*30), []); // 8 AM to 11 PM

  function isFree(memberId: string, date: Date, start: number) {
    const end = start + 30;
    const dateKey = isoLocal(date);
    const dayOfWeek = date.getDay();
    const relevantExceptions = exceptions.filter(x => x.user_id===memberId && x.date===dateKey && overlaps(start,end,x.start_time,x.end_time,x.all_day));
    if (relevantExceptions.some(x => x.kind === "free")) return true;
    if (relevantExceptions.some(x => x.kind === "busy")) return false;
    const recurringBusy = recurring.some(x => x.user_id===memberId && x.day_of_week===dayOfWeek && overlaps(start,end,x.start_time,x.end_time));
    return !recurringBusy;
  }

  return (
    <div className="stack">
      <div className="row" style={{justifyContent:"space-between"}}>
        <button className="btn secondary" type="button" onClick={()=>setWeekStart(addDays(weekStart,-7))}>← Previous</button>
        <strong>{weekStart.toLocaleDateString(undefined,{month:"short",day:"numeric"})} – {addDays(weekStart,6).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}</strong>
        <button className="btn secondary" type="button" onClick={()=>setWeekStart(addDays(weekStart,7))}>Next →</button>
      </div>
      <div className="calendar-wrap">
        <table className="calendar">
          <thead><tr><th>Time</th>{days.map(d=><th key={isoLocal(d)}>{d.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})}</th>)}</tr></thead>
          <tbody>
            {slots.map(slot => <tr key={slot}>
              <td className="time">{fmtTime(slot)}</td>
              {days.map(date => {
                const free = members.filter(m => isFree(m.id,date,slot));
                const busy = members.filter(m => !isFree(m.id,date,slot));
                const ratio = members.length ? free.length / members.length : 0;
                return <td key={`${isoLocal(date)}-${slot}`} className="slot" style={{ backgroundColor: `rgba(79, 70, 229, ${0.06 + ratio * 0.72})`, color: ratio > 0.55 ? "white" : "inherit" }} title={`${free.length}/${members.length} free`}>
                  {free.length}/{members.length}
                  <div className="tooltip">
                    <strong>{date.toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"})}, {fmtTime(slot)} — {free.length}/{members.length} free</strong>
                    <div>Free: {free.length ? free.map(x=>x.name).join(", ") : "Nobody"}</div>
                    <div style={{marginTop:6,opacity:.8}}>Busy: {busy.length ? busy.map(x=>x.name).join(", ") : "Nobody"}</div>
                  </div>
                </td>;
              })}
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
