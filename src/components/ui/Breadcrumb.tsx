import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export type Crumb = { label: string; href?: string };

/** Small muted trail above a page title (§19). Last item is never a link. */
export default function Breadcrumb({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1 text-meta text-muted", className)}>
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${item.label}-${i}`} className="flex items-center gap-1">
            {item.href && !last ? (
              <Link href={item.href} className="transition duration-calm ease-calm hover:text-sage-700">
                {item.label}
              </Link>
            ) : (
              <span className={last ? "text-secondary" : undefined}>{item.label}</span>
            )}
            {!last && <ChevronRight size={13} strokeWidth={1.8} className="text-muted" />}
          </span>
        );
      })}
    </nav>
  );
}
