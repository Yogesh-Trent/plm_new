"use client";

import {
  Bell,
  CaretDown,
  GearSix,
  Handshake,
  House,
  List,
  Package,
  Palette,
  Receipt,
  SignOut,
  Stack,
  TShirt,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ROLE_LABELS, type Role } from "@/lib/roles";

type WorkspaceShellProps = {
  role: Role;
  userName: string;
  attentionCount: number;
  children: React.ReactNode;
};

export function WorkspaceShell({
  role,
  userName,
  attentionCount,
  children,
}: WorkspaceShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const nav =
    role === "admin"
      ? [{ href: "/admin", label: "Reference data", icon: GearSix }]
      : [
          { href: `/${role}`, label: "Overview", icon: House },
          ...(role === "all"
            ? [{ href: "/all/process", label: "Seasons", icon: List }]
            : []),
          { href: "/styles", label: "Styles", icon: TShirt },
          { href: "/color-combos", label: "Colourways", icon: Palette },
          { href: "/boms", label: "BOM library", icon: Stack },
          {
            href: "/supplier-requests",
            label: "Supplier requests",
            icon: Handshake,
          },
          { href: "/supplier-quotes", label: "Supplier quotes", icon: Receipt },
          { href: "/purchase-orders", label: "Purchase orders", icon: Package },
        ];

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  };

  return (
    <div className="workspace-shell-v2">
      <aside className={`workspace-rail-v2${mobileOpen ? " is-open" : ""}`}>
        <div className="workspace-brand-v2">
          <span className="workspace-brand-mark-v2">TL</span>
          <span>
            <strong>Threadline</strong>
            <small>Product lifecycle</small>
          </span>
          <button
            className="workspace-mobile-close"
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="workspace-nav-v2" aria-label="Primary navigation">
          <p>Workspace</p>
          {nav.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== `/${role}` && pathname.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                href={href}
                className={active ? "is-active" : ""}
                aria-current={active ? "page" : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={19} weight={active ? "fill" : "regular"} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="workspace-rail-note-v2">
          <span className="workspace-rail-note-index">01</span>
          <div>
            <strong>
              {role === "admin" ? "Reference data" : "AW26 line review"}
            </strong>
            <p>
              {role === "admin"
                ? "Shared values used by live records"
                : attentionCount
                  ? `${attentionCount} records need attention`
                  : "No blocked records"}
            </p>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <button
          className="workspace-scrim-v2"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="workspace-stage-v2">
        <header className="workspace-topbar-v2">
          <button
            className="workspace-menu-v2"
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <List size={22} />
          </button>
          <div className="workspace-context-v2">
            <span>Workspace</span>
            <strong>{ROLE_LABELS[role]} operations</strong>
          </div>
          <div className="workspace-top-actions-v2">
            <span className="workspace-live-v2">
              <i /> Live data
            </span>
            <div
              className="workspace-notification-v2"
              aria-label={`${attentionCount} items need attention`}
            >
              <Bell size={20} />
              {attentionCount > 0 && <span>{Math.min(attentionCount, 9)}</span>}
            </div>
            <div className="workspace-profile-v2">
              <button
                type="button"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen((value) => !value)}
              >
                <span>{userName.slice(0, 1).toUpperCase()}</span>
                <span>
                  <strong>{userName}</strong>
                  <small>{ROLE_LABELS[role]}</small>
                </span>
                <CaretDown size={14} />
              </button>
              {profileOpen && (
                <div className="workspace-profile-menu-v2">
                  <Link href={role === "admin" ? "/admin" : `/${role}`}>
                    <GearSix size={17} /> Workspace settings
                  </Link>
                  <button type="button" onClick={logout}>
                    <SignOut size={17} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
