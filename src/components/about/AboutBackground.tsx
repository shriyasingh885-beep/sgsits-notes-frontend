// One shared, continuous backdrop for the whole About page — replaces the
// earlier per-section decorative blobs. Two very soft washes anchored to
// the hero and to the closing section, so the page reads as a single
// visual field instead of a stack of separately-decorated blocks. Always
// aria-hidden, never affects layout (absolute, zero size).
export function AboutBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -top-24 left-1/2 h-[480px] w-[720px] -translate-x-[62%] opacity-[0.35] blur-3xl dark:opacity-[0.16]"
        style={{
          background: 'radial-gradient(ellipse at center, var(--sage-300), transparent 68%)',
        }}
      />
      <div
        className="absolute bottom-0 left-1/2 h-[420px] w-[640px] translate-x-[15%] opacity-[0.3] blur-3xl dark:opacity-[0.14]"
        style={{
          background: 'radial-gradient(ellipse at center, var(--accent-cream), transparent 70%)',
        }}
      />
    </div>
  );
}

export default AboutBackground;
