import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Section({
  children,
  className,
  bleed = false,
}: {
  children: ReactNode;
  className?: string;
  bleed?: boolean;
}) {
  return (
    <section className={cn("py-14 sm:py-16 lg:py-24", className)}>
      <div className={cn(!bleed && "mx-auto w-full max-w-6xl px-4 sm:px-6")}>
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
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-xl">
        {eyebrow && (
          <p className="text-[0.6875rem] font-semibold tracking-[0.18em] text-brand-sage uppercase">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-2.5 font-heading text-3xl leading-tight text-brand-green sm:text-4xl">
          {title}
        </h2>
        {description && (
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {action && (
        <Link
          href={action.href}
          className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-brand-green transition-colors hover:text-brand-terracotta"
        >
          {action.label}
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
