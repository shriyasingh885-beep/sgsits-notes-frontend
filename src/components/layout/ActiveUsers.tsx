'use client';

// A real, honest "active now" indicator — not a fabricated number. Each
// browser keeps a random id in localStorage and pings /api/presence every
// ~25s; the badge shows how many distinct sessions have pinged in the last
// two minutes. Subtle, bottom-left, easy to miss on purpose.

import { useEffect, useState } from 'react';

const PING_MS = 25_000;

function getSessionId() {
  try {
    const key = 'nh-presence-id';
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return null;
  }
}

export default function ActiveUsers() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const sessionId = getSessionId();
    if (!sessionId) return;

    let cancelled = false;
    const ping = async () => {
      try {
        const res = await fetch('/api/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data.count === 'number') setCount(data.count);
      } catch {
        /* offline or a blip — just skip this tick, no need to surface it */
      }
    };

    ping();
    const interval = setInterval(ping, PING_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Nothing to show yet, or genuinely just this one visitor — a badge that
  // only ever says "1" reads as broken, not trustworthy, so stay quiet.
  if (!count || count < 2) return null;

  return (
    <div
      className="fixed bottom-20 right-4 z-30 flex items-center gap-1.5 rounded-full border border-border bg-surface/90 px-3 py-1.5 text-micro font-medium text-secondary shadow-sm backdrop-blur-sm md:bottom-4"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-sage-500" />
      </span>
      {count} people here now
    </div>
  );
}
