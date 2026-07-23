"use client";

import { useState } from "react";
import { StyleObjects } from "./StyleObjects";
import type { StyleObjectKind } from "@/lib/spec-queries";

const TABS: Array<{ kind: StyleObjectKind; label: string }> = [
  { kind: "artwork", label: "Artwork" },
  { kind: "size_chart", label: "Size charts" },
  { kind: "spec_sheet", label: "Spec sheets" },
  { kind: "test_run", label: "Quality (test runs)" },
];

// Phase 5 — Specification & Quality: tabbed child-object lists on a style.
export function SpecQuality({ styleId }: { styleId: string }) {
  const [active, setActive] = useState<StyleObjectKind>("artwork");
  return (
    <section className="season-create">
      <h2>Specification &amp; quality</h2>
      <div className="spec-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.kind}
            role="tab"
            aria-selected={active === t.kind}
            className={active === t.kind ? "spec-tab is-active" : "spec-tab"}
            onClick={() => setActive(t.kind)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* Remount per kind so each tab loads its own list. */}
      <StyleObjects key={active} styleId={styleId} kind={active} />
    </section>
  );
}
