"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

// Lets a record detail page publish its identity + primary action up into the
// shared glass navbar (breadcrumb, status, Save/Issue/Approve), so the page
// itself no longer needs a large in-page header. Implemented as a tiny external
// store consumed with useSyncExternalStore — the page only *sets*, the navbar
// only *reads*, so there is no render loop between them.

export type RecordStatusTone = "active" | "inactive" | "neutral";

export type RecordStatus = {
  label: string;
  tone: RecordStatusTone;
};

export type RecordActionIcon = "save" | "issue" | "approve";

export type RecordAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  icon?: RecordActionIcon;
  /** Render as a quiet ghost button instead of the filled primary. */
  ghost?: boolean;
};

export type RecordDelete = {
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  disabled?: boolean;
};

export type RecordHeaderConfig = {
  crumbs: Array<{ label: string; href: string }>;
  title: string;
  status?: RecordStatus | null;
  action?: RecordAction | null;
  onDelete?: RecordDelete | null;
};

type Store = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => RecordHeaderConfig | null;
  set: (config: RecordHeaderConfig | null) => void;
};

function makeStore(): Store {
  let state: RecordHeaderConfig | null = null;
  const listeners = new Set<() => void>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return state;
    },
    set(config) {
      state = config;
      listeners.forEach((listener) => listener());
    },
  };
}

const StoreContext = createContext<Store | null>(null);

export function RecordHeaderProvider({ children }: { children: ReactNode }) {
  const [store] = useState<Store>(makeStore);
  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
}

const EMPTY_UNSUBSCRIBE = () => () => {};

/** Navbar side: current record header, or null when not on a record page. */
export function useRecordHeader(): RecordHeaderConfig | null {
  const store = useContext(StoreContext);
  return useSyncExternalStore(
    store ? store.subscribe : EMPTY_UNSUBSCRIBE,
    store ? store.getSnapshot : () => null,
    () => null,
  );
}

/** Page side: publish this record's header to the navbar while mounted. */
export function useSetRecordHeader(config: RecordHeaderConfig) {
  const store = useContext(StoreContext);
  // Publish the latest config on every render (fresh handlers + disabled/busy).
  useEffect(() => {
    store?.set(config);
  });
  // Clear only on unmount so the navbar reverts to its default state.
  useEffect(() => {
    return () => store?.set(null);
  }, [store]);
}
