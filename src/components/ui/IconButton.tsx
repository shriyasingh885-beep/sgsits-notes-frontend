import { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type Tone = "quiet" | "bordered" | "sage";

const TONE: Record<Tone, string> = {
  quiet: "text-secondary hover:text-ink hover:bg-sage-50 border border-transparent",
  bordered: "text-secondary bg-elevated border border-border hover:border-sage-300 hover:text-ink",
  sage: "text-sage-700 bg-sage-50 border border-sage-100 hover:bg-sage-100",
};

const SIZE = {
  sm: "h-8 w-8 rounded-tiny",
  md: "h-9 w-9 rounded-button",
  lg: "h-10 w-10 rounded-button",
} as const;

function shell(tone: Tone, size: keyof typeof SIZE, className?: string) {
  return cn(
    "inline-flex items-center justify-center transition duration-calm ease-calm",
    "disabled:opacity-50 disabled:pointer-events-none",
    TONE[tone],
    SIZE[size],
    className
  );
}

/**
 * §43 forbids mysterious icon-only controls, so `label` is required: it becomes
 * both the accessible name and the hover tooltip. There is no way to render one
 * of these without saying what it does.
 */
export function IconButton({
  icon,
  label,
  tone = "quiet",
  size = "md",
  className,
  ...rest
}: {
  icon: ReactNode;
  label: string;
  tone?: Tone;
  size?: keyof typeof SIZE;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  return (
    <button aria-label={label} title={label} className={shell(tone, size, className)} {...rest}>
      {icon}
    </button>
  );
}

export function IconLink({
  icon,
  label,
  href,
  tone = "quiet",
  size = "md",
  className,
}: {
  icon: ReactNode;
  label: string;
  href: string;
  tone?: Tone;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <Link href={href} aria-label={label} title={label} className={shell(tone, size, className)}>
      {icon}
    </Link>
  );
}

export default IconButton;
