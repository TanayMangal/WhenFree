"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function GuestGroupForm() {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function viewGroup() {
    const cleanedCode = code.trim().toUpperCase();

    if (!cleanedCode) {
      setError("Enter a group code.");
      return;
    }

    setError("");

    router.push(
      `/guest/${encodeURIComponent(cleanedCode)}`
    );
  }

  return (
    <div className="card stack">
      <div>
        <h2 className="h2">Quick View</h2>

        <div className="muted">
          No account needed. Enter a group code to
          see when everyone is free.
        </div>
      </div>

      <div className="stack">
        <label>
          <div className="small">Group code</div>

          <input
            className="input"
            value={code}
            placeholder="ABC12345"
            autoCapitalize="characters"
            onChange={(event) =>
              setCode(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                viewGroup();
              }
            }}
          />
        </label>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <button
          className="btn secondary"
          type="button"
          onClick={viewGroup}
        >
          View Availability
        </button>
      </div>
    </div>
  );
}