import { WorkspaceFrame } from "@/app/components/WorkspaceFrame";
import { requireSession } from "@/lib/auth";
import {
  getAllSupplierQuotes,
  getAllSupplierRequests,
} from "@/lib/sourcing-queries";
import { SourcingTabs } from "./SourcingTabs";

// Merged sourcing workspace: supplier requests + quotes behind one nav item,
// shown as in-place tabs. Filters apply to whichever tab is active (?tab=).
export default async function SourcingPage(props: {
  searchParams: Promise<{
    q?: string | string[];
    state?: string | string[];
    tab?: string | string[];
  }>;
}) {
  const session = await requireSession();
  const searchParams = await props.searchParams;
  const one = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) ?? "";
  const query = one(searchParams.q);
  const state = one(searchParams.state);
  const tab = one(searchParams.tab) === "quotes" ? "quotes" : "requests";
  const normalized = query.trim().toLowerCase();

  const [allRequests, allQuotes] = await Promise.all([
    getAllSupplierRequests(),
    getAllSupplierQuotes(),
  ]);

  // Only the active tab's list is filtered; the other keeps its full set so
  // switching tabs shows everything until you filter there.
  const requests =
    tab === "requests"
      ? allRequests.filter((item) => {
          const matchesState = !state || item.state === state;
          const haystack = [
            item.request_code,
            item.style_name,
            item.style_code,
            item.vendor,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return matchesState && (!normalized || haystack.includes(normalized));
        })
      : allRequests;

  const quotes =
    tab === "quotes"
      ? allQuotes.filter((item) => {
          const matchesState = !state || item.state === state;
          const haystack = [
            item.quote_code,
            item.request_code,
            item.style_name,
            item.style_code,
            item.supplier,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return matchesState && (!normalized || haystack.includes(normalized));
        })
      : allQuotes;

  return (
    <WorkspaceFrame session={session}>
      <SourcingTabs
        requests={requests}
        quotes={quotes}
        filters={{ query, state }}
      />
    </WorkspaceFrame>
  );
}
