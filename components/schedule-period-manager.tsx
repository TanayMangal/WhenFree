"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export type SchedulePeriod = {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  end_date: string;
};

const TERMS = [
  {
    name: "A Term",
    start_date: "2026-08-20",
    end_date: "2026-10-09",
    displayDates: "Aug 20, 2026 → Oct 9, 2026",
  },
  {
    name: "B Term",
    start_date: "2026-10-19",
    end_date: "2026-12-11",
    displayDates: "Oct 19, 2026 → Dec 11, 2026",
  },
  {
    name: "C Term",
    start_date: "2027-01-13",
    end_date: "2027-03-05",
    displayDates: "Jan 13, 2027 → Mar 5, 2027",
  },
  {
    name: "D Term",
    start_date: "2027-03-15",
    end_date: "2027-05-05",
    displayDates: "Mar 15, 2027 → May 5, 2027",
  },
];

export default function SchedulePeriodManager({
  selectedPeriodId,
  onSelect,
}: {
  selectedPeriodId: string | null;
  onSelect: (period: SchedulePeriod | null) => void;
}) {
  const [periods, setPeriods] =
    useState<SchedulePeriod[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    async function setupTerms() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: existing, error } =
        await supabase
          .from("schedule_periods")
          .select("*")
          .eq("user_id", user.id);

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      let allPeriods =
        existing ?? [];

      const missingTerms =
        TERMS.filter(
          (term) =>
            !allPeriods.some(
              (period) =>
                period.name ===
                term.name
            )
        );

      if (missingTerms.length > 0) {
        const payload =
          missingTerms.map(
            (term) => ({
              user_id: user.id,
              name: term.name,
              start_date:
                term.start_date,
              end_date:
                term.end_date,
            })
          );

        const {
          data: created,
          error: insertError,
        } = await supabase
          .from("schedule_periods")
          .insert(payload)
          .select();

        if (insertError) {
          setMessage(
            insertError.message
          );
          setLoading(false);
          return;
        }

        allPeriods = [
          ...allPeriods,
          ...(created ?? []),
        ];
      }

      setPeriods(allPeriods);

      setLoading(false);
    }

    void setupTerms();
  }, []);

  if (loading) {
    return (
      <section className="card">
        <div className="muted">
          Loading term schedules...
        </div>
      </section>
    );
  }

  return (
    <section className="card stack">
      <div>
        <h2 className="h2">
          Term Schedules
        </h2>

        <div className="muted small">
          Choose the term whose weekly
          schedule you want to edit.
        </div>
      </div>

      <div className="stack">
        {TERMS.map((term) => {
          const period =
            periods.find(
              (item) =>
                item.name === term.name
            );

          const selected =
            period?.id ===
            selectedPeriodId;

          return (
            <div
              key={term.name}
              className="row"
              style={{
                justifyContent:
                  "space-between",
                border:
                  "1px solid var(--border)",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div>
                <strong>
                  {term.name}
                </strong>

                <div className="muted small">
                  {term.displayDates}
                </div>
              </div>

              {period && (
                <button
                  className={
                    selected
                      ? "btn"
                      : "btn secondary"
                  }
                  type="button"
                  onClick={() =>
                    onSelect(period)
                  }
                >
                  {selected
                    ? "Editing"
                    : "Edit Schedule"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {message && (
        <div className="error">
          {message}
        </div>
      )}
    </section>
  );
}