import type { Metadata } from 'next';
import { BookOpen, FolderTree, Leaf } from 'lucide-react';
import AboutBackground from '@/components/about/AboutBackground';
import StudyDoodle from '@/components/about/StudyDoodle';
import Reveal from '@/components/about/Reveal';
import MadeBy, { type Person } from '@/components/about/MadeBy';

export const metadata: Metadata = {
  title: 'About · SGSITS NotesVault',
  description:
    'SGSITS NotesVault solves the one problem every student runs into before an exam — finding the right study material in time. Notes, class slides and PYQs for every first-year subject, in one place, with no accounts.',
};

const REASONS = [
  {
    Icon: BookOpen,
    title: 'Everything for a subject, together',
    body: 'Notes, class slides and previous year papers on one page — no hunting across chats, drives and seniors’ phones the night before.',
  },
  {
    Icon: FolderTree,
    title: 'Organised the way you revise',
    body: 'Every file is sorted by subject and by the official syllabus unit, so you land on the exact chapter you need.',
  },
  {
    Icon: Leaf,
    title: 'No barriers',
    body: 'No logins, no profiles, no waiting for approval. Anyone can browse, and anyone can add a file back to the class.',
  },
];

const TEAM: Person[] = [
  {
    slug: 'viral-sharma',
    name: 'Viral Sharma',
    subtitle: 'IT · 2nd Year',
    linkedin: 'https://www.linkedin.com/in/viral-sharma-2977b2349?utm_source=share_via&utm_content=profile&utm_medium=member_android',
    instagram: 'https://www.instagram.com/viral_.sharma?stkn=MXhmbGc2dHNvZXhhaw==',
  },
  {
    slug: 'animesh-agrawal',
    name: 'Animesh Agrawal',
    subtitle: 'IT · 2nd Year',
    linkedin: 'https://www.linkedin.com/in/animeshagrawal13',
    instagram: 'https://www.instagram.com/_animesh_agrawal_',
  },
];

export default function AboutPage() {
  return (
    <div className="relative mx-auto max-w-4xl pb-6">
      <AboutBackground />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <Reveal>
        <section className="grid items-center gap-8 sm:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-micro font-semibold uppercase tracking-[0.2em] text-text-faint">About</p>
            <h1 className="mt-3 text-[clamp(2.3rem,5vw,3.4rem)] font-heading font-bold leading-[1.08] tracking-[-0.03em] text-ink">
              The right material,
              <br />
              <span className="text-sage-600 dark:text-sage-400">before the exam.</span>
            </h1>
            <span aria-hidden className="mt-4 block h-[3px] w-16 rounded-full bg-sage-300" />
            <p className="mt-4 max-w-2xl text-reader text-secondary">
              The single biggest problem students face before an exam is finding the correct, complete
              study material in time — it ends up scattered across a dozen chats and drives. SGSITS
              NotesVault exists to solve that one problem: the notes, class slides and previous year
              papers for every first-year subject, in one place, organised by subject and syllabus unit,
              open to everyone, with no account needed.
            </p>
          </div>

          <div className="hidden sm:block">
            <StudyDoodle variant="hero" className="mx-auto w-full max-w-[210px]" />
          </div>
        </section>
      </Reveal>

      {/* ── What it gives you ────────────────────────────────────────────── */}
      <Reveal delayMs={80}>
        <section aria-labelledby="reasons-heading" className="mt-14 sm:mt-16">
          <h2 id="reasons-heading" className="sr-only">
            What SGSITS NotesVault gives you
          </h2>
          <div className="grid gap-8 sm:grid-cols-3 sm:gap-x-10 sm:gap-y-0 sm:divide-x sm:divide-border-soft">
            {REASONS.map(({ Icon, title, body }, i) => (
              <div key={title} className={i > 0 ? 'sm:pl-10' : ''}>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-50 dark:bg-white/5">
                  <Icon size={19} strokeWidth={1.6} className="text-sage-700 dark:text-sage-300" />
                </span>
                <h3 className="mt-4 text-body-lg font-semibold text-ink">{title}</h3>
                <p className="mt-1.5 text-body leading-relaxed text-secondary">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* ── Founders ─────────────────────────────────────────────────────── */}
      <Reveal delayMs={80}>
        <section aria-labelledby="team-heading" className="mt-14 border-t border-border-soft/70 pt-9 sm:mt-16">
          <MadeBy people={TEAM} />
        </section>
      </Reveal>

      {/* ── A note to the reader ─────────────────────────────────────────── */}
      <Reveal delayMs={80}>
        <section aria-labelledby="note-heading" className="mt-14 border-t border-border-soft/70 pt-9 sm:mt-16">
          <div className="grid items-center gap-6 sm:grid-cols-[1.35fr_0.65fr]">
            <div>
              <h2
                id="note-heading"
                className="text-[clamp(1.4rem,3vw,1.9rem)] font-heading font-bold leading-tight tracking-[-0.02em] text-ink"
              >
                A resource is only as good
                <br className="hidden sm:block" /> as the class that keeps it alive.
              </h2>
              <p className="mt-3 max-w-2xl text-reader text-secondary">
                Our one request: treat this as shared property, not a service. The few minutes it takes to
                upload a clean set of notes or a corrected paper save the whole batch hours during exam
                week. If a file is wrong, incomplete or in the wrong chapter, replace it — the library gets
                a little better every time someone gives back to it.
              </p>
            </div>
            <div className="hidden justify-self-end sm:block">
              <StudyDoodle variant="closing" className="w-36" />
            </div>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
