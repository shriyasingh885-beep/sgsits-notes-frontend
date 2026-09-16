'use client';
// Fixed sidebar (240px) + fluid main column on md+, collapsible via the ☰
// button in TopBar (state in ShellContext, persisted to localStorage).
// /login (contributor + admin sign-in, not linked from the public site)
// renders children centered with no sidebar.
// Mounts ToastProvider and CommandPalette once globally.

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import MobileDrawer from './MobileDrawer';
import ActiveUsers from './ActiveUsers';
import CommandPalette from './CommandPalette';
import { ShellProvider, useShell } from './ShellContext';
import { ToastProvider } from '@/components/ui/Toast';
import { NavProvider } from '@/components/nav/NavContext';
import { NavFeedback, NavHelpPanel, NavReminder, NavIntro } from '@/components/nav/NavUI';
import { cn } from '@/lib/cn';

const NO_SHELL_PATHS = ['/login'];

function ShellBody({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { sidebarOpen } = useShell();
  const bare = NO_SHELL_PATHS.some((p) => pathname === p || pathname?.startsWith(p + '/'));

  if (bare) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-5 py-16">
        {children}
      </div>
    );
  }

  return (
    <NavProvider>
      <CommandPalette />
      {/* Sidebar — hidden on mobile, fixed on md+, slides out when collapsed */}
      <Sidebar />
      {/* Main column offset by sidebar width on md+ only while the sidebar is open */}
      <div
        className={cn(
          'flex flex-col min-h-screen transition-[padding] duration-calm ease-calm',
          sidebarOpen ? 'md:pl-sidebar' : 'md:pl-0'
        )}
      >
        <TopBar />
        <main className="flex-1 px-5 py-7 md:px-12 md:py-11 max-w-shell w-full mx-auto">
          {children}
        </main>
      </div>
      <BottomNav />
      <MobileDrawer />
      <ActiveUsers />

      {/* Site-wide gesture navigation chrome — right-click/arrows/swipe/side
          buttons drive real browser history (see NavContext); all paused
          while the PDF reader is open. NavPill (the floating back/forward
          pill) is intentionally not rendered — it sat fixed at the bottom
          of every page and kept overlapping real content (form buttons,
          side panels), so browser/site nav links are the only way to
          navigate now. */}
      <NavFeedback />
      <NavHelpPanel />
      <NavReminder />
      <NavIntro />
    </NavProvider>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ShellProvider>
        <ShellBody>{children}</ShellBody>
      </ShellProvider>
    </ToastProvider>
  );
}
