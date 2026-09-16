'use client';

import { useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useBookmarks } from '@/lib/use-bookmarks';

/**
 * The one bookmark control in the product. Saves to the visitor's own browser
 * (see lib/use-bookmarks) — the site has no accounts, so there is nothing to
 * sign in to and no server round-trip to make.
 * Safe to nest inside a <Link> — stops the click from bubbling into it.
 */
export function BookmarkButton({
  resourceId,
  size = 17,
  variant = 'icon',
  className,
}: {
  resourceId: string;
  size?: number;
  variant?: 'icon' | 'pill';
  className?: string;
}) {
  const { has, ready, toggle: toggleId } = useBookmarks();
  const [pop, setPop] = useState(false);

  // Before the effect in useBookmarks has run there is no saved list to read,
  // so render the unsaved state — matching what the server rendered.
  const bookmarked = ready && has(resourceId);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleId(resourceId);
    setPop(true);
    setTimeout(() => setPop(false), 260);
  }

  const Icon = bookmarked ? BookmarkCheck : Bookmark;

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={bookmarked}
        aria-label={bookmarked ? 'Remove bookmark' : 'Save bookmark'}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-button border px-3 py-2 text-body font-semibold transition duration-calm ease-calm',
          bookmarked
            ? 'border-transparent bg-sage-600 text-white hover:bg-sage-700'
            : 'border-border bg-surface text-secondary hover:border-sage-300 hover:text-ink',
          className,
        )}
      >
        <Icon size={size} strokeWidth={1.9} className={cn(pop && 'nav-try-pulse')} />
        {bookmarked ? 'Saved' : 'Save'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? 'Remove bookmark' : 'Save bookmark'}
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition duration-calm ease-calm',
        bookmarked ? 'text-sage-600' : 'text-faint hover:text-sage-500',
        className,
      )}
    >
      <Icon
        size={size}
        strokeWidth={1.9}
        className={cn('transition-transform duration-200', pop && 'scale-125', bookmarked && 'fill-sage-100')}
      />
    </button>
  );
}

export default BookmarkButton;
