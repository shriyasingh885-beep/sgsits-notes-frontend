'use client';
// Sidebar open/closed state for the app shell. Persisted to localStorage so a
// collapsed sidebar stays collapsed across navigations and reloads. Defaults
// to open; on md- viewports the sidebar is hidden regardless and a mobile
// drawer (mobileDrawerOpen, not persisted — always starts closed) stands in.

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

type ShellState = {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (v: boolean) => void;
  mobileDrawerOpen: boolean;
  openMobileDrawer: () => void;
  closeMobileDrawer: () => void;
  toggleMobileDrawer: () => void;
};

const ShellContext = createContext<ShellState>({
  sidebarOpen: true,
  toggleSidebar: () => {},
  setSidebarOpen: () => {},
  mobileDrawerOpen: false,
  openMobileDrawer: () => {},
  closeMobileDrawer: () => {},
  toggleMobileDrawer: () => {},
});

export const useShell = () => useContext(ShellContext);

const STORAGE_KEY = 'notes-hub:sidebar-open';

export function ShellProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setSidebarOpen(stored === '1');
    } catch {
      /* localStorage unavailable — keep default */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, sidebarOpen ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [sidebarOpen, hydrated]);

  // Close the drawer whenever the route changes (link tapped, back/forward, ...)
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const openMobileDrawer = useCallback(() => setMobileDrawerOpen(true), []);
  const closeMobileDrawer = useCallback(() => setMobileDrawerOpen(false), []);
  const toggleMobileDrawer = useCallback(() => setMobileDrawerOpen((v) => !v), []);

  return (
    <ShellContext.Provider
      value={{
        sidebarOpen,
        toggleSidebar,
        setSidebarOpen,
        mobileDrawerOpen,
        openMobileDrawer,
        closeMobileDrawer,
        toggleMobileDrawer,
      }}
    >
      {children}
    </ShellContext.Provider>
  );
}
