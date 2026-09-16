// Small line-art illustration used on the About page — a stack of
// books/notebook/pen, drawn thin and monochrome so it reads as part of the
// page's design rather than a big standalone cartoon. Two variants share
// the same visual language: "hero" (books + bookmark + pen + sticky note)
// and "closing" (a shorter stack of notes/slides/PYQs, echoing the site's
// own three content types).
export function StudyDoodle({
  variant = 'hero',
  className,
}: {
  variant?: 'hero' | 'closing';
  className?: string;
}) {
  if (variant === 'closing') {
    return (
      <svg viewBox="0 0 200 150" fill="none" className={className} aria-hidden>
        {/* two books, slightly fanned */}
        <g stroke="var(--sage-500)" strokeWidth="1.5" strokeLinejoin="round">
          <rect x="34" y="86" width="108" height="20" rx="4" fill="var(--sage-100)" transform="rotate(-2 88 96)" />
          <rect x="40" y="66" width="98" height="20" rx="4" fill="var(--surface-elevated)" transform="rotate(1.5 89 76)" />
        </g>
        {/* pencil leaning against the stack */}
        <g transform="rotate(58 150 60)">
          <rect x="146" y="18" width="7" height="64" rx="3.5" fill="var(--sage-600)" />
          <path d="M146 18l3.5-12 3.5 12z" fill="var(--sage-700)" />
          <rect x="146" y="72" width="7" height="8" fill="var(--accent-cream)" />
        </g>
        {/* a small sprig beside the books — the site's one "growth" note */}
        <g className="animate-doodle-float" style={{ transformOrigin: '30px 82px', animationDelay: '0.6s' }}>
          <path
            d="M30 84c0-14 3-24 3-24s7 8 5 20-8 4-8 4z"
            fill="var(--sage-300)"
            stroke="var(--sage-600)"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path d="M31 84c1-9 2-16 2-16" stroke="var(--sage-600)" strokeWidth="1.1" strokeLinecap="round" />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 260 260" fill="none" className={className} aria-hidden>
      {/* book stack */}
      <g stroke="var(--sage-500)" strokeWidth="1.6" strokeLinejoin="round">
        <rect x="58" y="160" width="140" height="24" rx="5" fill="var(--sage-100)" />
        <rect x="70" y="134" width="116" height="24" rx="5" fill="var(--surface-elevated)" />
        <rect x="64" y="108" width="128" height="24" rx="5" fill="var(--sage-200)" opacity="0.8" />
      </g>
      {/* notebook, tilted */}
      <g transform="rotate(-6 128 92)">
        <rect x="86" y="46" width="86" height="104" rx="8" fill="var(--surface-elevated)" stroke="var(--sage-600)" strokeWidth="1.6" />
        <path d="M100 68h58M100 84h58M100 100h40" stroke="var(--sage-300)" strokeWidth="2" strokeLinecap="round" />
        <rect x="86" y="46" width="10" height="104" rx="4" fill="var(--sage-400)" opacity="0.5" />
      </g>
      {/* bookmark ribbon */}
      <path d="M150 46v34l-8-7-8 7V46" fill="var(--sage-500)" opacity="0.85" />
      {/* pen, floating */}
      <g className="animate-doodle-float" style={{ transformOrigin: '206px 150px' }}>
        <g transform="rotate(34 206 150)">
          <rect x="198" y="96" width="8" height="70" rx="4" fill="var(--sage-600)" />
          <path d="M198 96l4-14 4 14z" fill="var(--sage-700)" />
        </g>
      </g>
      {/* sticky note, handwritten accent */}
      <g className="animate-doodle-float" style={{ transformOrigin: '54px 96px', animationDelay: '1.4s' }}>
        <rect x="18" y="70" width="72" height="60" rx="3" fill="var(--accent-cream)" transform="rotate(-4 54 100)" />
        <text
          x="54"
          y="104"
          textAnchor="middle"
          className="font-hand"
          style={{ fontSize: '15px', fill: 'var(--accent-cream-ink)' }}
          transform="rotate(-4 54 100)"
        >
          same notes,
        </text>
        <text
          x="54"
          y="122"
          textAnchor="middle"
          className="font-hand"
          style={{ fontSize: '15px', fill: 'var(--accent-cream-ink)' }}
          transform="rotate(-4 54 100)"
        >
          bigger impact
        </text>
      </g>
    </svg>
  );
}

export default StudyDoodle;
