import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Three weights, not one. The old page ran every band at the same padding and
 * the same 28px heading, which is why nothing on it read as important — a page
 * where everything is emphasised has no emphasis. `feature` is for the two or
 * three moments that carry the page, `quiet` is for supporting texture, and
 * `default` is everything else.
 */
export type SectionSize = "feature" | "default" | "quiet";

const SECTION_PADDING: Record<SectionSize, string> = {
  feature: "py-20 lg:py-28",
  default: "py-14 lg:py-20",
  quiet: "py-10 lg:py-12",
};

export function Section({
  children,
  className,
  bleed = false,
  size = "default",
  id,
}: {
  children: ReactNode;
  className?: string;
  /** Drops the centred container so the section can paint edge to edge. */
  bleed?: boolean;
  size?: SectionSize;
  /** Anchor target, for deep links into a section. */
  id?: string;
}) {
  return (
    <section id={id} className={cn(SECTION_PADDING[size], className)}>
      <div className={cn(!bleed && "mx-auto w-full max-w-6xl px-5 sm:px-6")}>
        {children}
      </div>
    </section>
  );
}

/** Shared page gutter, for bleed sections that still need aligned content. */
export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-6", className)}>
      {children}
    </div>
  );
}

const HEADING_SIZE: Record<SectionSize, string> = {
  feature: "text-[2.25rem] sm:text-[2.75rem] lg:text-[3.25rem]",
  default: "text-[1.75rem] sm:text-[2.25rem]",
  quiet: "text-[1.5rem] sm:text-[1.75rem]",
};

const DESCRIPTION_SIZE: Record<SectionSize, string> = {
  feature: "mt-4 max-w-md text-base",
  default: "mt-3 text-[0.9375rem]",
  quiet: "mt-2.5 text-sm",
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  size = "default",
  tone = "default",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  action?: { href: string; label: string };
  size?: SectionSize;
  /** `invert` for headings sitting on the brand green. */
  tone?: "default" | "invert";
  className?: string;
}) {
  const invert = tone === "invert";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className={size === "feature" ? "max-w-xl" : "max-w-lg"}>
        {eyebrow && (
          <p
            className={cn(
              "label-eyebrow",
              invert ? "text-white/50" : "text-brand-terracotta",
            )}
          >
            {eyebrow}
          </p>
        )}
        <h2
          className={cn(
            "mt-2.5 font-display",
            HEADING_SIZE[size],
            invert ? "text-white" : "text-foreground",
          )}
        >
          {title}
        </h2>
        {description && (
          <p
            className={cn(
              "leading-relaxed",
              DESCRIPTION_SIZE[size],
              invert ? "text-white/65" : "text-muted-foreground",
            )}
          >
            {description}
          </p>
        )}
      </div>

      {action && (
        <Link
          href={action.href}
          className={cn(
            "group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium transition-colors",
            invert
              ? "text-white/80 hover:text-white"
              : "text-foreground hover:text-brand-terracotta",
          )}
        >
          {action.label}
          <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
