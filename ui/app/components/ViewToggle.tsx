"use client";

import { useEffect, useState } from "react";
import { Rows, SquaresFour } from "@phosphor-icons/react";

export type RecordView = "table" | "grid";

// Reusable table/grid view switch. Persists the choice per list under a storage
// key so it sticks across reloads. Drop-in for any list page (Styles, Colourways,
// BOMs, POs) alongside a matching RecordCardGrid.
export function useRecordView(
  storageKey: string,
  fallback: RecordView = "table",
) {
  const [view, setView] = useState<RecordView>(fallback);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "table" || saved === "grid") setView(saved);
    } catch {
      /* localStorage unavailable — keep the fallback */
    }
  }, [storageKey]);

  const update = (next: RecordView) => {
    setView(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      /* ignore persistence failures */
    }
  };

  return [view, update] as const;
}

export function ViewToggle({
  view,
  onChange,
  label = "records",
}: {
  view: RecordView;
  onChange: (view: RecordView) => void;
  label?: string;
}) {
  return (
    <div className="view-toggle" role="group" aria-label={`Switch ${label} view`}>
      <button
        type="button"
        className={`view-toggle-btn is-icon${view === "table" ? " is-active" : ""}`}
        aria-pressed={view === "table"}
        aria-label="Table view"
        title="Table view"
        onClick={() => onChange("table")}
      >
        <Rows size={17} weight={view === "table" ? "fill" : "regular"} />
      </button>
      <button
        type="button"
        className={`view-toggle-btn is-icon${view === "grid" ? " is-active" : ""}`}
        aria-pressed={view === "grid"}
        aria-label="Card view"
        title="Card view"
        onClick={() => onChange("grid")}
      >
        <SquaresFour size={17} weight={view === "grid" ? "fill" : "regular"} />
      </button>
    </div>
  );
}
