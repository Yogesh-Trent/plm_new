"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  CalendarBlank,
  CaretDown,
  Check,
  CheckCircle,
  Clock,
  DotsThreeVertical,
  DownloadSimple,
  FileText,
  HandPalm,
  Info,
  List,
  Lock,
  MagnifyingGlass,
  Pause,
  PencilSimple,
  Question,
  Robot,
  ShieldCheck,
  SidebarSimple,
  TShirt,
  User,
  Warning,
  WarningCircle,
} from "@phosphor-icons/react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import data from "./data/prototype.json";

type Status = "complete" | "active" | "waiting" | "interrupted";

const classNames = (...items: Array<string | false | undefined>) =>
  items.filter(Boolean).join(" ");

const missingMarkers = [
  "Required from Excel",
  "Not provided",
  "Confirmation required",
];

function isMissingValue(value?: string) {
  return !value || missingMarkers.includes(value.trim());
}

function visibleValue(value?: string) {
  if (isMissingValue(value)) return "";
  return (value ?? "")
    .replace(/Required from Excel/g, "")
    .replace(/[·—:\-]\s*$/g, "")
    .trim();
}

function downloadFile(
  filename: string,
  content: string,
  type = "application/json",
) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function exportJson(filename: string, payload: unknown) {
  downloadFile(filename, JSON.stringify(payload, null, 2));
}

function saveLocalDraft(key: string, payload: unknown) {
  localStorage.setItem(
    key,
    JSON.stringify({ savedAt: new Date().toISOString(), payload }),
  );
}

function manualStorageKey(label: string) {
  return `plm-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function readManualField(label: string, fallback = "") {
  return typeof window === "undefined"
    ? fallback
    : (localStorage.getItem(manualStorageKey(label)) ?? fallback);
}

function useManualFieldVersion() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const update = () => setVersion((current) => current + 1);
    window.addEventListener("plm-field-change", update);
    return () => window.removeEventListener("plm-field-change", update);
  }, []);
  return version;
}

function StatusIcon({
  kind = "waiting",
  size = 22,
}: {
  kind?: string;
  size?: number;
}) {
  if (["complete", "Matched", "Pass", "Approved"].includes(kind))
    return <CheckCircle size={size} weight="fill" />;
  if (["Warning", "interrupted"].includes(kind))
    return <WarningCircle size={size} weight="fill" />;
  if (["Blocked", "Missing", "running", "Pending"].includes(kind))
    return kind === "running" ? (
      <Clock size={size} />
    ) : (
      <WarningCircle size={size} weight="fill" />
    );
  if (kind === "Locked") return <Lock size={size} />;
  return <Clock size={size} />;
}

function Header({
  mode,
  setMode,
  sidebarCollapsed,
  setSidebarCollapsed,
  notify,
}: {
  mode: "automation" | "manual";
  setMode: (mode: "automation" | "manual") => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  notify: (message: string) => void;
}) {
  const [panel, setPanel] = useState<
    "menu" | "notifications" | "help" | "profile" | null
  >(null);
  const togglePanel = (next: typeof panel) =>
    setPanel((current) => (current === next ? null : next));
  const resetPrototype = () => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("plm-"))
      .forEach((key) => localStorage.removeItem(key));
    setPanel(null);
    notify("Prototype state reset.");
    window.setTimeout(() => window.location.reload(), 350);
  };
  return (
    <header className="topbar">
      <button
        className="icon-button"
        aria-label="Open menu"
        aria-expanded={panel === "menu"}
        onClick={() => togglePanel("menu")}
      >
        <List size={24} />
      </button>
      <div className="product-brand">
        <span className="product-mark">PLM</span>
        <span className="product-copy">
          <strong>PLM workspace</strong>
        </span>
      </div>
      <div className="top-actions">
        <button
          className="icon-button sidebar-toggle"
          aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
          title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
          aria-pressed={sidebarCollapsed}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          <motion.span
            animate={{ rotate: sidebarCollapsed ? 180 : 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <SidebarSimple size={21} />
          </motion.span>
        </button>
        <div
          className="dashboard-switch"
          role="group"
          aria-label="Switch dashboard"
        >
          <button
            className={mode === "automation" ? "selected" : ""}
            aria-pressed={mode === "automation"}
            aria-label="Open Automation dashboard"
            title="Automation dashboard"
            onClick={() => setMode("automation")}
          >
            {mode === "automation" && (
              <motion.span
                className="switch-thumb"
                layoutId="dashboard-switch-thumb"
                transition={{ type: "spring", stiffness: 430, damping: 34 }}
              />
            )}
            <Robot
              size={19}
              weight={mode === "automation" ? "fill" : "regular"}
            />
          </button>
          <button
            className={mode === "manual" ? "selected" : ""}
            aria-pressed={mode === "manual"}
            aria-label="Open Manual dashboard"
            title="Manual dashboard"
            onClick={() => setMode("manual")}
          >
            {mode === "manual" && (
              <motion.span
                className="switch-thumb"
                layoutId="dashboard-switch-thumb"
                transition={{ type: "spring", stiffness: 430, damping: 34 }}
              />
            )}
            <HandPalm
              size={19}
              weight={mode === "manual" ? "fill" : "regular"}
            />
          </button>
        </div>
        <span
          className="sync-indicator"
          role="status"
          aria-label={mode === "manual" ? "PLM not synced" : "PLM current"}
          title={
            mode === "manual"
              ? "PLM not synced"
              : `PLM current · ${data.run.synced}`
          }
        >
          <span
            className={mode === "manual" ? "sync-not-started" : "sync-current"}
          >
            ●
          </span>
        </span>
        <button
          className="icon-button"
          aria-label="Notifications"
          aria-expanded={panel === "notifications"}
          onClick={() => togglePanel("notifications")}
        >
          <Bell size={22} />
        </button>
        <button
          className="icon-button"
          aria-label="Help"
          aria-expanded={panel === "help"}
          onClick={() => togglePanel("help")}
        >
          <Question size={22} />
        </button>
        <button
          className="icon-button"
          aria-label="Profile"
          aria-expanded={panel === "profile"}
          onClick={() => togglePanel("profile")}
        >
          <User size={23} />
        </button>
      </div>
      {panel && (
        <div className={classNames("header-popover", `panel-${panel}`)}>
          {panel === "menu" && (
            <>
              <h3>Run tools</h3>
              <button
                onClick={() => {
                  saveLocalDraft("plm-prototype-state", { mode });
                  notify("Current workspace saved locally.");
                  setPanel(null);
                }}
              >
                <FileText size={17} />
                Save workspace
              </button>
              <button
                onClick={() => {
                  exportJson("plm-prototype-data.json", data);
                  notify("Prototype data exported.");
                  setPanel(null);
                }}
              >
                <DownloadSimple size={17} />
                Export all JSON
              </button>
              <button onClick={resetPrototype}>
                <WarningCircle size={17} />
                Reset prototype
              </button>
            </>
          )}
          {panel === "notifications" && (
            <>
              <h3>Notifications</h3>
              <p>
                <WarningCircle size={17} />
                Source fields and ratio policy need attention.
              </p>
              <p>
                <Info size={17} />
                Drafts are stored in this browser.
              </p>
            </>
          )}
          {panel === "help" && (
            <>
              <h3>Prototype help</h3>
              <p>
                Select a mode, complete its fields, then use the primary action
                to progress. Export actions download real files.
              </p>
            </>
          )}
          {panel === "profile" && (
            <>
              <h3>
                {mode === "automation"
                  ? "Automation operator"
                  : "Manual operator"}
              </h3>
              <p>Prototype workspace · local session</p>
              <button
                onClick={() => {
                  notify("No sign-in is required for this prototype.");
                  setPanel(null);
                }}
              >
                <User size={17} />
                Session details
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}

function PhaseRail({
  phase,
  setPhase,
  collapsed,
}: {
  phase: number;
  setPhase: (id: number) => void;
  collapsed: boolean;
}) {
  return (
    <motion.aside
      layout="size"
      initial={false}
      transition={{ type: "spring", stiffness: 420, damping: 38 }}
      className={classNames(
        "phase-rail automation-rail",
        collapsed && "is-collapsed",
      )}
    >
      <div className="sidebar-heading">
        <span className="sidebar-mode-icon" title="Automation dashboard">
          <Robot size={20} weight="fill" />
        </span>
        <div className="sidebar-heading-copy">
          <span>Automation dashboard</span>
          <strong>{data.run.id}</strong>
          <small>
            {Math.max(0, phase - 1)} of {data.phases.length} phases complete
          </small>
          <div className="sidebar-progress" aria-hidden="true">
            <i
              style={{
                width: `${(Math.max(0, phase - 1) / data.phases.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
      <nav>
        {data.phases.map((item) => {
          const status: Status =
            item.id < phase
              ? "complete"
              : item.id === phase
                ? "active"
                : phase === 4 && item.id === 3
                  ? "interrupted"
                  : "waiting";
          return (
            <button
              key={item.id}
              onClick={() => setPhase(item.id)}
              aria-current={status === "active" ? "step" : undefined}
              className={classNames(
                "phase-item",
                status === "active" && "is-active",
              )}
            >
              <span className={classNames("phase-number", status)}>
                {item.id}
              </span>
              <span>
                <strong>{item.short}</strong>
                <small className={status}>
                  {status === "complete"
                    ? "Complete"
                    : status === "active"
                      ? "Active"
                      : status === "interrupted"
                        ? "Interrupted"
                        : "Waiting"}
                </small>
              </span>
              {status === "complete" && (
                <CheckCircle className="phase-check" size={20} />
              )}
            </button>
          );
        })}
      </nav>
      <div className="rail-meta">
        <div>
          <span>Source</span>
          <strong>{data.run.source}</strong>
        </div>
        <div>
          <span>Writes</span>
          <strong>
            {phase >= 5
              ? "7 completed"
              : phase > 2
                ? "2 completed"
                : "Not started"}
          </strong>
        </div>
        {phase >= 5 && (
          <div>
            <span>Last write</span>
            <strong>{data.run.synced}</strong>
          </div>
        )}
      </div>
    </motion.aside>
  );
}

function OperationStrip({ phase }: { phase: number }) {
  const states = data.operations.map((_, index) => {
    if (phase === 1)
      return index === 5 ? "warning" : index === 7 ? "blocked" : "complete";
    if (phase === 2) return index === 1 ? "active" : "waiting";
    if (phase === 3)
      return index < 2 ? "complete" : index === 2 ? "running" : "waiting";
    if (phase === 4)
      return index === 0 || index === 3
        ? "complete"
        : index === 1
          ? "active"
          : index === 7
            ? "waiting"
            : "warning";
    return index < 7 ? "complete" : "warning";
  });
  const stateLabel = (state: string) =>
    state === "complete"
      ? "Complete"
      : state === "running"
        ? "Running"
        : state === "active"
          ? "Active"
          : state === "warning"
            ? "Waiting"
            : state === "blocked"
              ? "Policy gated"
              : "Waiting";
  return (
    <div className="operation-strip">
      <span className="strip-label">PLM OPERATIONS</span>
      {data.operations.map((operation, index) => (
        <div
          className={classNames("operation-chip", states[index])}
          key={operation}
        >
          <span className="op-circle">
            {states[index] === "complete" ? (
              <Check size={15} weight="bold" />
            ) : (
              index + 1
            )}
          </span>
          <span className="op-copy">
            <span>{operation}</span>
            {phase >= 3 && <small>{stateLabel(states[index])}</small>}
          </span>
        </div>
      ))}
    </div>
  );
}

function SourcePanel({
  title = "Source record",
  rows,
  actions,
}: {
  title?: string;
  rows?: string[][];
  actions?: React.ReactNode;
}) {
  const visibleRows = (rows ?? data.sourceRecord).filter(([, value]) =>
    Boolean(visibleValue(value)),
  );
  return (
    <aside
      className={classNames(
        "context-panel",
        Boolean(actions) && "manual-context-panel",
      )}
    >
      <div className="context-scroll">
        <h3>{title}</h3>
        {visibleRows.length ? (
          <dl>
            {visibleRows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{visibleValue(value)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="context-empty">
            <Info size={18} />
            <span>No values filled in this phase yet.</span>
          </div>
        )}
      </div>
      {actions && (
        <section className="manual-panel-actions automation-panel-actions">
          <span>Workspace actions</span>
          {actions}
        </section>
      )}
    </aside>
  );
}

function ManualStatusBar({
  ready,
  title,
  subtitle,
}: {
  ready: boolean;
  title: string;
  subtitle?: string;
}) {
  return (
    <footer className={classNames("manual-status-bar", ready && "is-ready")}>
      {ready ? (
        <CheckCircle size={15} weight="fill" />
      ) : (
        <Warning size={15} weight="fill" />
      )}
      <strong>{title}</strong>
      {subtitle && <span>{subtitle}</span>}
    </footer>
  );
}

function Stat({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone?: string;
}) {
  return (
    <div className={classNames("stat", tone)}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ImportMap({
  notify,
  onComplete,
}: {
  notify: (text: string) => void;
  onComplete: () => void;
}) {
  const [sourceResolved, setSourceResolved] = useState(false);
  const [ratioApproved, setRatioApproved] = useState(false);
  const ready = sourceResolved && ratioApproved;
  const resolvedCount =
    14 + (sourceResolved ? 16 : 0) + (ratioApproved ? 1 : 0);
  const effectiveStatus = (row: string[]) =>
    row[4] === "Missing" && sourceResolved
      ? "Matched"
      : row[4] === "Blocked" && ratioApproved
        ? "Matched"
        : row[4];
  return (
    <>
      <div className="content-with-panel">
        <main className="workspace">
          <ScreenHeading phase={1} />
          <div className="source-health">
            <strong>{data.run.source}</strong>
            <span className="success-dot">● Loaded</span>
            <span className="health-copy">
              <b>Source health</b>
              <em>{resolvedCount} resolved</em>
              <em>{sourceResolved ? 0 : 16} missing</em>
              <em>{ratioApproved ? 0 : 1} policy blocker</em>
            </span>
            <button
              onClick={() => {
                setSourceResolved(true);
                notify(
                  "Replacement source loaded and 16 missing values resolved.",
                );
              }}
              className="text-button"
            >
              Replace source
            </button>
          </div>
          <div className="mapping-stats">
            <Stat
              value={String(
                14 + (sourceResolved ? 16 : 0) + (ratioApproved ? 1 : 0),
              )}
              label="Exact matches"
              tone="good"
            />
            <Stat value="0" label="Ambiguous matches" />
            <Stat
              value={sourceResolved ? "0" : "16"}
              label="Missing values"
              tone="warn"
            />
            <Stat value="0" label="Derived values" />
          </div>
          <section>
            <h3 className="section-label">Source-to-PLM mapping</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Source field</th>
                    <th>Source value</th>
                    <th>PLM target</th>
                    <th>Resolution</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.mapping.map((row) => {
                    const status = effectiveStatus(row);
                    return (
                      <tr key={row[0]}>
                        {row.slice(0, 4).map((cell, index) => (
                          <td key={index}>{visibleValue(cell)}</td>
                        ))}
                        <td
                          className={classNames(
                            "status-cell",
                            status.toLowerCase(),
                          )}
                        >
                          <StatusIcon kind={status} size={15} />
                          {status}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <div
            className={classNames(
              "inline-alert",
              ratioApproved && "is-success",
            )}
          >
            {ratioApproved ? (
              <CheckCircle size={30} weight="fill" />
            ) : (
              <Warning size={30} weight="fill" />
            )}
            <div>
              <strong>
                {ratioApproved ? "Size ratio approved" : "Size ratio required"}
              </strong>
              <span>
                {ratioApproved
                  ? "The balanced 1:2:3:3:2:1 ratio is ready for simulation."
                  : "All six size quantities are 0 while Total Qty is 15,511. Add an approved ratio before simulation."}
              </span>
            </div>
            <button
              onClick={() => {
                setRatioApproved(true);
                notify("Balanced ratio policy approved.");
              }}
              className="text-button"
            >
              Review ratio policy
            </button>
          </div>
        </main>
        <RunPreview
          actions={
            <>
              <button
                className="ghost-link"
                onClick={() => {
                  exportJson("source-to-plm-mapping.json", {
                    mapping: data.mapping.map((row) => [
                      ...row.slice(0, 4),
                      effectiveStatus(row),
                    ]),
                    sourceResolved,
                    ratioApproved,
                  });
                  notify("Mapping JSON downloaded.");
                }}
              >
                Export mapping
              </button>
              <button
                className="secondary"
                onClick={() => {
                  saveLocalDraft("plm-automation-draft", {
                    sourceResolved,
                    ratioApproved,
                  });
                  notify("Automation draft saved locally.");
                }}
              >
                Save draft
              </button>
              <button
                className={classNames("primary", !ready && "disabled")}
                aria-disabled={!ready}
                onClick={() => {
                  if (ready) {
                    localStorage.setItem("plm-automation-mapped", "true");
                    onComplete();
                  } else {
                    notify(
                      `Resolve ${sourceResolved ? 0 : 16} source values and ${ratioApproved ? 0 : 1} ratio policy first.`,
                    );
                  }
                }}
              >
                Validate mapping
              </button>
            </>
          }
        />
      </div>
      <ActionBar
        icon={ready ? "safe" : "warning"}
        title={
          ready
            ? "Mapping complete · ready to simulate"
            : "Mapping incomplete · source values and ratio policy require attention"
        }
        subtitle={
          ready
            ? "All source values resolve to active PLM keys."
            : "Replace the source and approve a ratio before validation."
        }
      >
        <button
          onClick={() => {
            exportJson("source-to-plm-mapping.json", {
              mapping: data.mapping.map((row) => [
                ...row.slice(0, 4),
                effectiveStatus(row),
              ]),
              sourceResolved,
              ratioApproved,
            });
            notify("Mapping JSON downloaded.");
          }}
          className="ghost-link"
        >
          Export mapping
        </button>
        <button
          onClick={() => {
            saveLocalDraft("plm-automation-draft", {
              sourceResolved,
              ratioApproved,
            });
            notify("Automation draft saved locally.");
          }}
          className="secondary"
        >
          Save draft
        </button>
        <button
          onClick={() => {
            if (ready) {
              localStorage.setItem("plm-automation-mapped", "true");
              onComplete();
            } else
              notify(
                `Resolve ${sourceResolved ? 0 : 16} source values and ${ratioApproved ? 0 : 1} ratio policy first.`,
              );
          }}
          className={classNames("primary", !ready && "disabled")}
          aria-disabled={!ready}
        >
          Validate mapping
        </button>
      </ActionBar>
    </>
  );
}

function RunPreview({ actions }: { actions?: React.ReactNode }) {
  return (
    <aside className="context-panel preview-panel manual-context-panel">
      <div className="context-scroll">
        <h3>RUN OUTPUT PREVIEW</h3>
        <p>8 operations from this row</p>
        <div className="preview-list">
          {data.operations.map((item, index) => (
            <div key={item}>
              <span
                className={classNames(
                  "preview-number",
                  index === 5 && "warning",
                  index === 7 && "blocked",
                )}
              >
                {index + 1}
              </span>
              <span>
                <strong>{item}</strong>
                <small>
                  {
                    [
                      "Create or find",
                      "BLACK",
                      "FKn01144",
                      "Silver Seal Request Template",
                      "₹100 · HSN 62033300",
                      "Waiting for ratio",
                      "15,511 · Domestic",
                      "Policy gated",
                    ][index]
                  }
                </small>
              </span>
              <StatusIcon
                kind={
                  index === 5 ? "Warning" : index === 7 ? "Blocked" : "complete"
                }
                size={20}
              />
            </div>
          ))}
        </div>
      </div>
      {actions && (
        <section className="manual-panel-actions automation-panel-actions">
          <span>Workspace actions</span>
          {actions}
        </section>
      )}
    </aside>
  );
}

function ScreenHeading({ phase }: { phase: number }) {
  const item = data.phases[phase - 1];
  return (
    <div className="screen-heading">
      <h1>{item.title}</h1>
      <p>{item.subtitle}</p>
    </div>
  );
}

function Plan({
  setPhase,
  notify,
}: {
  setPhase: (id: number) => void;
  notify: (text: string) => void;
}) {
  const [approved, setApproved] = useState(false);
  const [mapped, setMapped] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(
      () => setMapped(localStorage.getItem("plm-automation-mapped") === "true"),
      0,
    );
    return () => window.clearTimeout(timer);
  }, []);
  const approvePlan = () => {
    if (!mapped) {
      notify("Complete and validate source mapping before plan approval.");
      return;
    }
    setApproved(true);
    saveLocalDraft("plm-approved-plan", {
      operations: data.planRows,
      approvedAt: new Date().toISOString(),
    });
    notify("Run plan approved. Execution is ready.");
    window.setTimeout(() => setPhase(3), 450);
  };
  return (
    <>
      <div className="content-with-panel">
        <main className="workspace">
          <ScreenHeading phase={2} />
          <MiniFlow active={2} />
          <div className="table-wrap plan-table">
            <table>
              <thead>
                <tr>
                  {[
                    "Operation",
                    "Decision",
                    "Planned object",
                    "Key inputs / inheritance",
                    "Expected state",
                    "PLM write",
                  ].map((x) => (
                    <th key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.planRows.map((row) => (
                  <tr key={row[0]}>
                    <td>
                      <b>{row[0]}</b> &nbsp; <strong>{row[1]}</strong>
                    </td>
                    {row.slice(2).map((cell, index) => (
                      <td
                        className={cell === "Blocked" ? "warning-text" : ""}
                        key={index}
                      >
                        {visibleValue(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="plan-grid">
            <section className="summary-card">
              <h3>Dry-run summary</h3>
              <div className="summary-stats">
                <Stat
                  value={mapped ? "0" : "6"}
                  label="blockers"
                  tone={mapped ? "good" : "bad"}
                />
                <Stat value="2" label="warnings" tone="warn" />
                <Stat value="0" label="writes performed" tone="good" />
              </div>
              <h4>{mapped ? "Resolved requirements" : "Blockers (6)"}</h4>
              {(mapped
                ? ["Source mapping validated", "Size ratio policy approved"]
                : data.blockers
              ).map((x) => (
                <p className="compact-line" key={x}>
                  <WarningCircle size={13} weight="fill" />
                  {visibleValue(x)}
                </p>
              ))}
              <h4 className="warning-text">Warnings (2)</h4>
              {data.warnings.map((x) => (
                <p className="compact-line" key={x}>
                  <Warning size={13} />
                  {x}
                </p>
              ))}
            </section>
            <section className="summary-card">
              <h3>Expected generated IDs</h3>
              {data.generatedIds.map(([a, b]) => (
                <p className="key-value" key={a}>
                  <span>{a}</span>
                  <b>{b}</b>
                </p>
              ))}
            </section>
            <section className="summary-card">
              <h3>Downstream impact rules</h3>
              <ul>
                <li>Style change stales all downstream</li>
                <li>Color or BOM change stales Request → Issue</li>
                <li>Quote change stales SKUs → Issue</li>
                <li>Size ratio change stales SKUs → Issue</li>
              </ul>
            </section>
            <section className="summary-card">
              <h3>Safe retry boundary</h3>
              <ul>
                <li>Reads may retry automatically</li>
                <li>Create and approve require find-before-create</li>
                <li>Resume from first incomplete operation</li>
                <li>Create/approve never blind-retry</li>
              </ul>
            </section>
            <section className="summary-card plan-actions-card">
              <h3>Planned API / actions</h3>
              <p>
                Find style · Create style · Create color · Link BOM material ·
                Create request · Update/approve quote · Generate SKUs · Create
                PO · Validate/route/issue
              </p>
            </section>
          </div>
        </main>
        <SourcePanel
          title="Planning inputs"
          rows={data.sourceRecord.filter(([label]) =>
            ["Material", "Colour", "Vendor", "Total Qty"].includes(label),
          )}
          actions={
            <>
              <button className="ghost-link" onClick={() => setPhase(1)}>
                Back to mapping
              </button>
              <button
                className="secondary"
                onClick={() => {
                  exportJson("dry-run-plan.json", {
                    operations: data.planRows,
                    blockers: data.blockers,
                    warnings: data.warnings,
                  });
                  notify("Dry-run plan downloaded.");
                }}
              >
                <DownloadSimple size={18} />
                Export plan
              </button>
              <button
                className={classNames("primary", !mapped && "disabled")}
                aria-disabled={!mapped}
                onClick={approvePlan}
              >
                {approved ? "Plan approved" : "Approve run plan"}
              </button>
            </>
          }
        />
      </div>
      <ActionBar
        icon={mapped ? "safe" : "warning"}
        title={
          mapped
            ? "Dry-run complete · ready for approval"
            : "Plan blocked · 6 source or policy requirements unresolved"
        }
      >
        <button className="secondary" onClick={() => setPhase(1)}>
          Back to mapping
        </button>
        <button
          className="secondary"
          onClick={() => {
            exportJson("dry-run-plan.json", {
              operations: data.planRows,
              blockers: data.blockers,
              warnings: data.warnings,
            });
            notify("Dry-run plan downloaded.");
          }}
        >
          <DownloadSimple size={20} />
          Export plan
        </button>
        <button
          className={classNames("primary", !mapped && "disabled")}
          aria-disabled={!mapped}
          onClick={approvePlan}
        >
          {approved ? "Plan approved" : "Approve run plan"}
        </button>
      </ActionBar>
    </>
  );
}

function MiniFlow({ active }: { active: number }) {
  return (
    <div className="mini-flow">
      {data.operations.map((item, index) => (
        <div
          key={item}
          className={classNames(index + 1 === active && "active")}
        >
          <span>{index + 1}</span>
          <small>{item}</small>
          {index < data.operations.length - 1 && <ArrowRight size={16} />}
        </div>
      ))}
    </div>
  );
}

function Execute({
  notify,
  onComplete,
}: {
  notify: (text: string) => void;
  onComplete: () => void;
}) {
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(38);
  const completionNotified = useRef(false);
  const finished = progress >= 100;
  useEffect(() => {
    if (paused || finished) return;
    const timer = window.setTimeout(
      () => setProgress((value) => Math.min(100, value + 2)),
      350,
    );
    return () => window.clearTimeout(timer);
  }, [paused, finished, progress]);
  useEffect(() => {
    if (progress === 100 && !completionNotified.current) {
      completionNotified.current = true;
      localStorage.setItem("plm-automation-executed", "true");
      notify(
        "Execution completed successfully. All eight operations finished.",
      );
    }
  }, [progress, notify]);
  const completedCount = Math.min(8, Math.floor(progress / 12.5));
  return (
    <>
      <div className="content-with-panel">
        <main className="workspace execute-workspace">
          <ScreenHeading phase={3} />
          <div className="progress-row">
            <strong>
              {finished
                ? "100% complete"
                : paused
                  ? "Paused safely"
                  : `${progress}% complete`}
            </strong>
            <div className="progress">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="execution-stats">
            <Stat value={String(completedCount)} label="complete" />
            <Stat
              value={paused || finished ? "0" : "1"}
              label={paused ? "running" : "running"}
            />
            <Stat
              value={String(
                Math.max(0, 8 - completedCount - (finished ? 0 : 1)),
              )}
              label="waiting"
            />
            <Stat value="00:04:18" label="Elapsed" />
            <span className="safe-state">Safe state · Resume from BOM</span>
          </div>
          <div className="execution-list">
            <div className="execution-head">
              <span>#</span>
              <span>Operation</span>
              <span>Generated ID</span>
              <span>Current action / result</span>
              <span>Elapsed</span>
            </div>
            {data.executeRows.map((row) => (
              <div
                className={classNames(
                  "execution-row",
                  row[5],
                  row[5] === "running" && "expanded",
                )}
                key={row[0]}
              >
                <StatusIcon kind={row[5]} size={24} />
                <b>
                  {row[0]} &nbsp; {row[1]}
                </b>
                <span>{row[2]}</span>
                <div>
                  <strong>{row[3]}</strong>
                  {row[5] === "running" && (
                    <div className="request-detail">
                      <b>Current PLM request</b>
                      <span>PATCH /styleBOMs/BOM-004781/placements</span>
                      <b>Current state</b>
                      <span>Saving placement · idempotency key locked</span>
                      <span className="safe-state">
                        <ShieldCheck size={17} />
                        Safe to pause after response
                      </span>
                    </div>
                  )}
                </div>
                <span>{row[4]}</span>
              </div>
            ))}
          </div>
          <section className="event-log">
            <h3>
              Live event log <span>16 Jul 2026</span>
            </h3>
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Operation</th>
                  <th>Target</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {data.eventLog.map((r, i) => (
                  <tr key={i}>
                    {r.map((c) => (
                      <td key={c}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </main>
        <ExecutePanel
          actions={
            <>
              <button
                className="secondary"
                onClick={() => {
                  exportJson("automation-event-log.json", {
                    progress,
                    paused,
                    events: data.eventLog,
                  });
                  notify("Full event log downloaded.");
                }}
              >
                View full log
              </button>
              <button
                className="primary"
                onClick={() => (finished ? onComplete() : setPaused(!paused))}
              >
                {finished
                  ? "Continue to recovery"
                  : paused
                    ? "Resume run"
                    : "Pause after current action"}
              </button>
            </>
          }
        />
      </div>
      <ActionBar
        icon="safe"
        title={
          paused
            ? "Run paused at a safe boundary"
            : finished
              ? "Run completed · all writes verified"
              : "Current write will finish before pausing"
        }
        subtitle="No partial create · resume from BOM placement"
      >
        <button
          className="secondary"
          onClick={() => {
            exportJson("automation-event-log.json", {
              progress,
              paused,
              events: data.eventLog,
            });
            notify("Full event log downloaded.");
          }}
        >
          View full log
        </button>
        <button
          className="primary"
          onClick={() => (finished ? onComplete() : setPaused(!paused))}
        >
          {finished ? (
            <>
              <ArrowRight size={19} />
              Continue to recovery
            </>
          ) : paused ? (
            <>
              <ArrowRight size={19} />
              Resume run
            </>
          ) : (
            <>
              <Pause size={19} />
              Pause after current action
            </>
          )}
        </button>
      </ActionBar>
    </>
  );
}

function ExecutePanel({ actions }: { actions?: React.ReactNode }) {
  return (
    <aside className="context-panel manual-context-panel">
      <div className="context-scroll">
        <h3>Current object inventory</h3>
        <dl>
          {[
            ["Style", "STY-26-004781 · Draft"],
            ["Color", "CC-004781-BLK · Complete"],
            ["BOM", "BOM-004781 · Writing"],
          ].map(([a, b], i) => (
            <div key={a}>
              <dt>{a}</dt>
              <dd>
                {b}
                <i className={i === 2 ? "red-dot" : "green-dot"} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
      {actions && (
        <section className="manual-panel-actions automation-panel-actions">
          <span>Workspace actions</span>
          {actions}
        </section>
      )}
    </aside>
  );
}

function Resolve({
  notify,
  onComplete,
}: {
  notify: (text: string) => void;
  onComplete: () => void;
}) {
  const [strategy, setStrategy] = useState("FASHION");
  const [query, setQuery] = useState("");
  const [resolved, setResolved] = useState(false);
  const matches = data.strategyValues.filter((value) =>
    value.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <div className="content-with-panel">
        <main className="workspace resolve-workspace">
          <ScreenHeading phase={4} />
          <div className="resolve-grid">
            <ExceptionInbox />
            <section className="resolve-main">
              <h2>Resolve Strategy</h2>
              <p className="subtle">
                <WarningCircle size={17} weight="fill" /> Color operation
                blocked · active PLM enum required
              </p>
              <div className="compare-fields">
                <label>
                  Excel value
                  <input
                    value=""
                    aria-label="Missing Excel strategy value"
                    readOnly
                  />
                </label>
                <ArrowRight size={22} />
                <label>
                  Selected corrected value
                  <div className="selected-value">
                    {strategy}
                    <span>Active PLM key</span>
                  </div>
                </label>
              </div>
              <div className="strategy-content">
                <div>
                  <div className="search">
                    <MagnifyingGlass size={17} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      aria-label="Search active strategy values"
                      placeholder="Search active Strategy values"
                    />
                  </div>
                  <h4>Active PLM matches</h4>
                  <div
                    role="radiogroup"
                    aria-label="Active PLM strategy values"
                  >
                    {matches.map((value) => (
                      <button
                        key={value}
                        role="radio"
                        aria-checked={strategy === value}
                        className={classNames(
                          "radio-row",
                          strategy === value && "selected",
                        )}
                        onClick={() => setStrategy(value)}
                      >
                        <span className="radio-dot" />
                        {value}
                        <small>Active</small>
                      </button>
                    ))}
                  </div>
                  {matches.length === 0 && (
                    <div className="empty-state">
                      <MagnifyingGlass size={20} />
                      <strong>No active values match</strong>
                      <span>Try a broader strategy name.</span>
                      <button onClick={() => setQuery("")}>Clear search</button>
                    </div>
                  )}
                  <h4>Inactive values excluded</h4>
                  <div className="inactive-row">
                    FASHION OLD <small>Inactive · excluded</small>
                  </div>
                </div>
                <div>
                  <h4>Audit comparison</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>Original</th>
                        <th>Corrected</th>
                        <th>Rule</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td />
                        <td>{strategy}</td>
                        <td>Active enum key required</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="audit-note">
                    Resolved by automation operator · 16 Jul 2026, 10:18
                  </p>
                </div>
              </div>
              <div className="impact-grid">
                <div>
                  <h3>Downstream impact</h3>
                  <div className="preserved">
                    <span>
                      <CheckCircle size={23} />
                      Style<small>Preserved</small>
                    </span>
                    <span>
                      <CheckCircle size={23} />
                      Supplier request<small>Preserved</small>
                    </span>
                  </div>
                  <div className="stale-chain">
                    Color → BOM → Quote/code → SKUs → Supplier PO
                  </div>
                  <p className="warning-text">
                    Revalidate from first changed operation
                  </p>
                </div>
                <div>
                  <h3>Retry preview</h3>
                  {data.retryPreview.map((x, i) => (
                    <p className="retry" key={x}>
                      <span>{i + 1}</span>
                      {x}
                    </p>
                  ))}
                </div>
              </div>
            </section>
          </div>
          <div className="safety-card">
            <ShieldCheck size={56} />
            <div>
              <h3>
                {resolved
                  ? "Recovery preview confirmed"
                  : "Find-before-create confirmed"}
              </h3>
              <p>
                Stored object IDs will be reused. No completed object will be
                recreated.
              </p>
              <div className="preserved-tags">
                <span>
                  <CheckCircle />
                  Style ST-001 · Preserved
                </span>
                <span>
                  <CheckCircle />
                  Supplier request SR-001 · Preserved
                </span>
                <span>
                  <CheckCircle />
                  Quote SQ-001 · ID preserved
                </span>
              </div>
              <small>Idempotency key RUN-R-001-04</small>
            </div>
          </div>
        </main>
        <SourcePanel
          title="Recovery values"
          rows={[
            ["Colour", "BLACK"],
            ["Selected strategy", strategy],
            ["Recovery state", resolved ? "Validated" : "Pending apply"],
          ]}
          actions={
            <>
              <button
                className="secondary"
                onClick={() => {
                  saveLocalDraft("plm-recovery-note", {
                    strategy,
                    resolved,
                    note: "Active enum correction",
                  });
                  notify("Recovery note saved locally.");
                }}
              >
                Save note
              </button>
              <button
                className="secondary"
                onClick={() => notify("Run paused.")}
              >
                Pause run
              </button>
              <button
                className="primary"
                onClick={() => {
                  setResolved(true);
                  localStorage.setItem("plm-automation-recovered", "true");
                  notify(
                    "Fix applied. Five operations revalidated successfully.",
                  );
                  window.setTimeout(onComplete, 450);
                }}
              >
                Apply fix & resume
              </button>
            </>
          }
        />
      </div>
      <ActionBar
        icon="warning"
        title="1 exception selected · 5 operations will rerun"
        subtitle="Completed objects and stored PLM IDs remain preserved."
      >
        <button
          className="secondary"
          onClick={() => {
            saveLocalDraft("plm-recovery-note", {
              strategy,
              resolved,
              note: "Active enum correction",
            });
            notify("Recovery note saved locally.");
          }}
        >
          Save note
        </button>
        <button className="secondary" onClick={() => notify("Run paused.")}>
          Pause run
        </button>
        <button
          className="primary"
          onClick={() => {
            setResolved(true);
            localStorage.setItem("plm-automation-recovered", "true");
            notify("Fix applied. Five operations revalidated successfully.");
            window.setTimeout(onComplete, 450);
          }}
        >
          Apply fix & resume
        </button>
      </ActionBar>
    </>
  );
}

function ExceptionInbox() {
  const [selected, setSelected] = useState("Strategy");
  return (
    <aside className="exception-inbox">
      <h3>Exception inbox</h3>
      {Object.entries(data.exceptions).map(([group, items]) => (
        <div key={group}>
          <h4>{group}</h4>
          {items.map(([a, b]) => (
            <button
              className={classNames(
                "exception-row",
                a === selected && "selected",
              )}
              key={a}
              onClick={() => setSelected(a)}
            >
              <StatusIcon
                kind={
                  group === "PLM/API"
                    ? "waiting"
                    : a === "Size ratio"
                      ? "Warning"
                      : "Blocked"
                }
                size={18}
              />
              <span>
                {a}
                <small>{visibleValue(b)}</small>
              </span>
            </button>
          ))}
        </div>
      ))}
    </aside>
  );
}

function Review({
  notify,
  onBackToReview,
}: {
  notify: (text: string) => void;
  onBackToReview: () => void;
}) {
  const [approvalIndex, setApprovalIndex] = useState(1);
  const [issued, setIssued] = useState(false);
  const approvals = useMemo(
    () =>
      data.approvals.map((x, i) => {
        if (i < approvalIndex)
          return [x[0], "Approved", i === 0 ? x[2] : "Approved just now"];
        if (i === approvalIndex && i < 4)
          return [x[0], "Pending", "Select to approve"];
        if (i === 4)
          return [
            x[0],
            issued ? "Approved" : approvalIndex >= 4 ? "Pending" : "Locked",
            issued ? "SPO-R001 issued" : "",
          ];
        return [x[0], "Waiting", ""];
      }),
    [approvalIndex, issued],
  );
  const approveStep = (index: number) => {
    if (index === approvalIndex && index < 4) {
      setApprovalIndex((current) => current + 1);
      notify(`${data.approvals[index][0]} approved.`);
    }
  };
  const issuePo = () => {
    if (approvalIndex < 4)
      return notify(
        "Complete the approval route before issuing the supplier PO.",
      );
    setIssued(true);
    exportJson("supplier-po-SPO-R001.json", {
      id: "SPO-R001",
      status: "Issued",
      issuedAt: new Date().toISOString(),
      source: data.sourceRecord,
    });
    notify("Supplier PO issued and downloaded.");
  };
  return (
    <>
      <div className="review-layout">
        <main className="workspace review-workspace">
          <ScreenHeading phase={6} />
          <div className="review-columns">
            <section>
              <h3>Final object inventory</h3>
              <table>
                <thead>
                  <tr>
                    <th>Object</th>
                    <th>ID</th>
                    <th>State</th>
                  </tr>
                </thead>
                <tbody>
                  {data.inventory.map((r) => (
                    <tr key={r[0]}>
                      <td>{r[0]}</td>
                      <td>{r[1]}</td>
                      <td
                        className={classNames(
                          "status-cell",
                          r[2].toLowerCase(),
                        )}
                      >
                        <StatusIcon
                          kind={r[2] === "Draft" ? "Warning" : "complete"}
                          size={15}
                        />
                        {r[2]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="audit-card">
                <ShieldCheck size={55} />
                <div>
                  <h3>Signed audit summary</h3>
                  <p>Run R-001 · 42 events · 7 PLM writes</p>
                  <p>
                    Signed by PLM Automation
                    <br />
                    16 Jul 2026, 09:45
                    <br />
                    9F2A…71C4
                  </p>
                </div>
              </div>
            </section>
            <section>
              <h3>Source ↔ PLM reconciliation</h3>
              <table>
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Source</th>
                    <th>PLM</th>
                    <th>Check</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reconciliation.map((r) => (
                    <tr key={r[0]}>
                      {r.slice(0, 3).map((x) => (
                        <td key={x}>{x}</td>
                      ))}
                      <td
                        className={classNames(
                          "status-cell",
                          r[3].toLowerCase(),
                        )}
                      >
                        <StatusIcon kind={r[3]} size={15} />
                        {r[3]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="recon-summary">
                <p>
                  <b>Quantity</b>15,511 = 15,511{" "}
                  <span>
                    <StatusIcon kind="Pass" size={16} />
                    Pass
                  </span>
                </p>
                <p>
                  <b>Price</b>₹100 / MRP ₹999{" "}
                  <span>
                    <StatusIcon kind="Pass" size={16} />
                    Pass
                  </span>
                </p>
                <p>
                  <b>Dates</b>Same-day handoff needs policy approval{" "}
                  <span className="warning-text">
                    <StatusIcon kind="Warning" size={16} />
                    Warning
                  </span>
                </p>
              </div>
            </section>
          </div>
        </main>

        <aside className="final-review-panel approval-issue-panel">
          <div className="final-review-panel-scroll">
            <section>
              <div className="approval-title">
                <h2>Approval route</h2>
                <span>Waiting</span>
              </div>
              <div className="approval-route-steps">
                {approvals.map((r, i) => (
                  <button
                    onClick={() => approveStep(i)}
                    aria-label={
                      i === approvalIndex && i < 4
                        ? `Approve ${r[0]}`
                        : "Approval status for " + r[0]
                    }
                    key={r[0]}
                    className={classNames("approval-step", r[1].toLowerCase())}
                  >
                    <span className="approval-icon">
                      {r[1] === "Locked" ? <Lock /> : <User />}
                    </span>
                    <span>
                      <strong>{r[0]}</strong>
                      <small>{r[1]}</small>
                      {r[2] && <em>{r[2]}</em>}
                    </span>
                    <StatusIcon kind={r[1]} size={22} />
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h2>Downstream delivery</h2>
              <div className="approval-deliveries">
                {data.deliveries.map((r) => (
                  <div className="delivery" key={r[0]}>
                    <FileText size={18} />
                    <b>{r[0]}</b>
                    <span>{r[1]}</span>
                    <em>{r[2]}</em>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <section className="review-panel-actions approval-issue-actions">
            <span>Approval actions</span>
            <button
              className="ghost-link"
              onClick={() => {
                exportJson("automation-audit.json", {
                  approvals,
                  issued,
                  inventory: data.inventory,
                  reconciliation: data.reconciliation,
                });
                notify("Audit JSON downloaded.");
              }}
            >
              Export audit
            </button>
            <button className="secondary" onClick={onBackToReview}>
              Back to final review
            </button>
            <button
              className={classNames(
                "primary",
                (approvalIndex < 4 || issued) && "disabled",
              )}
              aria-disabled={approvalIndex < 4 || issued}
              onClick={issuePo}
            >
              <Lock size={18} />
              {issued ? "Supplier PO issued" : "Issue supplier PO"}
            </button>
          </section>
        </aside>
      </div>
      <ActionBar
        icon="warning"
        title={
          issued
            ? "Supplier PO issued · downstream delivery started"
            : `Release readiness · ${9 + Math.max(0, approvalIndex - 1)} checks passed · ${Math.max(0, 4 - approvalIndex)} approvals pending`
        }
        subtitle="Same-day shipment policy and remaining approvals must clear before issue."
      >
        <button
          className="ghost-link"
          onClick={() => {
            exportJson("automation-audit.json", {
              approvals,
              issued,
              inventory: data.inventory,
              reconciliation: data.reconciliation,
            });
            notify("Audit JSON downloaded.");
          }}
        >
          Export audit
        </button>
        <button className="secondary" onClick={onBackToReview}>
          Back to final review
          <ArrowRight size={17} />
        </button>
        <button
          className={classNames(
            "primary",
            (approvalIndex < 4 || issued) && "disabled",
          )}
          aria-disabled={approvalIndex < 4 || issued}
          onClick={issuePo}
        >
          <Lock size={19} />
          {issued ? "Supplier PO issued" : "Issue supplier PO"}
        </button>
      </ActionBar>
    </>
  );
}

type DashboardMode = "automation" | "manual";

function FinalReview({
  mode,
  notify,
  onContinue,
}: {
  mode: DashboardMode;
  notify: (text: string) => void;
  onContinue: () => void;
}) {
  const storageKey = `plm-final-review-${mode}`;
  const initialRows = data.finalReview.fields.map((row) => [...row]);
  const suggestions: Record<string, string> = data.finalReview.suggestions;
  const [rows, setRows] = useState<string[][]>(initialRows);
  const [editMode, setEditMode] = useState(mode === "manual");
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const payload = parsed.payload ?? parsed;
          if (Array.isArray(payload.rows)) setRows(payload.rows);
        } catch {
          localStorage.removeItem(storageKey);
        }
      }
      setRestored(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  const validatedRows = useMemo(
    () =>
      rows.map((row) => {
        const value = row[3]?.trim();
        const status =
          value && value.toLowerCase() !== "not provided" ? "Pass" : "Missing";
        return [row[0], row[1], row[2], row[3], status];
      }),
    [rows],
  );
  const issueCount = validatedRows.filter((row) => row[4] !== "Pass").length;
  const passCount = validatedRows.length - issueCount;
  const categories = Array.from(new Set(validatedRows.map((row) => row[0])));
  const manualRecordRows = [
    "Style Name",
    "Department",
    "Colour",
    "Main material",
    "Vendor",
    "Total quantity",
  ]
    .map((field) => validatedRows.find((row) => row[1] === field))
    .filter((row): row is string[] => Boolean(row && visibleValue(row[3])));

  const updateValue = (field: string, value: string) => {
    setRows((current) =>
      current.map((row) =>
        row[1] === field ? [row[0], row[1], row[2], value, row[4]] : row,
      ),
    );
  };
  const saveCorrections = () => {
    saveLocalDraft(storageKey, { rows });
    notify("Final-review corrections saved locally.");
  };
  const applySuggestions = () => {
    setRows((current) =>
      current.map((row) =>
        suggestions[row[1]] &&
        (!row[3] || row[3].toLowerCase() === "not provided")
          ? [row[0], row[1], row[2], suggestions[row[1]], row[4]]
          : row,
      ),
    );
    setEditMode(true);
    notify("Suggested corrections applied. Review and save them.");
  };
  const continueToApproval = () => {
    if (issueCount > 0) {
      notify(
        `Resolve ${issueCount} validation issue${issueCount === 1 ? "" : "s"} first.`,
      );
      return;
    }
    saveCorrections();
    onContinue();
  };

  return (
    <>
      <div className="final-review-layout">
        <main className="final-review-main">
          <header className="final-review-heading">
            <div>
              <span className="eyebrow">
                {mode === "automation"
                  ? `Automated run · ${data.run.id}`
                  : "Manual workspace · Final check"}
              </span>
              <h1>Final review & correction</h1>
              <p>
                {mode === "manual"
                  ? "Check the values entered in each manual step and fix anything missing before approval."
                  : "Review every PLM object and correct exceptions before the record enters approval."}
              </p>
            </div>
            <button
              type="button"
              className={classNames(
                "edit-mode-toggle",
                editMode && "is-active",
              )}
              aria-pressed={editMode}
              onClick={() => setEditMode((current) => !current)}
            >
              <PencilSimple size={17} />
              {editMode ? "Editing enabled" : "Edit corrections"}
              <i aria-hidden="true" />
            </button>
          </header>

          <section className="review-summary-grid" aria-label="Review summary">
            <div>
              <strong>{validatedRows.length}</strong>
              <span>Fields reviewed</span>
            </div>
            <div className="is-positive">
              <strong>{passCount}</strong>
              <span>Validated</span>
            </div>
            <div className={issueCount ? "is-warning" : "is-positive"}>
              <strong>{issueCount}</strong>
              <span>Needs attention</span>
            </div>
            <div>
              <strong>{categories.length}</strong>
              <span>Review sections</span>
            </div>
          </section>

          <div
            className="review-table"
            role="table"
            aria-label="Source and PLM field comparison"
          >
            <div className="review-table-head" role="row">
              <span>Field</span>
              <span>Source value</span>
              <span>PLM value</span>
              <span>Validation</span>
              <span>Action</span>
            </div>
            {categories.map((category) => (
              <section className="review-category" key={category}>
                <div className="review-category-title">
                  <span>{category}</span>
                  <small>
                    {validatedRows.filter(
                      (row) => row[0] === category && row[4] !== "Pass",
                    ).length || "All"}{" "}
                    {validatedRows.some(
                      (row) => row[0] === category && row[4] !== "Pass",
                    )
                      ? "issues"
                      : "clear"}
                  </small>
                </div>
                {validatedRows
                  .filter((row) => row[0] === category)
                  .map((row) => (
                    <div
                      className={classNames(
                        "review-field-row",
                        row[4] !== "Pass" && "has-issue",
                      )}
                      role="row"
                      key={row[1]}
                    >
                      <strong>{row[1]}</strong>
                      <span
                        className={classNames(
                          row[2] === "Not provided" && "empty-value",
                        )}
                      >
                        {visibleValue(row[2])}
                      </span>
                      <span>
                        {editMode ? (
                          <input
                            aria-label={`PLM value for ${row[1]}`}
                            value={visibleValue(row[3])}
                            onChange={(event) =>
                              updateValue(row[1], event.target.value)
                            }
                          />
                        ) : (
                          <span
                            className={classNames(
                              row[3] === "Not provided" && "empty-value",
                            )}
                          >
                            {visibleValue(row[3])}
                          </span>
                        )}
                      </span>
                      <span
                        className={classNames(
                          "review-validation",
                          row[4].toLowerCase(),
                        )}
                      >
                        <StatusIcon kind={row[4]} size={16} />
                        {row[4]}
                      </span>
                      <button
                        type="button"
                        className="row-edit-button"
                        onClick={() => {
                          setEditMode(true);
                          if (suggestions[row[1]] && row[4] !== "Pass")
                            updateValue(row[1], suggestions[row[1]]);
                        }}
                      >
                        <PencilSimple size={15} />
                        {row[4] !== "Pass" && suggestions[row[1]]
                          ? "Fix"
                          : "Edit"}
                      </button>
                    </div>
                  ))}
              </section>
            ))}
          </div>
        </main>

        <aside className="final-review-panel">
          <div className="final-review-panel-scroll">
            {mode === "manual" ? (
              <section className="manual-review-record">
                <h2>Review values</h2>
                <div className="manual-record-list">
                  {manualRecordRows.map((row) => (
                    <div className="manual-record-row" key={row[1]}>
                      <strong>{row[1]}</strong>
                      <span>{visibleValue(row[3])}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <>
                <section>
                  <div className="panel-heading-row">
                    <h2>Review readiness</h2>
                    <span>{issueCount ? "Blocked" : "Ready"}</span>
                  </div>
                  <div className="review-readiness-list">
                    <div>
                      <CheckCircle size={18} weight="fill" />
                      <span>
                        <strong>Source comparison complete</strong>
                        <small>{validatedRows.length} fields reviewed</small>
                      </span>
                    </div>
                    <div>
                      <CheckCircle size={18} weight="fill" />
                      <span>
                        <strong>PLM values loaded</strong>
                        <small>{passCount} values currently valid</small>
                      </span>
                    </div>
                    <div className={issueCount ? "has-issue" : "is-clear"}>
                      <StatusIcon
                        kind={issueCount ? "Missing" : "Pass"}
                        size={18}
                      />
                      <span>
                        <strong>
                          {issueCount
                            ? `${issueCount} corrections required`
                            : "No blockers remain"}
                        </strong>
                        <small>
                          {issueCount
                            ? "Apply or enter corrections to continue"
                            : "Record can enter approval"}
                        </small>
                      </span>
                    </div>
                  </div>
                </section>

                <section>
                  <h2>Next stage</h2>
                  <div className="next-stage-card">
                    <span>6</span>
                    <div>
                      <strong>Approval & issue</strong>
                      <small>
                        Merchandiser, Sourcing, Accounts, Ready, then supplier
                        PO issue.
                      </small>
                    </div>
                    <ArrowRight size={18} />
                  </div>
                </section>

                <section>
                  <h2>Audit preview</h2>
                  <div className="compact-delivery-list">
                    {[
                      "Field corrections",
                      "Validation result",
                      "Source snapshot",
                    ].map((item) => (
                      <div key={item}>
                        <FileText size={17} />
                        <span>
                          <strong>{item}</strong>
                          <small>Included in final-review audit</small>
                        </span>
                        <em>Ready</em>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="review-data-source">
                  <h2>Data source</h2>
                  <dl>
                    <div>
                      <dt>Source file</dt>
                      <dd>{data.run.source}</dd>
                    </div>
                    <div>
                      <dt>Imported</dt>
                      <dd>{data.run.synced}</dd>
                    </div>
                    <div>
                      <dt>Last write</dt>
                      <dd>{data.run.synced}</dd>
                    </div>
                    <div>
                      <dt>Run ID</dt>
                      <dd>{data.run.id}</dd>
                    </div>
                  </dl>
                </section>
              </>
            )}
          </div>

          <section
            className={classNames(
              "review-panel-actions",
              mode === "manual" && "manual-review-actions",
            )}
          >
            <span>
              {mode === "manual" ? "Workspace actions" : "Review actions"}
            </span>
            {mode === "manual" ? (
              <>
                <button
                  className="ghost-link"
                  onClick={() =>
                    notify("Activity panel opened for this record.")
                  }
                >
                  View activity
                </button>
                <button className="secondary" onClick={saveCorrections}>
                  Save review
                </button>
                <button
                  className={classNames(
                    "primary",
                    issueCount > 0 && "disabled",
                  )}
                  aria-disabled={issueCount > 0}
                  onClick={continueToApproval}
                >
                  <ArrowRight size={18} />
                  {issueCount > 0
                    ? `Resolve ${issueCount} issues`
                    : "Continue to approval"}
                </button>
              </>
            ) : (
              <>
                {issueCount > 0 && (
                  <button className="suggest-button" onClick={applySuggestions}>
                    Apply suggested fixes
                  </button>
                )}
                <div>
                  <button className="secondary" onClick={saveCorrections}>
                    Save corrections
                  </button>
                  <button
                    className="secondary"
                    onClick={() => {
                      notify(
                        issueCount
                          ? `${issueCount} issues remain after validation.`
                          : "Validation passed. No field issues remain.",
                      );
                    }}
                  >
                    Re-run validation
                  </button>
                </div>
                <button
                  className={classNames(
                    "primary",
                    issueCount > 0 && "disabled",
                  )}
                  aria-disabled={issueCount > 0}
                  onClick={continueToApproval}
                >
                  <ArrowRight size={18} />
                  {issueCount > 0
                    ? `Resolve ${issueCount} issues`
                    : "Continue to approval"}
                </button>
              </>
            )}
            {mode === "automation" && (
              <button
                className="ghost-link"
                onClick={() => {
                  exportJson("automation-final-review-audit.json", {
                    mode,
                    fields: validatedRows,
                  });
                  notify("Final review audit downloaded.");
                }}
              >
                Export audit JSON
              </button>
            )}
          </section>
        </aside>
      </div>
      <ManualStatusBar
        ready={issueCount === 0}
        title={
          issueCount
            ? `Final review blocked · ${issueCount} issues`
            : "Final review complete · ready for approval"
        }
        subtitle={
          restored
            ? "Corrections are stored locally in this prototype."
            : "Loading saved corrections…"
        }
      />
    </>
  );
}

function ManualRail({
  phase,
  setPhase,
  completed,
  collapsed,
}: {
  phase: number;
  setPhase: (phase: number) => void;
  completed: number[];
  collapsed: boolean;
}) {
  return (
    <motion.aside
      layout="size"
      initial={false}
      transition={{ type: "spring", stiffness: 420, damping: 38 }}
      className={classNames(
        "phase-rail manual-rail",
        collapsed && "is-collapsed",
      )}
    >
      <div className="sidebar-heading">
        <span className="sidebar-mode-icon" title="Manual dashboard">
          <HandPalm size={20} weight="fill" />
        </span>
        <div className="sidebar-heading-copy">
          <span>Manual dashboard</span>
          <strong>Operator workspace</strong>
          <small>
            {completed.length} of {data.manual.phases.length} phases complete
          </small>
          <div className="sidebar-progress" aria-hidden="true">
            <i
              style={{
                width: `${(completed.length / data.manual.phases.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
      <nav>
        {data.manual.phases.map((item) => {
          const status =
            item.id === phase
              ? "active"
              : completed.includes(item.id)
                ? "complete"
                : phase >= 5 && [1, 4].includes(item.id)
                  ? "blocked"
                  : phase >= 5 && item.id === 2
                    ? "warning"
                    : "waiting";
          return (
            <button
              key={item.id}
              aria-current={status === "active" ? "step" : undefined}
              onClick={() => setPhase(item.id)}
              className={classNames(
                "phase-item",
                status === "active" && "is-active",
              )}
            >
              <span className={classNames("phase-number", status)}>
                {item.id}
              </span>
              <span>
                <strong>{item.short}</strong>
                <small className={status}>
                  {status === "complete"
                    ? "Complete"
                    : status === "active"
                      ? "Active"
                      : status === "blocked"
                        ? "Blocked"
                        : status === "warning"
                          ? "Warning"
                          : "Waiting"}
                </small>
              </span>
            </button>
          );
        })}
      </nav>
    </motion.aside>
  );
}

function ManualHeading({ phase }: { phase: number }) {
  const item = data.manual.phases[phase - 1];
  return (
    <div className="screen-heading manual-heading">
      <h1>{item.title}</h1>
      <p>{item.subtitle}</p>
    </div>
  );
}

function ManualField({
  label,
  value,
  calendar = false,
  onValueChange,
}: {
  label: string;
  value: string;
  calendar?: boolean;
  onValueChange?: (value: string) => void;
}) {
  const storageKey = manualStorageKey(label);
  const [current, setCurrent] = useState(visibleValue(value));
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        setCurrent(visibleValue(saved));
        window.dispatchEvent(new CustomEvent("plm-field-change"));
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);
  const update = (next: string) => {
    setCurrent(next);
    localStorage.setItem(storageKey, next);
    onValueChange?.(next);
    window.dispatchEvent(new CustomEvent("plm-field-change"));
  };
  const optionsByLabel: Record<string, string[]> = {
    Department: ["Menswear", "Womenswear", "Kidswear"],
    "Brand / Division": ["Zudio", "Westside", "Utsa"],
    "Product Type": ["T-Shirt", "Shirt", "Polo"],
    "Style Type": ["Fashion", "Core", "Seasonal"],
    Template: ["Menswear Tee", "Core Knit", "Seasonal Fashion"],
    "Style Name": ["AW26 Checked T-Shirt", "AW26 Core Tee"],
    "Size Range": ["XS–XXL", "S–XL", "XS–3XL"],
    Strategy: ["FASHION", "CORE", "SEASONAL"],
    "Buy Type": ["Domestic", "Import"],
    "Fit Type": ["Regular", "Slim", "Relaxed"],
    "Story Name": ["Modern Utility", "Weekend Casual"],
    "Garment Design": ["Crew Neck", "Polo", "Henley"],
    "Garment Length": ["Regular", "Longline", "Cropped"],
    "Store Grade": ["A", "B", "C"],
    "Fixture Type": ["Wall", "Table", "Rack"],
    DROP: ["Drop 1", "Drop 2", "Drop 3"],
    Month: ["November", "December", "January"],
    "Ratio template": ["Core Menswear 1:2:3:3:2:1", "Balanced 1:1:2:2:1:1"],
    "Holiday calendar": ["India Domestic FY26", "No holiday override"],
    "Critical path": ["Approved same-day handoff", "Standard 48-hour handoff"],
    "Supplier-code mapping": [
      "Supplier ID 11301069",
      "Vendor code NZS-001",
      "Quote code SQ-001",
    ],
  };
  const choices = optionsByLabel[label];
  const missing = isMissingValue(current);
  return (
    <label className="manual-field">
      <span>{label}</span>
      <div className={classNames("manual-control", missing && "missing")}>
        {choices ? (
          <select
            value={current}
            onChange={(event) => update(event.target.value)}
          >
            {missing && <option value=""> </option>}
            {choices.map((choice) => (
              <option value={choice} key={choice}>
                {choice}
              </option>
            ))}
          </select>
        ) : (
          <input
            aria-label={label}
            value={visibleValue(current)}
            onChange={(event) => update(event.target.value)}
          />
        )}
        {calendar ? (
          <CalendarBlank size={17} />
        ) : choices ? (
          <CaretDown size={14} />
        ) : null}
      </div>
    </label>
  );
}

function ManualStyle({
  notify,
  onComplete,
}: {
  notify: (text: string) => void;
  onComplete: () => void;
}) {
  useManualFieldVersion();
  const requiredLabels = [
    "Department",
    "Brand / Division",
    "Product Type",
    "Style Type",
    "Template",
    "Style Name",
    "Size Range",
  ];
  const missingLabels = requiredLabels.filter((label) => {
    const value = readManualField(label, "Required from Excel");
    return !value || value === "Required from Excel";
  });
  const ready = missingLabels.length === 0;
  return (
    <>
      <div className="content-with-panel">
        <main className="workspace manual-workspace">
          <ManualHeading phase={1} />
          <div className="preflight-line">
            <strong>Source preflight</strong>
            <span>· 1 row loaded</span>
            <span className="blocker-pill">
              {ready ? (
                <CheckCircle size={16} weight="fill" />
              ) : (
                <Warning size={16} />
              )}
              {missingLabels.length} blockers
            </span>
          </div>
          <section className="manual-section">
            <h3>Hierarchy resolver</h3>
            <div className="style-intake-grid">
              <div className="field-grid">
                {data.manual.hierarchyFields.map(([label, value]) => (
                  <ManualField key={label} label={label} value={value} />
                ))}
              </div>
              <div className="style-image">
                <h3>Style image</h3>
                <div>
                  <TShirt size={54} />
                  <strong>No image supplied</strong>
                  <span>Add after source is complete</span>
                </div>
              </div>
            </div>
          </section>
          <section className="manual-section">
            <h3>Size range & source quantities</h3>
            <ManualField label="Size Range" value="Required from Excel" />
            <div className="size-source-grid">
              {data.manual.sizes.map((size) => (
                <div key={size}>
                  <strong>{size}</strong>
                  <span>0</span>
                </div>
              ))}
            </div>
            <p className="manual-warning">
              <Warning size={15} />
              All source size quantities are 0; Total Qty 15,511 will require an
              approved ratio in SKU planning.
            </p>
          </section>
          <section className="manual-section">
            <h3>Core properties</h3>
            <div className="core-grid">
              {data.manual.coreProperties.map(([label, value]) => (
                <ManualField key={label} label={label} value={value} />
              ))}
            </div>
          </section>
          <div className="manual-bottom-grid">
            <div className="duplicate-card">
              <MagnifyingGlass size={28} />
              <div>
                <h3>Duplicate search</h3>
                <strong>{ready ? "Exact-match complete" : "Not run"}</strong>
                <p>
                  {ready
                    ? "No duplicate style found"
                    : "Waiting for hierarchy and Style Name"}
                </p>
              </div>
            </div>
            <div className="run-checklist">
              <h3>Creation checklist</h3>
              {[
                "Resolve hierarchy",
                "Find existing",
                "Create",
                "Reopen",
                "Verify",
              ].map((item, i) => (
                <p key={item}>
                  <span>{i + 1}</span>
                  {item}
                  <em>{ready ? "Ready" : i === 0 ? "Blocked" : "Waiting"}</em>
                </p>
              ))}
            </div>
          </div>
        </main>
        <SourcePanel
          title="Style values"
          rows={[
            ["Season", data.run.season],
            ...requiredLabels.map((label) => [label, readManualField(label)]),
            ...data.manual.coreProperties.map(([label, value]) => [
              label,
              readManualField(label, value),
            ]),
          ]}
          actions={
            <>
              <button
                className="ghost-link"
                onClick={() => {
                  exportJson("style-intake-activity.json", {
                    requiredLabels,
                    missingLabels,
                    values: Object.fromEntries(
                      requiredLabels.map((label) => [
                        label,
                        readManualField(label),
                      ]),
                    ),
                  });
                  notify("Style activity exported.");
                }}
              >
                View activity
              </button>
              <button
                className="secondary"
                onClick={() => {
                  saveLocalDraft(
                    "plm-manual-style-draft",
                    Object.fromEntries(
                      requiredLabels.map((label) => [
                        label,
                        readManualField(label),
                      ]),
                    ),
                  );
                  notify("Manual style draft saved locally.");
                }}
              >
                Save draft
              </button>
              <button
                className={classNames("primary", !ready && "disabled")}
                aria-disabled={!ready}
                onClick={() =>
                  ready
                    ? onComplete()
                    : notify(
                        `Complete ${missingLabels.join(", ")} to continue.`,
                      )
                }
              >
                {ready ? <Check size={18} /> : <Lock size={18} />}
                Create style & continue
              </button>
            </>
          }
        />
      </div>
      <ManualStatusBar
        ready={ready}
        title={
          ready
            ? "Validation complete · style can be created"
            : `Validation summary · ${missingLabels.length} blockers`
        }
        subtitle={
          ready
            ? "Hierarchy resolved and duplicate search completed."
            : `Missing ${missingLabels.join(", ")}.`
        }
      />
    </>
  );
}

function ManualColor({
  notify,
  onComplete,
}: {
  notify: (text: string) => void;
  onComplete: () => void;
}) {
  useManualFieldVersion();
  const [addToBom, setAddToBom] = useState(true);
  const [mainMaterial, setMainMaterial] = useState(true);
  const missingFields = data.manual.colorFields.filter(
    (label) =>
      readManualField(label, "Required from Excel") === "Required from Excel",
  );
  const ready = missingFields.length === 0 && addToBom && mainMaterial;
  return (
    <>
      <div className="content-with-panel">
        <main className="workspace manual-workspace">
          <ManualHeading phase={2} />
          <section className="manual-section color-definition">
            <h2>Color definition</h2>
            <div className="color-top-grid">
              <ManualField label="Color Combo" value="BLACK" />
              <ManualField label="Colorway Selection" value="BLACK" />
              <ManualField label="Pantone" value="Not provided" />
              <label className="toggle-field">
                <span>Add to BOM</span>
                <button
                  aria-label="Add color to BOM"
                  aria-pressed={addToBom}
                  onClick={() => setAddToBom((current) => !current)}
                  className={classNames("toggle", addToBom && "on")}
                >
                  <span />
                </button>
              </label>
              <ManualField label="MRP" value="₹999" />
            </div>
            <div className="color-field-grid">
              {data.manual.colorFields.map((label) => (
                <ManualField
                  key={label}
                  label={label}
                  value="Required from Excel"
                />
              ))}
            </div>
          </section>
          <section className="manual-section">
            <div className="bom-title">
              <h2>Style BOM</h2>
              <nav>
                <span>Specification</span>
                <b>BOM</b>
                <span>Placements</span>
              </nav>
            </div>
            <table className="manual-table bom-table">
              <thead>
                <tr>
                  <th>Placement</th>
                  <th>BOM Section</th>
                  <th>Material / Description</th>
                  <th>Main Material</th>
                  <th>UOM</th>
                  <th>Quantity</th>
                  <th>Color Applicability</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.manual.bomRows.map((row, i) => (
                  <tr key={row[0]}>
                    {row.map((cell, j) => (
                      <td
                        className={
                          cell === "Required from Excel" ? "warning-text" : ""
                        }
                        key={j}
                      >
                        {j === 3 && i === 0 ? (
                          <button
                            aria-label="Set as main material"
                            aria-pressed={mainMaterial}
                            onClick={() =>
                              setMainMaterial((current) => !current)
                            }
                            className={classNames(
                              "toggle",
                              mainMaterial && "on",
                            )}
                          >
                            <span />
                          </button>
                        ) : (
                          visibleValue(cell)
                        )}
                      </td>
                    ))}
                    <td>
                      <DotsThreeVertical />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <div className="manual-bottom-grid">
            <div className="enum-card">
              <ShieldCheck size={52} />
              <div>
                <h3>Active PLM enum validation</h3>
                <p>
                  <WarningCircle />
                  {ready
                    ? "All source values resolved — active keys validated."
                    : `${missingFields.length} source values missing — active-key resolution paused.`}
                </p>
              </div>
              <span>Live lookup</span>
            </div>
            <div className="automation-log">
              <h3>Validation activity — 16 Jul 2026</h3>
              {data.manual.automationLog.map(([item, status]) => (
                <p key={item}>
                  <StatusIcon kind={status === "Done" ? "complete" : status} />
                  {item}
                  <span>{status}</span>
                </p>
              ))}
            </div>
          </div>
        </main>
        <SourcePanel
          title="Color & BOM values"
          rows={[
            ["Colour", "BLACK"],
            ["Material", "FKn01144"],
            ["MRP", "₹999"],
            ["Pantone", readManualField("Pantone")],
            ...data.manual.colorFields.map((label) => [
              label,
              readManualField(label),
            ]),
          ]}
          actions={
            <>
              <button
                className="ghost-link"
                onClick={() => {
                  exportJson("color-bom-activity.json", {
                    addToBom,
                    mainMaterial,
                    missingFields,
                  });
                  notify("Color and BOM activity exported.");
                }}
              >
                View activity
              </button>
              <button
                className="secondary"
                onClick={() => {
                  saveLocalDraft("plm-manual-color-draft", {
                    addToBom,
                    mainMaterial,
                    fields: Object.fromEntries(
                      data.manual.colorFields.map((label) => [
                        label,
                        readManualField(label),
                      ]),
                    ),
                  });
                  notify("Product definition draft saved locally.");
                }}
              >
                Save draft
              </button>
              <button
                className={classNames("primary", !ready && "disabled")}
                aria-disabled={!ready}
                onClick={() =>
                  ready
                    ? onComplete()
                    : notify(
                        `Complete ${missingFields.join(", ")} and keep BOM toggles enabled.`,
                      )
                }
              >
                Save product definition
              </button>
            </>
          }
        />
      </div>
      <ManualStatusBar
        ready={ready}
        title={
          ready
            ? "Product definition ready to sync"
            : `${missingFields.length} source values · Product definition cannot sync`
        }
      />
    </>
  );
}

function ManualSupplier({
  notify,
  onComplete,
}: {
  notify: (text: string) => void;
  onComplete: () => void;
}) {
  useManualFieldVersion();
  const supplierMapping = readManualField(
    "Supplier-code mapping",
    "Confirmation required",
  );
  const ready = supplierMapping !== "Confirmation required";
  return (
    <>
      <div className="content-with-panel">
        <main className="workspace manual-workspace">
          <ManualHeading phase={3} />
          <div className="issued-tags">
            <span>Request SR-001 · Issued</span>
            <span>Quote SQ-001 · Draft</span>
          </div>
          <div className="supplier-grid">
            <section>
              <h2>Supplier request</h2>
              <p>
                <strong>11301069 · NZ SEASONAL WEAR PRIVATE LIMITED</strong>
              </p>
              <p>Domestic</p>
              <p>Silver Seal Request Template</p>
              <h3 className="panel-section-title">Attached package</h3>
              <div className="package-list">
                {data.manual.package.map(([a, b]) => (
                  <p key={a}>
                    <CheckCircle size={20} weight="fill" />
                    <strong>{a}</strong>
                    <span>{visibleValue(b)}</span>
                  </p>
                ))}
              </div>
              <h3 className="panel-section-title">Request activity</h3>
              <div className="manual-timeline">
                {data.manual.requestTimeline.map(([time, item]) => (
                  <p key={time}>
                    <CheckCircle size={20} weight="fill" />
                    <b>{time}</b>
                    <span>{item}</span>
                  </p>
                ))}
              </div>
              <button
                className="text-button"
                onClick={() => {
                  exportJson("supplier-commercial-activity.json", {
                    timeline: data.manual.requestTimeline,
                    mapping: supplierMapping,
                  });
                  notify("Supplier activity exported.");
                }}
              >
                View activity
              </button>
            </section>
            <section>
              <h2>Supplier quote</h2>
              <div className="quote-fields">
                {data.manual.quoteFields.map(([label, value]) => (
                  <ManualField key={label} label={label} value={value} />
                ))}
              </div>
              <div className="quote-stats">
                <Stat value="₹100" label="Cost" />
                <Stat value="₹999" label="MRP" />
                <Stat value="₹899" label="MRP - cost" />
                <Stat value="10.0%" label="Cost / MRP" />
              </div>
              <div className="approval-readiness">
                <h3>Approval readiness</h3>
                {data.manual.approvalChecks.map((item, i) => (
                  <p className={i === 4 ? "warning-text" : ""} key={item}>
                    <StatusIcon
                      kind={i === 4 ? "Warning" : "complete"}
                      size={16}
                    />
                    {item}
                    {i === 4 && <span>4 checks passed · 1 blocker</span>}
                  </p>
                ))}
              </div>
            </section>
          </div>
        </main>
        <SourcePanel
          title="Supplier values"
          rows={[
            ...data.sourceRecord.filter(([label]) =>
              [
                "Vendor",
                "Cost",
                "MRP",
                "HSN",
                "Vendor Type",
                "Supplier Request Template",
              ].includes(label),
            ),
            ["Supplier-code mapping", supplierMapping],
          ]}
          actions={
            <>
              <button
                className="secondary"
                onClick={() => {
                  saveLocalDraft("plm-manual-supplier-draft", {
                    mapping: supplierMapping,
                    quote: data.manual.quoteFields,
                  });
                  notify("Supplier quote draft saved locally.");
                }}
              >
                Save draft
              </button>
              <button
                className={classNames("primary", !ready && "disabled")}
                aria-disabled={!ready}
                onClick={() =>
                  ready
                    ? onComplete()
                    : notify(
                        "Confirm supplier-code mapping to enable approval.",
                      )
                }
              >
                Approve supplier quote
              </button>
            </>
          }
        />
      </div>
      <ManualStatusBar
        ready={ready}
        title={
          ready
            ? "Supplier quote ready for approval"
            : "Approval blocked · Supplier-code mapping confirmation required"
        }
        subtitle={
          ready
            ? `Mapped using ${supplierMapping}.`
            : "All other supplier request and quote validations passed."
        }
      />
    </>
  );
}

function ManualSku({
  notify,
  onComplete,
}: {
  notify: (text: string) => void;
  onComplete: () => void;
}) {
  useManualFieldVersion();
  const ratioTemplate = readManualField(
    "Ratio template",
    "Required from Excel",
  );
  const holidayCalendar = readManualField(
    "Holiday calendar",
    "Required from Excel",
  );
  const criticalPath = readManualField("Critical path", "Required from Excel");
  const ratioReady = ratioTemplate !== "Required from Excel";
  const ready =
    ratioReady &&
    holidayCalendar !== "Required from Excel" &&
    criticalPath !== "Required from Excel";
  const ratios = [1, 2, 3, 3, 2, 1];
  const planned = [1293, 2585, 3878, 3878, 2585, 1292];
  return (
    <>
      <div className="content-with-panel">
        <main className="workspace manual-workspace">
          <ManualHeading phase={4} />
          <div className="sku-grid">
            <section>
              <div className="section-row">
                <h2>BLACK size matrix</h2>
                <strong>Total Qty 15,511</strong>
              </div>
              <ManualField label="Ratio template" value="Required from Excel" />
              <table className="manual-table size-table">
                <thead>
                  <tr>
                    <th>Size</th>
                    <th>Excel qty</th>
                    <th>Ratio</th>
                    <th>Planned qty</th>
                  </tr>
                </thead>
                <tbody>
                  {data.manual.sizes.map((size, index) => (
                    <tr key={size}>
                      <td>{size}</td>
                      <td>0</td>
                      <td className={ratioReady ? "" : "warning-text"}>
                        {ratioReady ? ratios[index] : "Ratio required"}
                      </td>
                      <td className={ratioReady ? "" : "warning-text"}>
                        {ratioReady
                          ? planned[index].toLocaleString("en-IN")
                          : "Ratio required"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3>Batch enrichment</h3>
              <div className="batch-list">
                <p>
                  <CheckCircle />
                  Approved Supplier Quote <span>Approved</span>
                </p>
                <p>
                  <CheckCircle />
                  Loaded Main Material <span>FKn01144</span>
                </p>
              </div>
              <p className="success-copy">
                <CheckCircle />6 SKUs ready for ratio
              </p>
            </section>
            <section>
              <h2>PO planning</h2>
              <div className="po-fields">
                {data.manual.poFields.map(([label, value], i) => (
                  <ManualField
                    key={label}
                    label={label}
                    value={value}
                    calendar={i >= 3 && i <= 5}
                  />
                ))}
              </div>
            </section>
          </div>
          <div className="reconcile-bar">
            <Stat value="15,511" label="Excel total" />
            <Stat
              value={ratioReady ? "15,511" : "Pending ratio"}
              label="Matrix total"
              tone={ratioReady ? "good" : "warn"}
            />
            <Stat value="15,511" label="PO total" />
            <span>
              {ratioReady ? (
                <CheckCircle size={28} weight="fill" />
              ) : (
                <Warning size={28} weight="fill" />
              )}
              {ratioReady ? "Reconciled" : "Not reconciled"}
            </span>
          </div>
          <div className={classNames("inline-alert", ready && "is-success")}>
            {ready ? (
              <CheckCircle size={28} weight="fill" />
            ) : (
              <Warning size={28} weight="fill" />
            )}
            {ready
              ? "Same-day handoff approved against the selected critical path."
              : "Same-day ex-factory and shipment requires critical-path approval."}
          </div>
        </main>
        <SourcePanel
          title="SKU & PO values"
          rows={[
            ...data.sourceRecord.filter(([label]) =>
              [
                "Total Qty",
                "Ex-factory",
                "Shipment",
                "Launch",
                "Vendor Type",
              ].includes(label),
            ),
            ["Ratio template", ratioTemplate],
            ["Holiday calendar", holidayCalendar],
            ["Critical path", criticalPath],
          ]}
          actions={
            <>
              <button
                className="ghost-link"
                onClick={() => {
                  exportJson("sku-po-planning.json", {
                    ratioTemplate,
                    ratios,
                    planned,
                    holidayCalendar,
                    criticalPath,
                  });
                  notify("SKU and PO plan exported.");
                }}
              >
                View activity
              </button>
              <button
                className="secondary"
                onClick={() => {
                  saveLocalDraft("plm-manual-sku-draft", {
                    ratioTemplate,
                    ratios,
                    planned,
                    holidayCalendar,
                    criticalPath,
                  });
                  notify("SKU and PO draft saved locally.");
                }}
              >
                Save draft
              </button>
              <button
                className={classNames("primary", !ready && "disabled")}
                aria-disabled={!ready}
                onClick={() =>
                  ready
                    ? onComplete()
                    : notify(
                        "Select the ratio template, holiday calendar, and critical path to continue.",
                      )
                }
              >
                Create PO & validate
              </button>
            </>
          }
        />
      </div>
      <ManualStatusBar
        ready={ready}
        title={
          ready
            ? "SKU matrix and PO plan validated"
            : "Validation summary · required planning inputs missing"
        }
        subtitle={
          ready
            ? "The size matrix reconciles to 15,511 and the critical path is approved."
            : "Select a ratio template, holiday calendar, and critical path."
        }
      />
    </>
  );
}

function ManualApproval({
  setPhase,
  notify,
  completed,
}: {
  setPhase: (phase: number) => void;
  notify: (text: string) => void;
  completed: number[];
}) {
  const [approvalIndex, setApprovalIndex] = useState(0);
  const [issued, setIssued] = useState(false);
  const requiredPhases = [1, 2, 3, 4, 5];
  const ready = requiredPhases.every((phase) => completed.includes(phase));
  const pendingPhases = requiredPhases.filter(
    (phase) => !completed.includes(phase),
  );
  const approveNext = () => {
    if (!ready) {
      notify(
        `Complete manual phase${pendingPhases.length === 1 ? "" : "s"} ${pendingPhases.join(", ")} first.`,
      );
      return;
    }
    if (approvalIndex < data.manual.manualApprovals.length) {
      const role = data.manual.manualApprovals[approvalIndex][0];
      setApprovalIndex((current) => current + 1);
      notify(`${role} approval completed.`);
      return;
    }
    setIssued(true);
    exportJson("supplier-po-issued.json", {
      po: "SPO-R001",
      issuedAt: new Date().toISOString(),
      approvals: data.manual.manualApprovals.map(([role]) => role),
    });
    notify("Supplier PO issued and confirmation downloaded.");
  };
  return (
    <>
      <div className="content-with-panel">
        <main className="workspace manual-workspace manual-approval-workspace">
          <ManualHeading phase={6} />
          <div className="preflight-card">
            <header>
              <strong>
                {ready ? (
                  <CheckCircle size={20} weight="fill" />
                ) : (
                  <Warning size={20} weight="fill" />
                )}
                {pendingPhases.length} blockers{" "}
                {ready ? "· preflight passed" : "· complete upstream phases"}
              </strong>
              <span>Last checked 16 Jul 2026, 14:32</span>
            </header>
            {data.manual.preflight.map((row, i) => {
              const rowPhase = i === 0 ? 1 : i === 1 ? 2 : i === 2 ? 3 : 4;
              const rowComplete = completed.includes(rowPhase);
              return (
                <div
                  key={row[0]}
                  className={classNames(
                    "preflight-row",
                    rowComplete ? "complete" : row[4],
                  )}
                >
                  <StatusIcon
                    kind={rowComplete ? "complete" : row[4]}
                    size={24}
                  />
                  <strong>{row[0]}</strong>
                  <span>
                    <b>{rowComplete ? "Validated" : row[1]}</b>
                    <small>
                      {rowComplete
                        ? "Manual phase completed and saved"
                        : row[2]}
                    </small>
                  </span>
                  {row[3] && !rowComplete && (
                    <button
                      onClick={() => setPhase(i === 0 ? 1 : i === 1 ? 2 : 4)}
                    >
                      {row[3]}
                    </button>
                  )}
                </div>
              );
            })}
            <div
              className={classNames(
                "preflight-row",
                completed.includes(5) ? "complete" : "blocked",
              )}
            >
              <StatusIcon
                kind={completed.includes(5) ? "complete" : "Blocked"}
                size={24}
              />
              <strong>Final review</strong>
              <span>
                <b>
                  {completed.includes(5)
                    ? "Corrections validated"
                    : "Final review not completed"}
                </b>
                <small>
                  {completed.includes(5)
                    ? "Source and PLM values are ready for approval"
                    : "Review all values and clear correction blockers"}
                </small>
              </span>
              {!completed.includes(5) && (
                <button onClick={() => setPhase(5)}>Open final review</button>
              )}
            </div>
          </div>
          <section className="manual-approval-route">
            <h2>Approval route</h2>
            <div>
              {data.manual.manualApprovals.map(([role], i) => {
                const state =
                  i < approvalIndex
                    ? "Approved"
                    : i === approvalIndex && ready
                      ? "Pending"
                      : "Waiting";
                return (
                  <button
                    type="button"
                    className={classNames(
                      "manual-approval-step",
                      state.toLowerCase(),
                    )}
                    onClick={() => i === approvalIndex && approveNext()}
                    key={role}
                  >
                    <span>{i + 1}</span>
                    <strong>{role}</strong>
                    <small>{state}</small>
                    <em>
                      {state === "Approved"
                        ? "Completed"
                        : i < 3
                          ? "Owner —"
                          : "Not started"}
                    </em>
                  </button>
                );
              })}
            </div>
          </section>
          <div className="approval-bottom-grid">
            <section>
              <h3>Exception inbox</h3>
              {data.manual.exceptions.map(([exception, workspace], i) => (
                <p key={exception}>
                  <StatusIcon
                    kind={i === 2 ? "Warning" : "Blocked"}
                    size={17}
                  />
                  <strong>{exception}</strong>
                  <span>{workspace}</span>
                  <button onClick={() => setPhase(i === 0 ? 1 : 4)}>
                    Change
                  </button>
                </p>
              ))}
            </section>
            <section>
              <h3>Documents & delivery</h3>
              {data.manual.documents.map(([doc, state]) => (
                <p key={doc}>
                  <FileText size={16} />
                  <strong>{doc}</strong>
                  <span>{state}</span>
                </p>
              ))}
              <button
                className="text-button"
                onClick={() => {
                  exportJson("manual-audit-trail.json", {
                    completed,
                    approvalIndex,
                    issued,
                    events: data.manual.documents,
                  });
                  notify("Audit trail exported.");
                }}
              >
                View audit trail
              </button>
            </section>
          </div>
        </main>
        <aside className="context-panel executive-panel manual-context-panel">
          <div className="context-scroll">
            <h2>Executive order summary</h2>
            <dl>
              {data.sourceRecord
                .filter(([label]) => label !== "Supplier Request Template")
                .map(([a, b]) => (
                  <div key={a}>
                    <dt>{a}</dt>
                    <dd>{b}</dd>
                  </div>
                ))}
            </dl>
          </div>
          <section className="manual-panel-actions">
            <span>Workspace actions</span>
            <button className="secondary" onClick={() => setPhase(5)}>
              Back to final review
            </button>
            <button
              className="secondary"
              onClick={() => {
                saveLocalDraft("plm-manual-approval-draft", {
                  completed,
                  approvalIndex,
                  issued,
                });
                notify("Approval draft saved locally.");
              }}
            >
              Save draft
            </button>
            <button
              className={classNames(
                "primary",
                (!ready || issued) && "disabled",
              )}
              aria-disabled={!ready || issued}
              onClick={approveNext}
            >
              {issued
                ? "Supplier PO issued"
                : approvalIndex < 5
                  ? `Approve ${data.manual.manualApprovals[approvalIndex][0]}`
                  : "Issue supplier PO"}
            </button>
          </section>
        </aside>
      </div>
      <ManualStatusBar
        ready={ready}
        title={
          issued
            ? "Supplier PO issued successfully"
            : ready
              ? `${approvalIndex}/5 approvals completed`
              : `Preflight blocked · ${pendingPhases.length} phases incomplete`
        }
        subtitle={
          issued
            ? "SPO-R001 is ready for downstream delivery."
            : ready
              ? "Complete the approval route, then issue the supplier PO."
              : "Resolve upstream exceptions before approval routing can begin."
        }
      />
    </>
  );
}

function ManualProcess({
  notify,
  sidebarCollapsed,
}: {
  notify: (text: string) => void;
  sidebarCollapsed: boolean;
}) {
  const [phase, setPhase] = useState(1);
  const [completed, setCompleted] = useState<number[]>([]);
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem("plm-manual-progress");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setCompleted(Array.isArray(parsed.completed) ? parsed.completed : []);
          if (typeof parsed.phase === "number") setPhase(parsed.phase);
        } catch {
          localStorage.removeItem("plm-manual-progress");
        }
      }
      setRestored(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (restored) {
      localStorage.setItem(
        "plm-manual-progress",
        JSON.stringify({ phase, completed }),
      );
    }
  }, [phase, completed, restored]);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(".dashboard-manual .workspace")
        ?.scrollTo({ top: 0, behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [phase]);
  const completePhase = (current: number) => {
    setCompleted((items) =>
      items.includes(current) ? items : [...items, current],
    );
    setPhase(Math.min(data.manual.phases.length, current + 1));
    notify(`${data.manual.phases[current - 1].short} completed.`);
  };
  return (
    <>
      <div className="app-body">
        <ManualRail
          phase={phase}
          setPhase={setPhase}
          completed={completed}
          collapsed={sidebarCollapsed}
        />
        <div className="page-stack">
          {phase === 1 && (
            <ManualStyle notify={notify} onComplete={() => completePhase(1)} />
          )}{" "}
          {phase === 2 && (
            <ManualColor notify={notify} onComplete={() => completePhase(2)} />
          )}{" "}
          {phase === 3 && (
            <ManualSupplier
              notify={notify}
              onComplete={() => completePhase(3)}
            />
          )}{" "}
          {phase === 4 && (
            <ManualSku notify={notify} onComplete={() => completePhase(4)} />
          )}{" "}
          {phase === 5 && (
            <FinalReview
              mode="manual"
              notify={notify}
              onContinue={() => completePhase(5)}
            />
          )}
          {phase === 6 && (
            <ManualApproval
              setPhase={setPhase}
              notify={notify}
              completed={completed}
            />
          )}
        </div>
      </div>
    </>
  );
}

function ActionBar({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <ManualStatusBar
      ready={icon === "safe"}
      title={title}
      subtitle={subtitle}
    />
  );
}

export default function Home() {
  const [phase, setPhase] = useState(1);
  const [mode, setMode] = useState<"automation" | "manual">("automation");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState("");
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem("plm-prototype-state");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const state = parsed.payload ?? parsed;
          if (state.mode === "automation" || state.mode === "manual")
            setMode(state.mode);
          if (typeof state.sidebarCollapsed === "boolean")
            setSidebarCollapsed(state.sidebarCollapsed);
          if (typeof state.phase === "number")
            setPhase(Math.min(data.phases.length, Math.max(1, state.phase)));
        } catch {
          localStorage.removeItem("plm-prototype-state");
        }
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (hydrated)
      saveLocalDraft("plm-prototype-state", {
        mode,
        phase,
        sidebarCollapsed,
      });
  }, [hydrated, mode, phase, sidebarCollapsed]);
  const notify = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(""), 2600);
  };
  return (
    <MotionConfig reducedMotion="user">
      <div
        className={classNames(
          "app-shell",
          `dashboard-${mode}`,
          sidebarCollapsed && "sidebar-collapsed",
        )}
      >
        <Header
          mode={mode}
          setMode={setMode}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          notify={notify}
        />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            className="dashboard-stage"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {mode === "automation" ? (
              <>
                <OperationStrip phase={phase} />
                <div className="app-body">
                  <PhaseRail
                    phase={phase}
                    setPhase={setPhase}
                    collapsed={sidebarCollapsed}
                  />
                  <div className="page-stack">
                    {phase === 1 && (
                      <ImportMap
                        notify={notify}
                        onComplete={() => setPhase(2)}
                      />
                    )}{" "}
                    {phase === 2 && (
                      <Plan setPhase={setPhase} notify={notify} />
                    )}{" "}
                    {phase === 3 && (
                      <Execute notify={notify} onComplete={() => setPhase(4)} />
                    )}{" "}
                    {phase === 4 && (
                      <Resolve notify={notify} onComplete={() => setPhase(5)} />
                    )}{" "}
                    {phase === 5 && (
                      <FinalReview
                        mode="automation"
                        notify={notify}
                        onContinue={() => setPhase(6)}
                      />
                    )}
                    {phase === 6 && (
                      <Review
                        notify={notify}
                        onBackToReview={() => setPhase(5)}
                      />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <ManualProcess
                notify={notify}
                sidebarCollapsed={sidebarCollapsed}
              />
            )}
          </motion.div>
        </AnimatePresence>
        <div className="toast-region" aria-live="polite" aria-atomic="true">
          {toast && (
            <div className="toast">
              <Info size={19} />
              {toast}
            </div>
          )}
        </div>
      </div>
    </MotionConfig>
  );
}
