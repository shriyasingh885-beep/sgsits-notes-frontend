'use client';
// Restrained scroll-reveal: fades + lifts a section a few pixels the first
// time it enters the viewport. Respects prefers-reduced-motion by doing
// nothing (content is visible from the start — no motion, no layout jump).
import { useEffect, useRef, useState, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Reveal({
  children,
  className,
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Default to visible: content must never depend on a scroll observer
  // firing correctly to be readable. Below-the-fold sections may start
  // faded and lift in; anything already in view on mount just renders.
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rect = el.getBoundingClientRect();
    const alreadyInView = rect.top < window.innerHeight * 0.9;
    if (alreadyInView) return; // no animation needed — already visible

    setVisible(false);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    io.observe(el);
    // Safety net: if the observer never fires for any reason, still reveal.
    const fallback = setTimeout(() => setVisible(true), 1500);
    return () => {
      io.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        'transition-[opacity,transform] duration-700 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
        className
      )}
      style={{ transitionDelay: visible ? `${delayMs}ms` : '0ms' }}
    >
      {children}
    </div>
  );
}

export default Reveal;
