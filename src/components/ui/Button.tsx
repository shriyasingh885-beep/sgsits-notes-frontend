import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-eucalyptus-fade text-white border border-transparent shadow-sm hover:shadow-md hover:-translate-y-px",
  secondary:
    "bg-surface text-ink border border-border shadow-sm hover:border-sage-300 hover:bg-primary-soft hover:-translate-y-px",
  tertiary: "bg-transparent text-secondary border border-transparent hover:text-primary-strong hover:bg-primary-soft",
  danger: "bg-transparent border border-border text-[color:var(--danger)] hover:bg-[color:var(--tint-terracotta)]",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-[34px] px-3.5 text-meta gap-1.5",
  md: "h-10 px-4.5 text-body gap-2",
  lg: "h-[46px] px-6 text-body-lg gap-2",
};

export function buttonClasses(variant: ButtonVariant = "secondary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-button font-semibold whitespace-nowrap",
    "transition duration-calm ease-calm active:translate-y-px disabled:opacity-60 disabled:pointer-events-none disabled:translate-y-0 disabled:shadow-none",
    VARIANT[variant],
    SIZE[size],
    className
  );
}

export function Button({
  children,
  variant = "secondary",
  size = "md",
  className,
  ...rest
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

export function LinkButton({
  children,
  href,
  variant = "secondary",
  size = "md",
  className,
}: {
  children: ReactNode;
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)}>
      {children}
    </Link>
  );
}

export default Button;
