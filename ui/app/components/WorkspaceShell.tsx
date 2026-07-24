"use client";

import {
  CaretDoubleLeft,
  Handshake,
  House,
  List,
  Package,
  Stack,
  TShirt,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Role } from "@/lib/roles";
import { AdminSearchProvider } from "./AdminSearchContext";
import { RecordHeaderProvider } from "./RecordHeaderContext";
import { GlobalNavbar } from "./GlobalNavbar";

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
  const [collapsed, setCollapsed] = useState(false);

  // Restore the persisted collapsed preference on the client.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(localStorage.getItem("threadline-rail-collapsed") === "1");
    } catch {
      /* localStorage unavailable — keep the default */
    }
  }, []);

  const toggleCollapsed = () =>
    setCollapsed((value) => {
      const next = !value;
      try {
        localStorage.setItem("threadline-rail-collapsed", next ? "1" : "0");
      } catch {
        /* ignore persistence failures */
      }
      return next;
    });

  // Grouped sidebar: fewer top-level items, organised by workflow stage.
  // "Sourcing" now covers supplier requests + quotes (one merged workspace).
  const navGroups = [
    {
      heading: "Plan",
      items: [
        { href: `/${role}`, label: "Overview", icon: House },
        ...(role === "all"
          ? [{ href: "/all/process", label: "Seasons", icon: List }]
          : []),
      ],
    },
    {
      heading: "Product",
      items: [
        // Colourways live under each style (Style → Colourways tab), so they're
        // not a top-level item. The cross-style list stays at /color-combos,
        // linked from the Styles page.
        { href: "/styles", label: "Styles", icon: TShirt },
        { href: "/boms", label: "BOM library", icon: Stack },
      ],
    },
    {
      heading: "Sourcing & orders",
      items: [
        { href: "/sourcing", label: "Sourcing", icon: Handshake },
        { href: "/purchase-orders", label: "Purchase orders", icon: Package },
      ],
    },
  ];

  return (
    <AdminSearchProvider>
      <RecordHeaderProvider>
      <div
        className={`workspace-shell-v2${role === "admin" ? " is-admin-shell" : ""}${
          role !== "admin" && collapsed ? " is-rail-collapsed" : ""
        }`}
      >
        {role !== "admin" && (
          <aside className={`workspace-rail-v2${mobileOpen ? " is-open" : ""}`}>
            <div className="workspace-brand-v2">
              <span className="workspace-brand-mark-v2">PLM</span>
              <span>
                <strong>PLM</strong>
                <small>Trent Ltd</small>
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
              {navGroups.map((group) => (
                <div className="workspace-nav-group-v2" key={group.heading}>
                  <p>{group.heading}</p>
                  {group.items.map(({ href, label, icon: Icon }) => {
                    // Sourcing also owns the supplier request/quote detail routes.
                    const owns =
                      href === "/sourcing"
                        ? pathname.startsWith("/sourcing") ||
                          pathname.startsWith("/supplier-requests") ||
                          pathname.startsWith("/supplier-quotes")
                        : pathname === href ||
                          (href !== `/${role}` &&
                            pathname.startsWith(`${href}/`));
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={owns ? "is-active" : ""}
                        aria-current={owns ? "page" : undefined}
                        title={label}
                        onClick={() => setMobileOpen(false)}
                      >
                        <Icon size={19} weight={owns ? "fill" : "regular"} />
                        <span>{label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            <div className="workspace-rail-note-v2">
              <span className="workspace-rail-note-index">01</span>
              <div>
                <strong>AW26 line review</strong>
                <p>
                  {attentionCount
                    ? `${attentionCount} records need attention`
                    : "No blocked records"}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="workspace-rail-toggle-v2"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <CaretDoubleLeft size={15} weight="bold" />
              <span>Collapse</span>
            </button>
          </aside>
        )}

        {role !== "admin" && mobileOpen && (
          <button
            className="workspace-scrim-v2"
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <div className="workspace-stage-v2">
          <GlobalNavbar
            role={role}
            userName={userName}
            attentionCount={attentionCount}
            onOpenNavigation={() => setMobileOpen(true)}
          />
          {children}
        </div>
      </div>
      </RecordHeaderProvider>
    </AdminSearchProvider>
  );
}
