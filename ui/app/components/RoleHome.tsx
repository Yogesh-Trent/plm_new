import {
  ArrowRight,
  CheckCircle,
  Clock,
  FileText,
  Package,
  Palette,
  Plus,
  Stack,
  TShirt,
  WarningCircle,
} from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { Session } from "@/lib/auth";
import { getBoms } from "@/lib/bom-queries";
import { getPos } from "@/lib/po-queries";
import {
  getAllColorCombos,
  getAudit,
  getRunByRole,
  getSeasons,
  getStyles,
} from "@/lib/queries";
import { ROLE_LABELS } from "@/lib/roles";
import { WorkspaceShell } from "./WorkspaceShell";

const ROLE_FOCUS = {
  designer: "Shape the range",
  buyer: "Secure the buy",
  technologist: "Protect product quality",
  all: "Direct the full product cycle",
  admin: "Maintain product standards",
} as const;

const ACTION_LABELS: Record<string, string> = {
  login: "Workspace session opened",
  upload: "Intake file added",
  approval: "Approval decision recorded",
  "run.state.patch": "Workflow progress updated",
};

function formatTime(value: unknown) {
  if (typeof value !== "string") return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export async function RoleHome({ session }: { session: Session }) {
  const [seasons, styles, combos, boms, pos, run] = await Promise.all([
    getSeasons(),
    getStyles(),
    getAllColorCombos({ limit: 6, offset: 0 }),
    getBoms(),
    getPos(),
    getRunByRole(session.role),
  ]);
  const audit = run ? await getAudit(run.id) : [];
  const activeSeasons = seasons.filter((season) => season.status === "active");
  const roleWork =
    session.role === "all"
      ? styles
      : styles.filter((style) => style.assigned_role === session.role);
  const openPos = pos.filter(
    (po) => po.state !== "issued" && po.state !== "closed",
  );
  const attentionCount = roleWork.length + openPos.length;
  const currentSeason = activeSeasons[0] ?? seasons[0];
  const recentStyles = styles.slice(0, 8);

  const primaryAction =
    session.role === "all"
      ? { href: "/all/process", label: "Create a season" }
      : session.role === "buyer"
        ? { href: "/purchase-orders", label: "Review purchase orders" }
        : {
            href: "/styles",
            label:
              session.role === "designer"
                ? "Create a style"
                : "Open technical worklist",
          };

  return (
    <WorkspaceShell
      role={session.role}
      userName={session.name}
      attentionCount={attentionCount}
    >
      <main className="workspace-main-v2" id="main-content">
        <header className="workspace-hero-v2">
          <div>
            <p className="workspace-eyebrow">
              {ROLE_FOCUS[session.role]} ·{" "}
              {currentSeason?.name ?? "Collection workspace"}
            </p>
            <h1>Good day.</h1>
            <p className="workspace-hero-copy-v2">
              {attentionCount
                ? `${attentionCount} ${attentionCount === 1 ? "record needs" : "records need"} a decision before the line can move forward.`
                : "Your product records are moving without blockers."}
            </p>
          </div>
          <div className="workspace-hero-actions-v2">
            <Link
              href={primaryAction.href}
              className="workspace-primary-action-v2"
            >
              <Plus size={18} weight="bold" /> {primaryAction.label}
            </Link>
            <Link href="/styles" className="workspace-secondary-action-v2">
              Browse product records <ArrowRight size={17} />
            </Link>
          </div>
        </header>

        <section
          className="workspace-metrics-v2"
          aria-label="Collection summary"
        >
          <article>
            <span className="metric-icon-v2">
              <FileText size={19} />
            </span>
            <div>
              <strong>{activeSeasons.length}</strong>
              <span>Active seasons</span>
            </div>
            <small>{currentSeason?.generic ?? "Current range"}</small>
          </article>
          <article>
            <span className="metric-icon-v2">
              <TShirt size={19} />
            </span>
            <div>
              <strong>{styles.length}</strong>
              <span>Styles in development</span>
            </div>
            <small>{roleWork.length} in your queue</small>
          </article>
          <article>
            <span className="metric-icon-v2">
              <Palette size={19} />
            </span>
            <div>
              <strong>{combos.total}</strong>
              <span>Colourways</span>
            </div>
            <small>
              {
                combos.combos.filter((combo) => combo.status === "active")
                  .length
              }{" "}
              recent active
            </small>
          </article>
          <article>
            <span className="metric-icon-v2">
              <Package size={19} />
            </span>
            <div>
              <strong>{openPos.length}</strong>
              <span>Open purchase orders</span>
            </div>
            <small>
              {pos.filter((po) => po.state === "issued").length} issued
            </small>
          </article>
        </section>

        <div className="workspace-dashboard-grid-v2">
          <section
            className="workspace-panel-v2 workspace-records-v2"
            aria-labelledby="recent-styles-title"
          >
            <div className="workspace-panel-heading-v2">
              <div>
                <p className="workspace-kicker">Product record</p>
                <h2 id="recent-styles-title">Recently updated styles</h2>
              </div>
              <Link href="/styles">
                View all styles <ArrowRight size={15} />
              </Link>
            </div>
            {recentStyles.length ? (
              <div
                className="workspace-table-v2"
                role="table"
                aria-label="Recently updated styles"
              >
                <div className="workspace-table-head-v2" role="row">
                  <span role="columnheader">Style</span>
                  <span role="columnheader">Season</span>
                  <span role="columnheader">Owner</span>
                  <span role="columnheader">Progress</span>
                </div>
                {recentStyles.map((style) => {
                  const progress =
                    style.combo_count > 0 ? "Colourway ready" : "Style created";
                  const assignedRole = style.assigned_role as
                    keyof typeof ROLE_LABELS | null;
                  return (
                    <Link
                      href={`/styles/${style.id}`}
                      className="workspace-table-row-v2"
                      role="row"
                      key={style.id}
                    >
                      <span role="cell">
                        <strong>{style.style_name || "Untitled style"}</strong>
                        <small>{style.style_code || "Code pending"}</small>
                      </span>
                      <span role="cell">
                        {style.season_name || "Unassigned"}
                      </span>
                      <span role="cell">
                        {assignedRole
                          ? (ROLE_LABELS[assignedRole] ?? style.assigned_role)
                          : "Open queue"}
                      </span>
                      <span role="cell" className="workspace-progress-cell-v2">
                        <i
                          className={style.combo_count > 0 ? "is-ready" : ""}
                        />
                        {progress}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="workspace-empty-v2">
                <TShirt size={28} />
                <h3>No styles in this collection yet</h3>
                <p>Create the first style to begin the product record.</p>
                <Link href="/styles">
                  Create a style <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </section>

          <aside
            className="workspace-panel-v2 workspace-queue-v2"
            aria-labelledby="queue-title"
          >
            <div className="workspace-panel-heading-v2">
              <div>
                <p className="workspace-kicker">Your focus</p>
                <h2 id="queue-title">Decision queue</h2>
              </div>
              <span className="workspace-count-v2">{attentionCount}</span>
            </div>
            <div className="workspace-queue-list-v2">
              <Link href="/styles">
                <span className="queue-indicator-v2 is-warm">
                  <WarningCircle size={18} />
                </span>
                <span>
                  <strong>
                    {roleWork.length}{" "}
                    {roleWork.length === 1
                      ? "style assignment"
                      : "style assignments"}
                  </strong>
                  <small>Review product ownership and next action</small>
                </span>
                <ArrowRight size={16} />
              </Link>
              <Link href="/purchase-orders">
                <span className="queue-indicator-v2">
                  <Clock size={18} />
                </span>
                <span>
                  <strong>
                    {openPos.length} open purchase{" "}
                    {openPos.length === 1 ? "order" : "orders"}
                  </strong>
                  <small>Check routing, capacity, and issue status</small>
                </span>
                <ArrowRight size={16} />
              </Link>
              <Link href="/boms">
                <span className="queue-indicator-v2 is-ready">
                  <Stack size={18} />
                </span>
                <span>
                  <strong>{boms.length} reusable BOMs</strong>
                  <small>Materials ready for product linking</small>
                </span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </aside>

          <section
            className="workspace-panel-v2 workspace-activity-v2"
            aria-labelledby="activity-title"
          >
            <div className="workspace-panel-heading-v2">
              <div>
                <p className="workspace-kicker">Traceability</p>
                <h2 id="activity-title">Recent activity</h2>
              </div>
            </div>
            {audit.length ? (
              <ul>
                {audit.slice(0, 4).map((entry, index) => (
                  <li key={String(entry.id ?? index)}>
                    <span>
                      {String(entry.actor ?? session.name)
                        .slice(0, 1)
                        .toUpperCase()}
                    </span>
                    <div>
                      <strong>
                        {ACTION_LABELS[String(entry.action)] ??
                          String(entry.action).replaceAll(".", " ")}
                      </strong>
                      <small>
                        {String(entry.actor ?? session.name)} ·{" "}
                        {formatTime(entry.at)}
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="workspace-activity-empty-v2">
                <CheckCircle size={20} />
                <span>
                  Activity will appear as the team updates this workspace.
                </span>
              </div>
            )}
          </section>

          <section
            className="workspace-panel-v2 workspace-flow-v2"
            aria-labelledby="flow-title"
          >
            <div className="workspace-panel-heading-v2">
              <div>
                <p className="workspace-kicker">Collection route</p>
                <h2 id="flow-title">From brief to issued order</h2>
              </div>
            </div>
            <ol>
              {[
                [
                  "01",
                  "Range setup",
                  `${activeSeasons.length} active seasons`,
                  activeSeasons.length > 0,
                ],
                [
                  "02",
                  "Product definition",
                  `${styles.length} ${styles.length === 1 ? "style" : "styles"} · ${combos.total} ${combos.total === 1 ? "colourway" : "colourways"}`,
                  styles.length > 0,
                ],
                [
                  "03",
                  "Materials & costing",
                  `${boms.length} BOMs available`,
                  boms.length > 0,
                ],
                [
                  "04",
                  "Order & approval",
                  `${openPos.length} ${openPos.length === 1 ? "order" : "orders"} in progress`,
                  openPos.length === 0 && pos.length > 0,
                ],
              ].map(([index, title, detail, complete], itemIndex) => (
                <li
                  key={String(index)}
                  className={
                    complete
                      ? "is-complete"
                      : itemIndex === 1
                        ? "is-current"
                        : ""
                  }
                >
                  <span>{String(index)}</span>
                  <div>
                    <strong>{String(title)}</strong>
                    <small>{String(detail)}</small>
                  </div>
                  {complete ? <CheckCircle size={19} weight="fill" /> : <i />}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </main>
    </WorkspaceShell>
  );
}
