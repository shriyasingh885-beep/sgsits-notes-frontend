import {
  LayoutDashboard, BookOpen, FileText,
  Bookmark, ScrollText, CalendarDays, Upload, Info,
} from 'lucide-react';

// Shared between the desktop Sidebar and the mobile drawer so the two menus
// can never drift apart.
//
// Everything here is public: Notes Hub has no accounts, so a visitor must
// never be shown a destination that would bounce them to a sign-in screen.
// The few genuinely account-bound pages live in NAV_ACCOUNT below and are
// rendered only when a session actually exists (contributors and admins).
export const NAV_ITEMS = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/subjects', icon: BookOpen, label: 'Subjects' },
  { href: '/notes', icon: FileText, label: 'Notes' },
  { href: '/bookmarks', icon: Bookmark, label: 'Saved' },
  { href: '/pyq', icon: ScrollText, label: 'PYQ Papers' },
] as const;

export const NAV_SECONDARY = [
  { href: '/schedule', icon: CalendarDays, label: 'Schedule' },
  { href: '/about', icon: Info, label: 'About' },
] as const;

/** Only rendered for a signed-in contributor/admin — these need an identity. */
export const NAV_ACCOUNT = [
  { href: '/uploads', icon: Upload, label: 'My Uploads' },
] as const;
