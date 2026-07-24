"use client";

import {
  Bell,
  CaretDown,
  CaretRight,
  CheckCircle,
  FloppyDisk,
  List,
  MagnifyingGlass,
  SignOut,
  Trash,
  X,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { ConfirmAction } from "./ConfirmAction";
import { ThemeToggle } from "./ThemeToggle";
import { useAdminSearch } from "./AdminSearchContext";
import { useRecordHeader } from "./RecordHeaderContext";

type GlobalNavbarProps = {
  role: Role;
  userName: string;
  attentionCount: number;
  onOpenNavigation?: () => void;
};

const SECTION_TITLES: Array<[string, string]> = [
  ["/styles", "Styles"],
  ["/color-combos", "Colourways"],
  ["/boms", "BOM library"],
  ["/sourcing", "Sourcing"],
  ["/supplier-requests", "Sourcing"],
  ["/supplier-quotes", "Sourcing"],
  ["/purchase-orders", "Purchase orders"],
  ["/all/process", "Seasons"],
];

function sectionTitle(pathname: string, role: Role) {
  for (const [href, label] of SECTION_TITLES) {
    if (pathname === href || pathname.startsWith(`${href}/`)) return label;
  }
  if (pathname === `/${role}`) return "Overview";
  return "Overview";
}

export function GlobalNavbar({
  role,
  userName,
  attentionCount,
  onOpenNavigation,
}: GlobalNavbarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [pastNavbar, setPastNavbar] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const pathname = usePathname();
  const profileRef = useRef<HTMLDivElement>(null);
  const revealTimerRef = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();
  const { query: adminQuery, setQuery: setAdminQuery } = useAdminSearch();

  const cancelScheduledReveal = () => {
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  };

  const revealNavbar = () => {
    cancelScheduledReveal();
    setRevealed(true);
  };

  const scheduleHoverReveal = () => {
    cancelScheduledReveal();
    revealTimerRef.current = window.setTimeout(revealNavbar, 180);
  };

  useEffect(() => {
    const handleScroll = () => {
      const hasPassedNavbar = window.scrollY > 56;
      setPastNavbar(hasPassedNavbar);
      if (hasPassedNavbar) setRevealed(false);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(
    () => () => {
      if (revealTimerRef.current !== null) {
        window.clearTimeout(revealTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const closeProfile = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };

    document.addEventListener("pointerdown", closeProfile);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeProfile);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  };

  const hidden = pastNavbar && !revealed && !profileOpen;
  const homeHref = role === "admin" ? "/admin" : `/${role}`;
  const accountInitial = userName.trim().slice(0, 1).toUpperCase() || "U";
  const section = sectionTitle(pathname, role);
  const recordHeader = useRecordHeader();
  // On a record detail page the navbar becomes the record's command bar.
  const record = role === "admin" ? null : recordHeader;

  return (
    <>
      <button
        className={`global-navbar-reveal${hidden ? " is-visible" : ""}`}
        type="button"
        aria-label="Show navigation"
        tabIndex={hidden ? 0 : -1}
        onClick={revealNavbar}
        onPointerEnter={scheduleHoverReveal}
        onPointerLeave={cancelScheduledReveal}
        onFocus={revealNavbar}
      >
        <span />
      </button>

      <motion.header
        className={`workspace-topbar-v2${role === "admin" ? " is-admin-navbar" : ""}`}
        initial={false}
        animate={
          hidden
            ? { y: "calc(-100% - 20px)", opacity: 0, scale: 0.985 }
            : { y: 0, opacity: 1, scale: 1 }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : hidden
              ? { duration: 0.16, ease: [0.4, 0, 1, 1] }
              : { type: "spring", stiffness: 430, damping: 34, mass: 0.72 }
        }
        aria-hidden={hidden}
        inert={hidden ? true : undefined}
        style={{ pointerEvents: hidden ? "none" : "auto" }}
        onPointerEnter={() => setRevealed(true)}
        onPointerLeave={() => {
          if (pastNavbar && !profileOpen) setRevealed(false);
        }}
      >
        <div className="global-navbar-leading">
          {role !== "admin" && (
            <button
              className="workspace-menu-v2"
              type="button"
              aria-label="Open navigation"
              onClick={onOpenNavigation}
            >
              <List size={21} />
            </button>
          )}

          {role === "admin" ? (
            <Link className="workspace-topbrand-v2" href={homeHref}>
              <span>TL</span>
              <strong>Threadline</strong>
            </Link>
          ) : record ? (
            <nav className="navbar-record-v2" aria-label="Record">
              <span className="navbar-crumbs-v2">
                {record.crumbs.map((crumb) => (
                  <Link key={crumb.href} href={crumb.href}>
                    {crumb.label}
                  </Link>
                ))}
                <CaretRight size={12} weight="bold" aria-hidden="true" />
              </span>
              <strong className="navbar-record-title-v2">{record.title}</strong>
              {record.status && (
                <span
                  className={`navbar-record-status-v2 tone-${record.status.tone}`}
                >
                  {record.status.label}
                </span>
              )}
            </nav>
          ) : (
            <div className="workspace-context-v2">
              <span>Workspace</span>
              <strong>{section}</strong>
            </div>
          )}
        </div>

        <div className="workspace-top-actions-v2">
          {record?.action && (
            <button
              type="button"
              className={`navbar-record-action-v2${record.action.ghost ? " is-ghost" : ""}`}
              onClick={record.action.onClick}
              disabled={record.action.disabled || record.action.busy}
            >
              {record.action.icon === "save" && <FloppyDisk size={16} />}
              {(record.action.icon === "issue" ||
                record.action.icon === "approve") && (
                <CheckCircle size={16} weight="fill" />
              )}
              {record.action.busy ? "Working…" : record.action.label}
            </button>
          )}
          {record?.onDelete && (
            <ConfirmAction
              title={record.onDelete.title}
              description={record.onDelete.description}
              confirmLabel={record.onDelete.confirmLabel}
              destructive
              onConfirm={record.onDelete.onConfirm}
              trigger={
                <button
                  type="button"
                  className="navbar-record-delete-v2"
                  disabled={record.onDelete.disabled}
                  aria-label={record.onDelete.confirmLabel}
                >
                  <Trash size={17} />
                </button>
              }
            />
          )}

          <ThemeToggle variant="compact" />

          <span className="workspace-live-v2">
            <i /> Live
          </span>

          <div
            className="workspace-notification-v2"
            role="status"
            aria-label={`${attentionCount} items need attention`}
          >
            <Bell size={19} />
            {attentionCount > 0 && <span>{Math.min(attentionCount, 9)}</span>}
          </div>

          <div className="workspace-profile-v2" ref={profileRef}>
            <button
              type="button"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              onClick={() => setProfileOpen((value) => !value)}
            >
              <span>{accountInitial}</span>
              <span>
                <strong>{userName}</strong>
                <small>{ROLE_LABELS[role]}</small>
              </span>
              <CaretDown size={13} weight="bold" />
            </button>

            {profileOpen && (
              <div className="workspace-profile-menu-v2" role="menu">
                <button type="button" role="menuitem" onClick={logout}>
                  <SignOut size={17} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        {role === "admin" && (
          <div className="admin-navbar-slot">
            <label className="admin-search-field">
              <MagnifyingGlass size={19} />
              <span className="sr-only">Search data sets</span>
              <input
                type="search"
                value={adminQuery}
                onChange={(event) => setAdminQuery(event.target.value)}
                placeholder="Search data sets"
              />
              {adminQuery && (
                <button
                  type="button"
                  onClick={() => setAdminQuery("")}
                  aria-label="Clear search"
                >
                  <X size={17} />
                </button>
              )}
            </label>
          </div>
        )}
      </motion.header>
    </>
  );
}
