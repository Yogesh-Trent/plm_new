"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  OperationalContent,
  OperationalHeader,
  OperationalPage,
} from "@/app/components/OperationalWorkspace";
import {
  SupplierRequestQueue,
  SupplierQuoteQueue,
} from "@/app/components/SourcingQueues";
import type {
  DbSupplierQuoteListItem,
  DbSupplierRequestListItem,
} from "@/lib/sourcing-queries";

type Filters = { query: string; state: string };
type SourcingTab = "requests" | "quotes";

const TABS: Array<{ key: SourcingTab; label: string }> = [
  { key: "requests", label: "Requests" },
  { key: "quotes", label: "Quotes" },
];

// One "Sourcing" workspace: requests and quotes as in-place tabs on a single
// page (they are the same workflow stage — a quote belongs to a request), so the
// sidebar needs one item instead of two. Switching tabs is client-side; the
// active tab is mirrored to ?tab= so filter submits and refresh stay in place.
export function SourcingTabs({
  requests,
  quotes,
  filters,
}: {
  requests: DbSupplierRequestListItem[];
  quotes: DbSupplierQuoteListItem[];
  filters: Filters;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const active: SourcingTab =
    params.get("tab") === "quotes" ? "quotes" : "requests";

  const selectTab = (key: SourcingTab) => {
    // Switching tab resets the tab-scoped filters (they belong to the other list).
    router.replace(key === "requests" ? "/sourcing" : `/sourcing?tab=${key}`, {
      scroll: false,
    });
  };

  return (
    <OperationalPage>
      <OperationalHeader
        eyebrow="Sourcing operations"
        title="Sourcing"
        description="Supplier requests and their quotes — the full sourcing stage in one place."
      />
      <div className="record-tabs" role="tablist" aria-label="Sourcing sections">
        {TABS.map((tab) => {
          const selected = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              className={`record-tab${selected ? " is-active" : ""}`}
              onClick={() => selectTab(tab.key)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <OperationalContent>
        {active === "requests" ? (
          <SupplierRequestQueue
            requests={requests}
            filters={filters}
            variant="embedded"
            filterAction="/sourcing"
          />
        ) : (
          <SupplierQuoteQueue
            quotes={quotes}
            filters={filters}
            variant="embedded"
            filterAction="/sourcing"
          />
        )}
      </OperationalContent>
    </OperationalPage>
  );
}
