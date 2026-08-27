"use client";

import { useMemo, useState } from "react";

type Member = {
  id: string;
  name: string;
};

type SchedulePeriod = {
  start_date: string;
  end_date: string;
};

type Recurring = {
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  schedule_period_id: string | null;
  schedule_periods:
    | SchedulePeriod
    | SchedulePeriod[]
    | null;
};

type Exception = {
  user_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  kind: "busy" | "free";
  all_day: boolean;
};

function mondayOf(date: Date) {
  const d = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diff);

  return d;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function isoLocal(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function minutes(time: string | null) {
  if (!time) return 0;

  const [hour, minute] = time
    .slice(0, 5)
    .split(":")
    .map(Number);

  return hour * 60 + minute;
}

function overlaps(
  start: number,
  end: number,
  blockStart: string | null,
  blockEnd: string | null,
  allDay = false
) {
  if (allDay) return true;

  return (
    start < minutes(blockEnd) &&
    end > minutes(blockStart)
  );
}

function fmtTime(value: number) {
  const hour24 = Math.floor(value / 60);
  const minute = value % 60;

  const hour12 =
    ((hour24 + 11) % 12) + 1;

  return `${hour12}:${String(
    minute
  ).padStart(2, "0")} ${
    hour24 >= 12 ? "PM" : "AM"
  }`;
}

function getSchedulePeriod(
  block: Recurring
): SchedulePeriod | null {
  if (!block.schedule_periods) {
    return null;
  }

  if (
    Array.isArray(
      block.schedule_periods
    )
  ) {
    return (
      block.schedule_periods[0] ??
      null
    );
  }

  return block.schedule_periods;
}

function recurringApplies(
  block: Recurring,
  date: Date
) {
  if (!block.schedule_period_id) {
    return false;
  }

  const period =
    getSchedulePeriod(block);

  if (!period) {
    return false;
  }

  const dateKey = isoLocal(date);

  return (
    dateKey >= period.start_date &&
    dateKey <= period.end_date
  );
}

export default function GroupAvailability({
  members,
  recurring,
  exceptions,
}: {
  members: Member[];
  recurring: Recurring[];
  exceptions: Exception[];
}) {
  const [weekStart, setWeekStart] =
    useState(() =>
      mondayOf(new Date())
    );

  const days = useMemo(
    () =>
      Array.from(
        { length: 7 },
        (_, index) =>
          addDays(
            weekStart,
            index
          )
      ),
    [weekStart]
  );

  const slots = useMemo(
    () =>
      Array.from(
        { length: 30 },
        (_, index) =>
          8 * 60 +
          index * 30
      ),
    []
  );

  function isFree(
    memberId: string,
    date: Date,
    start: number
  ) {
    const end = start + 30;
    const dateKey =
      isoLocal(date);

    const dayOfWeek =
      date.getDay();

    const relevantExceptions =
      exceptions.filter(
        (exception) =>
          exception.user_id ===
            memberId &&
          exception.date ===
            dateKey &&
          overlaps(
            start,
            end,
            exception.start_time,
            exception.end_time,
            exception.all_day
          )
      );

    if (
      relevantExceptions.some(
        (exception) =>
          exception.kind === "free"
      )
    ) {
      return true;
    }

    if (
      relevantExceptions.some(
        (exception) =>
          exception.kind === "busy"
      )
    ) {
      return false;
    }

    const recurringBusy =
      recurring.some(
        (block) =>
          block.user_id ===
            memberId &&
          block.day_of_week ===
            dayOfWeek &&
          recurringApplies(
            block,
            date
          ) &&
          overlaps(
            start,
            end,
            block.start_time,
            block.end_time
          )
      );

    return !recurringBusy;
  }

  return (
    <div className="stack">
      <div
        className="row"
        style={{
          justifyContent:
            "space-between",
        }}
      >
        <button
          className="btn secondary"
          type="button"
          onClick={() =>
            setWeekStart(
              addDays(
                weekStart,
                -7
              )
            )
          }
        >
          ← Previous
        </button>

        <strong>
          {weekStart.toLocaleDateString(
            undefined,
            {
              month: "short",
              day: "numeric",
            }
          )}
          {" – "}
          {addDays(
            weekStart,
            6
          ).toLocaleDateString(
            undefined,
            {
              month: "short",
              day: "numeric",
              year: "numeric",
            }
          )}
        </strong>

        <button
          className="btn secondary"
          type="button"
          onClick={() =>
            setWeekStart(
              addDays(
                weekStart,
                7
              )
            )
          }
        >
          Next →
        </button>
      </div>

      <div className="calendar-wrap">
        <table className="calendar">
          <thead>
            <tr>
              <th>Time</th>

              {days.map((date) => (
                <th
                  key={isoLocal(
                    date
                  )}
                >
                  {date.toLocaleDateString(
                    undefined,
                    {
                      weekday:
                        "short",
                      month:
                        "short",
                      day: "numeric",
                    }
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {slots.map((slot) => (
              <tr key={slot}>
                <td className="time">
                  {fmtTime(slot)}
                </td>

                {days.map(
                  (date) => {
                    const free =
                      members.filter(
                        (member) =>
                          isFree(
                            member.id,
                            date,
                            slot
                          )
                      );

                    const busy =
                      members.filter(
                        (member) =>
                          !isFree(
                            member.id,
                            date,
                            slot
                          )
                      );

                    const ratio =
                      members.length
                        ? free.length /
                          members.length
                        : 0;

                    return (
                      <td
                        key={`${isoLocal(
                          date
                        )}-${slot}`}
                        className="slot"
                        style={{
                          backgroundColor: `rgba(79, 70, 229, ${
                            0.06 +
                            ratio *
                              0.72
                          })`,
                          color:
                            ratio >
                            0.55
                              ? "white"
                              : "inherit",
                        }}
                        title={`${free.length}/${members.length} free`}
                      >
                        {free.length}/
                        {
                          members.length
                        }

                        <div className="tooltip">
                          <strong>
                            {date.toLocaleDateString(
                              undefined,
                              {
                                weekday:
                                  "long",
                                month:
                                  "short",
                                day: "numeric",
                              }
                            )}
                            ,{" "}
                            {fmtTime(
                              slot
                            )}
                            {" — "}
                            {
                              free.length
                            }
                            /
                            {
                              members.length
                            }{" "}
                            free
                          </strong>

                          <div>
                            Free:{" "}
                            {free.length
                              ? free
                                  .map(
                                    (
                                      member
                                    ) =>
                                      member.name
                                  )
                                  .join(
                                    ", "
                                  )
                              : "Nobody"}
                          </div>

                          <div
                            style={{
                              marginTop: 6,
                              opacity: 0.8,
                            }}
                          >
                            Busy:{" "}
                            {busy.length
                              ? busy
                                  .map(
                                    (
                                      member
                                    ) =>
                                      member.name
                                  )
                                  .join(
                                    ", "
                                  )
                              : "Nobody"}
                          </div>
                        </div>
                      </td>
                    );
                  }
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}