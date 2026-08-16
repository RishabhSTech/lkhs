import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Section({
  children,
  className,
  bleed = false,
  tight = false,
}: {
  children: ReactNode;
  className?: string;
  bleed?: boolean;
  tight?: boolean;
}) {
  return (
    <section className={cn(tight ? "py-10 lg:py-12" : "py-12 lg:py-16", className)}>
      <div className={cn(!bleed && "mx-auto w-full max-w-6xl px-5 sm:px-6")}>
        {children}
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-lg">
        {eyebrow && <p className="label-eyebrow">{eyebrow}</p>}
        <h2 className="mt-2 font-heading text-[1.75rem] leading-[1.12] text-foreground sm:text-[2rem]">
          {title}
        </h2>
        {description && (
          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {action && (
        <Link
          href={action.href}
          className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-brand-terracotta"
        >
          {action.label}
          <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
