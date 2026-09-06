import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Three weights, not one. The old page ran every band at the same padding and
 * the same 28px heading, which is why nothing on it read as important - a page
 * where everything is emphasised has no emphasis. `feature` is for the two or
 * three moments that carry the page, `quiet` is for supporting texture, and
 * `default` is everything else.
 */
export type SectionSize = "feature" | "default" | "quiet";

/**
 * Bottom padding runs a little longer than top on the two heavier weights.
 * Mathematically symmetrical bands read as bottom-light, because the heading
 * sits at the top of the content and the eye measures from the ink, not from
 * the box. This is the one place optical beats arithmetic.
 */
const SECTION_PADDING: Record<SectionSize, string> = {
  feature: "pt-20 pb-24 lg:pt-28 lg:pb-32",
  default: "pt-14 pb-16 lg:pt-20 lg:pb-24",
  quiet: "pt-10 pb-12 lg:pt-12 lg:pb-14",
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

/**
 * Feature headings are fluid rather than stepped. At three fixed breakpoints
 * the largest heading on the page jumps twice on the way down and spends most
 * of the tablet range at the wrong size; a clamp lets it track the measure
 * continuously, which is the difference between a set page and a responsive
 * one.
 */
const HEADING_SIZE: Record<SectionSize, string> = {
  feature: "text-[clamp(2.25rem,4.4vw,3.5rem)]",
  default: "text-[clamp(1.75rem,2.8vw,2.375rem)]",
  quiet: "text-[1.5rem] sm:text-[1.75rem]",
};

const DESCRIPTION_SIZE: Record<SectionSize, string> = {
  feature: "text-base",
  default: "text-[0.9375rem]",
  quiet: "text-sm",
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  size = "default",
  tone = "default",
  index,
  layout = "stack",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  action?: { href: string; label: string };
  size?: SectionSize;
  /** `invert` for headings sitting on the brand blue. */
  tone?: "default" | "invert";
  /**
   * The section's place in the document, e.g. "01". Renders the hairline and
   * the margin numeral that give the homepage its spine. Omitted everywhere
   * else, where the page is a single argument rather than a sequence.
   */
  index?: string;
  /**
   * `stack` is the original: everything left-aligned in one column.
   * `aside` splits the heading against its supporting copy across the measure,
   * so a page running six of these does not read as six of the same block.
   */
  layout?: "stack" | "aside";
  className?: string;
}) {
  const invert = tone === "invert";

  const eyebrowEl = eyebrow && (
    <p
      className={cn(
        "label-eyebrow",
        invert ? "text-white/55" : "text-brand-azure",
      )}
    >
      {eyebrow}
    </p>
  );

  const titleEl = (
    <h2
      className={cn(
        "headline font-display",
        eyebrow && "mt-2.5",
        HEADING_SIZE[size],
        invert ? "text-white" : "text-foreground",
      )}
    >
      {title}
    </h2>
  );

  const descriptionEl = description && (
    <p
      className={cn(
        "copy leading-relaxed",
        DESCRIPTION_SIZE[size],
        invert ? "text-white/65" : "text-muted-foreground",
      )}
    >
      {description}
    </p>
  );

  const actionEl = action && (
    <Link
      href={action.href}
      className={cn(
        "group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium transition-colors",
        invert
          ? "text-white/80 hover:text-white"
          : "text-foreground hover:text-brand-azure",
      )}
    >
      {action.label}
      <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );

  // The rule spans the full measure and the numeral hangs in it - the numeral
  // is a locator, not a label, so it never sits above the rule competing with
  // the eyebrow underneath.
  const rule = index && (
    <div className="rule-index mb-8 lg:mb-10">
      <span
        className={cn(
          "rule-index__num",
          invert ? "text-white/45" : "text-brand-mist",
        )}
      >
        {index}
      </span>
      <span
        aria-hidden
        className={cn(
          "h-px flex-1",
          invert ? "bg-white/12" : "bg-border",
        )}
      />
    </div>
  );

  if (layout === "aside") {
    return (
      <div className={className}>
        {rule}
        <div className="grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-end">
          <div>
            {eyebrowEl}
            {titleEl}
          </div>
          {(description || action) && (
            // Held to the bottom of the row so the supporting copy sits on the
            // headline's last baseline rather than floating beside its cap
            // height. This is the whole point of the asymmetric variant.
            <div className="lg:pb-1.5">
              {descriptionEl}
              {actionEl && (
                <div className={cn(description && "mt-5")}>{actionEl}</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {rule}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className={size === "feature" ? "max-w-xl" : "max-w-lg"}>
          {eyebrowEl}
          {titleEl}
          {descriptionEl && (
            <div className={size === "feature" ? "mt-4 max-w-md" : "mt-3"}>
              {descriptionEl}
            </div>
          )}
        </div>
        {actionEl}
      </div>
    </div>
  );
}
