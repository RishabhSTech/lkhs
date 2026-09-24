import { cn } from "@/lib/utils";
import { OTA_SOURCE_META } from "@/lib/property/reviews";
import type { ReviewSource } from "@prisma/client";

/**
 * The real brand mark alone, on a plain white disc - meant to sit inside an
 * `AvatarBadge`, pinned to the bottom-right corner of a reviewer's photo, so
 * a glance at the avatar says which site the review came from. White keeps
 * every mark's own colours (Airbnb's rausch, Google's four colours, Agoda's
 * dots) reading clean rather than fighting a tinted background.
 */
export function SourceMark({
  source,
  className,
}: {
  source: ReviewSource;
  className?: string;
}) {
  const meta = OTA_SOURCE_META[source];
  return (
    <span
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-black/10",
        className,
      )}
      title={meta.label}
    >
      <img src={meta.logo} alt={meta.label} className="h-[68%] w-[68%] object-contain" />
    </span>
  );
}

/**
 * The mark plus its name, as a standalone pill - for places with no photo to
 * pin the mark to: the homepage rail's caption, the admin moderation list,
 * and the source picker in the "add a review" form.
 */
export function SourceBadge({
  source,
  className,
  children,
}: {
  source: ReviewSource;
  className?: string;
  children?: React.ReactNode;
}) {
  const meta = OTA_SOURCE_META[source];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pr-2.5 pl-1 text-[0.6875rem] font-medium text-foreground shadow-sm",
        className,
      )}
    >
      <span className="flex size-4 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-black/10">
        <img src={meta.logo} alt="" aria-hidden className="h-[80%] w-[80%] object-contain" />
      </span>
      {meta.label}
      {children}
    </span>
  );
}
