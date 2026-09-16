import { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The one card surface in the product: off-white on ivory, hairline border,
 * 12px radius, barely-there shadow (§36). `hover` adds the 2px lift (§18).
 */
export function Card({
  children,
  className,
  hover = false,
  elevated = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  elevated?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-border shadow-card",
        elevated ? "bg-elevated" : "bg-surface",
        hover &&
          "transition duration-calm ease-calm hover:-translate-y-0.5 hover:border-sage-300 hover:shadow-card-hover",
        className
      )}
    >
      {children}
    </div>
  );
}

export default Card;

