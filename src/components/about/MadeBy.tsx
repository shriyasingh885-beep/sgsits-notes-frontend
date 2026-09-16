import TeamAvatar from '@/components/about/TeamAvatar';

export type Person = {
  slug: string;
  name: string;
  subtitle?: string;
  linkedin: string;
  instagram: string;
};

function SocialIcon({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-50 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-white/[0.07]"
    >
      {children}
    </a>
  );
}

function PersonEntry({ person }: { person: Person }) {
  const igGradientId = `ig-gradient-${person.slug}`;
  return (
    <div className="flex items-center gap-3.5">
      {/* A quiet ring instead of a glowing halo — enough presence without */}
      {/* competing with the avatar itself. */}
      <div className="rounded-full ring-1 ring-sage-200 dark:ring-white/10">
        <TeamAvatar slug={person.slug} name={person.name} size={64} />
      </div>
      <div className="min-w-0">
        <p className="text-body-lg font-semibold text-ink">{person.name}</p>
        {person.subtitle && <p className="mt-0.5 text-meta text-text-faint">{person.subtitle}</p>}
        <div className="mt-1.5 -ml-2 flex items-center gap-0.5">
          {/* Real brand colours (LinkedIn blue, Instagram's gradient) so the
              icons read at a glance instead of blending into the page tone. */}
          <SocialIcon href={person.linkedin} label={`${person.name} on LinkedIn`}>
            <svg viewBox="0 0 24 24" fill="#0A66C2" className="h-[19px] w-[19px]" aria-hidden>
              <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0z" />
            </svg>
          </SocialIcon>
          <SocialIcon href={person.instagram} label={`${person.name} on Instagram`}>
            <svg viewBox="0 0 24 24" fill="none" className="h-[19px] w-[19px]" aria-hidden>
              <defs>
                <linearGradient id={igGradientId} x1="0" y1="24" x2="24" y2="0">
                  <stop offset="0%" stopColor="#FEC053" />
                  <stop offset="35%" stopColor="#F23D5C" />
                  <stop offset="70%" stopColor="#C92FA6" />
                  <stop offset="100%" stopColor="#7C3AED" />
                </linearGradient>
              </defs>
              <rect x="2.3" y="2.3" width="19.4" height="19.4" rx="5.5" stroke={`url(#${igGradientId})`} strokeWidth="1.9" />
              <circle cx="12" cy="12" r="4.4" stroke={`url(#${igGradientId})`} strokeWidth="1.9" />
              <circle cx="17.6" cy="6.4" r="1.3" fill={`url(#${igGradientId})`} />
            </svg>
          </SocialIcon>
        </div>
      </div>
    </div>
  );
}

export function MadeBy({ people }: { people: Person[] }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-micro font-semibold uppercase tracking-[0.2em] text-text-faint">Made by</p>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-12">
        {people.map((p) => (
          <PersonEntry key={p.slug} person={p} />
        ))}
      </div>
    </div>
  );
}

export default MadeBy;
