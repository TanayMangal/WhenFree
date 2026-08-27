"use client";

import SchedulePeriodManager, {
  SchedulePeriod,
} from "@/components/schedule-period-manager";
import WeeklyScheduleGrid from "@/components/weekly-schedule-grid";
import { createClient } from "@/lib/supabase/client";
import { useMemo, useState } from "react";

type Recurring = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  schedule_period_id: string | null;
};

type Exception = {
  id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  kind: "busy" | "free";
  all_day: boolean;
};

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function ScheduleEditor({
  initialRecurring,
  initialExceptions,
}: {
  initialRecurring: Recurring[];
  initialExceptions: Exception[];
}) {
  const [recurring, setRecurring] =
    useState<Recurring[]>(initialRecurring);

  const [exceptions, setExceptions] =
    useState<Exception[]>(initialExceptions);

  const [selectedPeriod, setSelectedPeriod] =
    useState<SchedulePeriod | null>(null);

  const [day, setDay] = useState(1);
  const [start, setStart] = useState("15:00");
  const [end, setEnd] = useState("16:00");

  const [exDate, setExDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [exStart, setExStart] =
    useState("15:00");

  const [exEnd, setExEnd] =
    useState("16:00");

  const [exKind, setExKind] =
    useState<"busy" | "free">("busy");

  const [allDay, setAllDay] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const selectedRecurring = useMemo(() => {
    if (!selectedPeriod) return [];

    return recurring
      .filter(
        (block) =>
          block.schedule_period_id ===
          selectedPeriod.id
      )
      .sort(
        (a, b) =>
          a.day_of_week - b.day_of_week ||
          a.start_time.localeCompare(
            b.start_time
          )
      );
  }, [recurring, selectedPeriod]);

  async function addRecurring() {
    setMessage("");

    if (!selectedPeriod) {
      setMessage(
        "Select A, B, C, or D Term first."
      );
      return;
    }

    if (start >= end) {
      setMessage(
        "End time must be after start time."
      );
      return;
    }

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("recurring_busy_blocks")
      .insert({
        user_id: user.id,
        day_of_week: day,
        start_time: start,
        end_time: end,
        schedule_period_id:
          selectedPeriod.id,
      })
      .select()
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setRecurring((current) => [
      ...current,
      data,
    ]);

    setMessage(
      `Busy time added to ${selectedPeriod.name}.`
    );
  }

  async function addException() {
    setMessage("");

    if (!allDay && exStart >= exEnd) {
      setMessage(
        "End time must be after start time."
      );
      return;
    }

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const payload = {
      user_id: user.id,
      date: exDate,
      start_time: allDay
        ? null
        : exStart,
      end_time: allDay
        ? null
        : exEnd,
      kind: exKind,
      all_day: allDay,
    };

    const { data, error } = await supabase
      .from("schedule_exceptions")
      .insert(payload)
      .select()
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setExceptions((current) => [
      ...current,
      data,
    ]);

    setMessage("Exception added.");
  }

  async function remove(
    table:
      | "recurring_busy_blocks"
      | "schedule_exceptions",
    id: string
  ) {
    const supabase = createClient();

    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (
      table === "recurring_busy_blocks"
    ) {
      setRecurring((current) =>
        current.filter(
          (item) => item.id !== id
        )
      );
    } else {
      setExceptions((current) =>
        current.filter(
          (item) => item.id !== id
        )
      );
    }
  }

  async function uploadCsv(
    file: File | undefined
  ) {
    if (!file) return;

    setMessage("");

    if (!selectedPeriod) {
      setMessage(
        "Select a term before importing a schedule."
      );
      return;
    }

    const text = await file.text();

    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const rows = lines.slice(
      lines[0]
        ?.toLowerCase()
        .startsWith("day,")
        ? 1
        : 0
    );

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const payload = rows
      .map((line) => {
        const [
          dayRaw,
          startRaw,
          endRaw,
        ] = line.split(",");

        if (
          !dayRaw ||
          !startRaw ||
          !endRaw
        ) {
          return null;
        }

        const trimmedDay =
          dayRaw.trim();

        const dayIndex = /^\d+$/.test(
          trimmedDay
        )
          ? Number(trimmedDay)
          : days.findIndex((dayName) =>
              dayName
                .toLowerCase()
                .startsWith(
                  trimmedDay.toLowerCase()
                )
            );

        return {
          user_id: user.id,
          day_of_week: dayIndex,
          start_time:
            startRaw.trim(),
          end_time: endRaw.trim(),
          schedule_period_id:
            selectedPeriod.id,
        };
      })
      .filter(
        (
          row
        ): row is {
          user_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          schedule_period_id: string;
        } =>
          row !== null &&
          row.day_of_week >= 0 &&
          row.day_of_week <= 6 &&
          Boolean(row.start_time) &&
          Boolean(row.end_time) &&
          row.start_time < row.end_time
      );

    if (!payload.length) {
      setMessage(
        "No valid rows found. Use: day,start,end"
      );
      return;
    }

    const { data, error } =
      await supabase
        .from(
          "recurring_busy_blocks"
        )
        .insert(payload)
        .select();

    if (error) {
      setMessage(error.message);
      return;
    }

    setRecurring((current) => [
      ...current,
      ...(data ?? []),
    ]);

    setMessage(
      `Imported ${
        data?.length ?? 0
      } busy blocks into ${
        selectedPeriod.name
      }.`
    );
  }

  return (
    <div className="stack">
      {message && (
        <div className="notice">
          {message}
        </div>
      )}

      <SchedulePeriodManager
        selectedPeriodId={
          selectedPeriod?.id ?? null
        }
        onSelect={setSelectedPeriod}
      />

      {selectedPeriod ? (
        <>
          <div className="notice">
            Editing{" "}
            <strong>
              {selectedPeriod.name}
            </strong>
            {" — "}
            {selectedPeriod.start_date}
            {" → "}
            {selectedPeriod.end_date}
          </div>

          <WeeklyScheduleGrid
            recurring={
              selectedRecurring
            }
            schedulePeriodId={
              selectedPeriod.id
            }
            onAdded={(block) => {
              setRecurring((current) => [
                ...current,
                {
                  ...block,
                  schedule_period_id: selectedPeriod.id,
                },
              ]);

              setMessage(
                `Busy time added to ${selectedPeriod.name}.`
              );
            }}
            onRemoved={(id) => {
              setRecurring(
                (current) =>
                  current.filter(
                    (block) =>
                      block.id !== id
                  )
              );
            }}
            onMessage={setMessage}
          />

          <div className="grid grid-2">
            <section className="card stack">
              <div>
                <h2 className="h2">
                  Add exact busy time
                </h2>

                <div className="muted small">
                  Add a recurring busy
                  period to{" "}
                  {selectedPeriod.name}.
                </div>
              </div>

              <div className="field">
                <label>Day</label>

                <select
                  className="select"
                  value={day}
                  onChange={(event) =>
                    setDay(
                      Number(
                        event.target
                          .value
                      )
                    )
                  }
                >
                  {days.map(
                    (
                      dayName,
                      index
                    ) => (
                      <option
                        key={dayName}
                        value={index}
                      >
                        {dayName}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="grid grid-2">
                <div className="field">
                  <label>Start</label>

                  <input
                    className="input"
                    type="time"
                    value={start}
                    onChange={(
                      event
                    ) =>
                      setStart(
                        event.target
                          .value
                      )
                    }
                  />
                </div>

                <div className="field">
                  <label>End</label>

                  <input
                    className="input"
                    type="time"
                    value={end}
                    onChange={(
                      event
                    ) =>
                      setEnd(
                        event.target
                          .value
                      )
                    }
                  />
                </div>
              </div>

              <button
                className="btn"
                type="button"
                onClick={
                  addRecurring
                }
              >
                Add busy time
              </button>

              <hr className="divider" />

              <div className="field">
                <label>
                  Or import a CSV
                </label>

                <input
                  className="input"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(
                    event
                  ) =>
                    void uploadCsv(
                      event.target
                        .files?.[0]
                    )
                  }
                />

                <span className="muted small">
                  Format:
                  day,start,end — e.g.
                  Monday,08:00,09:30
                </span>
              </div>
            </section>

            <section className="card stack">
              <div>
                <h2 className="h2">
                  One-time exception
                </h2>

                <div className="muted small">
                  Override your normal
                  term schedule for one
                  particular date.
                </div>
              </div>

              <div className="field">
                <label>Date</label>

                <input
                  className="input"
                  type="date"
                  value={exDate}
                  onChange={(
                    event
                  ) =>
                    setExDate(
                      event.target
                        .value
                    )
                  }
                />
              </div>

              <div className="field">
                <label>
                  Override
                </label>

                <select
                  className="select"
                  value={exKind}
                  onChange={(
                    event
                  ) =>
                    setExKind(
                      event.target
                        .value as
                        | "busy"
                        | "free"
                    )
                  }
                >
                  <option value="busy">
                    Busy this time
                  </option>

                  <option value="free">
                    Free this time
                  </option>
                </select>
              </div>

              <label className="row">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(
                    event
                  ) =>
                    setAllDay(
                      event.target
                        .checked
                    )
                  }
                />

                All day
              </label>

              {!allDay && (
                <div className="grid grid-2">
                  <div className="field">
                    <label>
                      Start
                    </label>

                    <input
                      className="input"
                      type="time"
                      value={exStart}
                      onChange={(
                        event
                      ) =>
                        setExStart(
                          event.target
                            .value
                        )
                      }
                    />
                  </div>

                  <div className="field">
                    <label>
                      End
                    </label>

                    <input
                      className="input"
                      type="time"
                      value={exEnd}
                      onChange={(
                        event
                      ) =>
                        setExEnd(
                          event.target
                            .value
                        )
                      }
                    />
                  </div>
                </div>
              )}

              <button
                className="btn"
                type="button"
                onClick={addException}
              >
                Add exception
              </button>
            </section>
          </div>

          <div className="grid grid-2">
            <section className="card">
              <h2 className="h2">
                {selectedPeriod.name} busy
                blocks
              </h2>

              <div className="list">
                {selectedRecurring.length ? (
                  selectedRecurring.map(
                    (block) => (
                      <div
                        className="list-item"
                        key={block.id}
                      >
                        <div>
                          <strong>
                            {
                              days[
                                block
                                  .day_of_week
                              ]
                            }
                          </strong>

                          <div className="muted small">
                            {block.start_time.slice(
                              0,
                              5
                            )}
                            –
                            {block.end_time.slice(
                              0,
                              5
                            )}
                          </div>
                        </div>

                        <button
                          className="btn danger"
                          type="button"
                          onClick={() =>
                            void remove(
                              "recurring_busy_blocks",
                              block.id
                            )
                          }
                        >
                          Delete
                        </button>
                      </div>
                    )
                  )
                ) : (
                  <div className="muted">
                    Nothing added to{" "}
                    {
                      selectedPeriod.name
                    }{" "}
                    yet.
                  </div>
                )}
              </div>
            </section>

            <section className="card">
              <h2 className="h2">
                Exceptions
              </h2>

              <div className="list">
                {exceptions.length ? (
                  [...exceptions]
                    .sort((a, b) =>
                      a.date.localeCompare(
                        b.date
                      )
                    )
                    .map((exception) => (
                      <div
                        className="list-item"
                        key={
                          exception.id
                        }
                      >
                        <div>
                          <strong>
                            {
                              exception.date
                            }{" "}
                            —{" "}
                            {exception.kind.toUpperCase()}
                          </strong>

                          <div className="muted small">
                            {exception.all_day
                              ? "All day"
                              : `${exception.start_time?.slice(
                                  0,
                                  5
                                )}–${exception.end_time?.slice(
                                  0,
                                  5
                                )}`}
                          </div>
                        </div>

                        <button
                          className="btn danger"
                          type="button"
                          onClick={() =>
                            void remove(
                              "schedule_exceptions",
                              exception.id
                            )
                          }
                        >
                          Delete
                        </button>
                      </div>
                    ))
                ) : (
                  <div className="muted">
                    No one-time
                    exceptions.
                  </div>
                )}
              </div>
            </section>
          </div>
        </>
      ) : (
        <div className="card">
          <strong>
            Select a term above.
          </strong>

          <div className="muted small">
            Create or select A, B, C, or
            D Term to edit its weekly
            schedule.
          </div>
        </div>
      )}
    </div>
  );
}