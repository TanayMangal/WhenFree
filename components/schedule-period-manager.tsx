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
  const [periods, setPeriods] = useState<SchedulePeriod[]>([]);
  const [message, setMessage] = useState("");

  async function loadPeriods() {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("schedule_periods")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setPeriods(data ?? []);
  }

  useEffect(() => {
    void loadPeriods();
  }, []);

  async function createTerm(term: (typeof TERMS)[number]) {
    const alreadyExists = periods.some(
      (period) => period.name === term.name
    );

    if (alreadyExists) {
      const existing = periods.find(
        (period) => period.name === term.name
      );

      if (existing) {
        onSelect(existing);
        setMessage(`${term.name} already exists.`);
      }

      return;
    }

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("You must be signed in.");
      return;
    }

    const { data, error } = await supabase
      .from("schedule_periods")
      .insert({
        user_id: user.id,
        name: term.name,
        start_date: term.start_date,
        end_date: term.end_date,
      })
      .select()
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setPeriods((current) => [...current, data]);
    onSelect(data);

    setMessage(`${term.name} created.`);
  }

  async function deleteTerm(period: SchedulePeriod) {
    const confirmed = window.confirm(
      `Delete ${period.name} and its recurring schedule?`
    );

    if (!confirmed) return;

    const supabase = createClient();

    const { error } = await supabase
      .from("schedule_periods")
      .delete()
      .eq("id", period.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setPeriods((current) =>
      current.filter((item) => item.id !== period.id)
    );

    if (selectedPeriodId === period.id) {
      onSelect(null);
    }

    setMessage(`${period.name} deleted.`);
  }

  return (
    <section className="card stack">
      <div>
        <h2 className="h2">Term Schedules</h2>

        <div className="muted small">
          Create a different weekly schedule for each term.
          The dates are automatically set from the
          2026–2027 senior calendar.
        </div>
      </div>

      <div className="stack">
        {TERMS.map((term) => {
          const period = periods.find(
            (item) => item.name === term.name
          );

          const selected =
            period?.id === selectedPeriodId;

          return (
            <div
              key={term.name}
              className="row"
              style={{
                justifyContent: "space-between",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div>
                <strong>{term.name}</strong>

                <div className="muted small">
                  {term.displayDates}
                </div>
              </div>

              <div className="row">
                {period ? (
                  <>
                    <button
                      className={
                        selected
                          ? "btn"
                          : "btn secondary"
                      }
                      type="button"
                      onClick={() => onSelect(period)}
                    >
                      {selected
                        ? "Editing"
                        : "Edit Schedule"}
                    </button>

                    <button
                      className="btn secondary"
                      type="button"
                      onClick={() =>
                        void deleteTerm(period)
                      }
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <button
                    className="btn"
                    type="button"
                    onClick={() =>
                      void createTerm(term)
                    }
                  >
                    Create Schedule
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {message && (
        <div className="muted small">
          {message}
        </div>
      )}
    </section>
  );
}