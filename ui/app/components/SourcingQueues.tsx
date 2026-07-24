import { ArrowSquareOut, MagnifyingGlass } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type {
  DbSupplierQuoteListItem,
  DbSupplierRequestListItem,
} from "@/lib/sourcing-queries";
import {
  OperationalContent,
  OperationalHeader,
  OperationalPage,
  OperationalPanel,
  OperationalState,
  OperationalTableRegion,
} from "./OperationalWorkspace";

type QueueFilters = {
  query: string;
  state: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
}

function QueueFilters({
  action,
  filters,
  states,
  tab,
}: {
  action: string;
  filters: QueueFilters;
  states: string[];
  tab?: string;
}) {
  const active = Boolean(filters.query || filters.state);
  const clearHref = tab ? `${action}?tab=${tab}` : action;
  return (
    <form className="operational-filter-v2" action={action}>
      {tab && <input type="hidden" name="tab" value={tab} />}
      <label>
        <span className="sr-only">Search records</span>
        <MagnifyingGlass size={16} />
        <input
          name="q"
          defaultValue={filters.query}
          placeholder="Search code, style, or supplier"
        />
      </label>
      <select
        name="state"
        defaultValue={filters.state}
        aria-label="Filter by state"
      >
        <option value="">All states</option>
        {states.map((state) => (
          <option key={state} value={state}>
            {state.replaceAll("_", " ")}
          </option>
        ))}
      </select>
      <button type="submit" className="ghost-button">
        Apply filters
      </button>
      {active && (
        <Link href={clearHref} className="operational-clear-v2">
          Clear
        </Link>
      )}
    </form>
  );
}

export function SupplierRequestQueue({
  requests,
  filters,
  variant = "page",
  filterAction = "/supplier-requests",
}: {
  requests: DbSupplierRequestListItem[];
  filters: QueueFilters;
  variant?: "page" | "embedded";
  filterAction?: string;
}) {
  const states = Array.from(new Set(requests.map((item) => item.state))).sort();
  const embedded = variant === "embedded";
  const Frame = embedded ? "div" : OperationalPage;
  return (
    <Frame>
      {!embedded && (
        <OperationalHeader
          eyebrow="Sourcing operations"
          title="Supplier requests"
          description="Track every supplier request from product handoff through technical approval and quoting."
        />
      )}
      <OperationalContent>
        <OperationalPanel
          title="Request queue"
          count={requests.length}
          actions={
            <QueueFilters
              action={filterAction}
              filters={filters}
              states={states}
              tab={embedded ? "requests" : undefined}
            />
          }
        >
          {requests.length === 0 ? (
            <OperationalState
              kind="empty"
              title="No supplier requests match"
              detail="Clear the filters or create a request from a Style record."
              action={
                <Link href="/styles" className="ghost-button">
                  Browse styles
                </Link>
              }
            />
          ) : (
            <OperationalTableRegion>
              <table className="season-table">
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Style</th>
                    <th>Supplier</th>
                    <th>Issue date</th>
                    <th>Technical approval</th>
                    <th>Quotes</th>
                    <th>State</th>
                    <th aria-label="Open record" />
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id}>
                      <td className="season-name-cell">
                        <Link
                          href={`/supplier-requests/${request.id}`}
                          className="style-name-link"
                        >
                          {request.request_code || "Request pending"}
                        </Link>
                      </td>
                      <td>
                        <strong>
                          {request.style_name || "Untitled style"}
                        </strong>
                        <small className="table-secondary-v2">
                          {request.style_code || "Code pending"}
                        </small>
                      </td>
                      <td>{request.vendor || "Unassigned"}</td>
                      <td>{formatDate(request.issue_date)}</td>
                      <td>
                        {request.tech_approval_status.replaceAll("_", " ")}
                      </td>
                      <td>{request.quote_count ?? 0}</td>
                      <td>
                        <span className="status-pill is-inactive">
                          <span className="status-dot" />
                          {request.state.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/supplier-requests/${request.id}`}
                          className="icon-action"
                          aria-label={`Open ${request.request_code || "supplier request"}`}
                        >
                          <ArrowSquareOut size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </OperationalTableRegion>
          )}
        </OperationalPanel>
      </OperationalContent>
    </Frame>
  );
}

export function SupplierQuoteQueue({
  quotes,
  filters,
  variant = "page",
  filterAction = "/supplier-quotes",
}: {
  quotes: DbSupplierQuoteListItem[];
  filters: QueueFilters;
  variant?: "page" | "embedded";
  filterAction?: string;
}) {
  const states = Array.from(new Set(quotes.map((item) => item.state))).sort();
  const embedded = variant === "embedded";
  const Frame = embedded ? "div" : OperationalPage;
  return (
    <Frame>
      {!embedded && (
        <OperationalHeader
          eyebrow="Commercial comparison"
          title="Supplier quotes"
          description="Compare supplier offers, material totals, landed product cost, and selection state."
        />
      )}
      <OperationalContent>
        <OperationalPanel
          title="Quote queue"
          count={quotes.length}
          actions={
            <QueueFilters
              action={filterAction}
              filters={filters}
              states={states}
              tab={embedded ? "quotes" : undefined}
            />
          }
        >
          {quotes.length === 0 ? (
            <OperationalState
              kind="empty"
              title="No supplier quotes match"
              detail="Clear the filters or open a supplier request to add its first quote."
              action={
                <Link href="/supplier-requests" className="ghost-button">
                  Open request queue
                </Link>
              }
            />
          ) : (
            <OperationalTableRegion>
              <table className="season-table">
                <thead>
                  <tr>
                    <th>Quote</th>
                    <th>Request</th>
                    <th>Style</th>
                    <th>Supplier</th>
                    <th>Currency</th>
                    <th>Target</th>
                    <th>Product cost</th>
                    <th>Margin</th>
                    <th>Selected</th>
                    <th>State</th>
                    <th aria-label="Open record" />
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote) => (
                    <tr key={quote.id}>
                      <td className="season-name-cell">
                        <Link
                          href={`/supplier-quotes/${quote.id}`}
                          className="style-name-link"
                        >
                          {quote.quote_code || "Quote pending"}
                        </Link>
                      </td>
                      <td>{quote.request_code || "—"}</td>
                      <td>
                        <strong>{quote.style_name || "Untitled style"}</strong>
                        <small className="table-secondary-v2">
                          {quote.style_code || "Code pending"}
                        </small>
                      </td>
                      <td>{quote.supplier || "Unassigned"}</td>
                      <td>{quote.currency || "—"}</td>
                      <td>{quote.target_price ?? "—"}</td>
                      <td>{quote.product_cost ?? "—"}</td>
                      <td>{quote.margin_pct ? `${quote.margin_pct}%` : "—"}</td>
                      <td>{quote.selected ? "Selected" : "Not selected"}</td>
                      <td>
                        <span className="status-pill is-inactive">
                          <span className="status-dot" />
                          {quote.state.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/supplier-quotes/${quote.id}`}
                          className="icon-action"
                          aria-label={`Open ${quote.quote_code || "supplier quote"}`}
                        >
                          <ArrowSquareOut size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </OperationalTableRegion>
          )}
        </OperationalPanel>
      </OperationalContent>
    </Frame>
  );
}
