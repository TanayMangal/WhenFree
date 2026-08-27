"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useRef, useState } from "react";

type Recurring = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type DragState = {
  day: number;
  anchor: number;
  current: number;
  mode: "add" | "remove";
};

const displayDays = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

const slots = Array.from(
  { length: 30 },
  (_, i) => 8 * 60 + i * 30
);

function toMinutes(time: string) {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function toTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  const hour = ((h + 11) % 12) + 1;

  return `${hour}:${String(m).padStart(2, "0")} ${
    h >= 12 ? "PM" : "AM"
  }`;
}

export default function WeeklyScheduleGrid({
  recurring,
  schedulePeriodId,
  onAdded,
  onRemoved,
  onMessage,
}: {
  recurring: Recurring[];
  schedulePeriodId: string;
  onAdded: (block: Recurring) => void;
  onRemoved: (id: string) => void;
  onMessage: (message: string) => void;
}) {
  const [drag, setDrag] = useState<DragState | null>(null);

  const dragRef = useRef<DragState | null>(null);
  const savingRef = useRef(false);
  const recurringRef = useRef(recurring);

  recurringRef.current = recurring;

  const busySlots = useMemo(() => {
    const result = new Set<string>();

    for (const day of displayDays) {
      for (const slot of slots) {
        const busy = recurring.some(
          (block) =>
            block.day_of_week === day.value &&
            slot < toMinutes(block.end_time) &&
            slot + 30 > toMinutes(block.start_time)
        );

        if (busy) {
          result.add(`${day.value}-${slot}`);
        }
      }
    }

    return result;
  }, [recurring]);

  function startDrag(
    day: number,
    slot: number,
    mode: "add" | "remove"
  ) {
    if (savingRef.current) return;

    const next: DragState = {
      day,
      anchor: slot,
      current: slot,
      mode,
    };

    dragRef.current = next;
    setDrag(next);
  }

  function continueDrag(day: number, slot: number) {
    if (!dragRef.current) return;
    if (dragRef.current.day !== day) return;

    const next = {
      ...dragRef.current,
      current: slot,
    };

    dragRef.current = next;
    setDrag(next);
  }

  async function addBusyRange(
    day: number,
    startMinute: number,
    endMinute: number
  ) {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      onMessage("You must be signed in.");
      return;
    }

    const { data, error } = await supabase
      .from("recurring_busy_blocks")
      .insert({
        user_id: user.id,
        day_of_week: day,
        start_time: toTime(startMinute),
        end_time: toTime(endMinute),
        schedule_period_id: schedulePeriodId,
      })
      .select()
      .single();

    if (error) {
      onMessage(error.message);
      return;
    }

    onAdded(data);
    onMessage("Busy time added.");
  }

  async function removeBusyRange(
    day: number,
    startMinute: number,
    endMinute: number
  ) {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      onMessage("You must be signed in.");
      return;
    }

    const affectedBlocks = recurringRef.current.filter((block) => {
      if (block.day_of_week !== day) return false;

      const blockStart = toMinutes(block.start_time);
      const blockEnd = toMinutes(block.end_time);

      return (
        blockStart < endMinute &&
        blockEnd > startMinute
      );
    });

    if (affectedBlocks.length === 0) {
      return;
    }

    const affectedIds = affectedBlocks.map(
      (block) => block.id
    );

    const replacementBlocks: {
      user_id: string;
      day_of_week: number;
      start_time: string;
      end_time: string;
      schedule_period_id?: string | null;
    }[] = [];

    for (const block of affectedBlocks) {
      const blockStart = toMinutes(block.start_time);
      const blockEnd = toMinutes(block.end_time);

      // Keep portion before erased area
      if (blockStart < startMinute) {
        replacementBlocks.push({
          user_id: user.id,
          day_of_week: day,
          start_time: toTime(blockStart),
          end_time: toTime(
            Math.min(startMinute, blockEnd)
          ),
        });
      }

      // Keep portion after erased area
      if (blockEnd > endMinute) {
        replacementBlocks.push({
          user_id: user.id,
          day_of_week: day,
          start_time: toTime(
            Math.max(endMinute, blockStart)
          ),
          end_time: toTime(blockEnd),
        });
      }
    }

    const { error: deleteError } = await supabase
      .from("recurring_busy_blocks")
      .delete()
      .in("id", affectedIds)
      .eq("user_id", user.id);

    if (deleteError) {
      onMessage(deleteError.message);
      return;
    }

    let insertedBlocks: Recurring[] = [];

    if (replacementBlocks.length > 0) {
      const { data, error: insertError } =
        await supabase
          .from("recurring_busy_blocks")
          .insert(replacementBlocks)
          .select();

      if (insertError) {
        onMessage(insertError.message);
        return;
      }

      insertedBlocks = data ?? [];
    }

    for (const id of affectedIds) {
      onRemoved(id);
    }

    for (const block of insertedBlocks) {
      onAdded(block);
    }

    onMessage("Busy time removed.");
  }

  async function finishDrag() {
    const selection = dragRef.current;

    dragRef.current = null;
    setDrag(null);

    if (!selection || savingRef.current) {
      return;
    }

    const startMinute = Math.min(
      selection.anchor,
      selection.current
    );

    const endMinute =
      Math.max(
        selection.anchor,
        selection.current
      ) + 30;

    savingRef.current = true;
    onMessage("");

    if (selection.mode === "add") {
      await addBusyRange(
        selection.day,
        startMinute,
        endMinute
      );
    } else {
      await removeBusyRange(
        selection.day,
        startMinute,
        endMinute
      );
    }

    savingRef.current = false;
  }

  useEffect(() => {
    function handleMouseUp() {
      void finishDrag();
    }

    window.addEventListener(
      "mouseup",
      handleMouseUp
    );

    return () => {
      window.removeEventListener(
        "mouseup",
        handleMouseUp
      );
    };
  }, []);

  function isPreview(
    day: number,
    slot: number
  ) {
    if (!drag) return false;
    if (drag.day !== day) return false;

    const start = Math.min(
      drag.anchor,
      drag.current
    );

    const end = Math.max(
      drag.anchor,
      drag.current
    );

    return slot >= start && slot <= end;
  }

  return (
    <section className="card stack">
      <div>
        <h2 className="h2">
          Paint your normal week
        </h2>

        <div className="muted small">
          Drag over free time to mark yourself busy.
          Drag over busy time to erase it. Each square
          represents 30 minutes.
        </div>
      </div>

      <div className="schedule-painter">
        <div className="schedule-painter-header-row">
          <div className="schedule-painter-head">
            Time
          </div>

          {displayDays.map((day) => (
            <div
              className="schedule-painter-head"
              key={day.value}
            >
              {day.label}
            </div>
          ))}
        </div>

        {slots.map((slot) => (
          <div
            className="schedule-painter-row"
            key={slot}
          >
            <div className="schedule-painter-time">
              {formatTime(slot)}
            </div>

            {displayDays.map((day) => {
              const key =
                `${day.value}-${slot}`;

              const busy =
                busySlots.has(key);

              const preview =
                isPreview(
                  day.value,
                  slot
                );

              const removePreview =
                preview &&
                drag?.mode === "remove";

              return (
                <button
                  key={key}
                  type="button"
                  aria-label={`${day.label} ${formatTime(
                    slot
                  )}`}
                  className={
                    "schedule-painter-slot" +
                    (busy ? " busy" : "") +
                    (
                      preview &&
                      !removePreview
                        ? " preview"
                        : ""
                    ) +
                    (
                      removePreview
                        ? " remove-preview"
                        : ""
                    )
                  }
                  onMouseDown={(event) => {
                    event.preventDefault();

                    startDrag(
                      day.value,
                      slot,
                      busy
                        ? "remove"
                        : "add"
                    );
                  }}
                  onMouseEnter={() =>
                    continueDrag(
                      day.value,
                      slot
                    )
                  }
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="muted small">
        Start on an empty square to paint busy time.
        Start on a filled square to erase busy time.
      </div>
    </section>
  );
}