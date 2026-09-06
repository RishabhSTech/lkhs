import { DynamicIcon } from "@/components/property/dynamic-icon";
import type { ResolvedHighlight } from "@/lib/property/highlights";

/**
 * The icon + headline + one-liner block that sits under the listing header -
 * "Self check-in", "Unbeatable location", "Park for free".
 */
export function ListingHighlights({
  highlights,
}: {
  highlights: ResolvedHighlight[];
}) {
  if (highlights.length === 0) return null;

  return (
    <ul className="space-y-5">
      {highlights.map((highlight) => (
        <li key={highlight.code} className="flex gap-4">
          <DynamicIcon
            name={highlight.icon}
            className="mt-0.5 size-6 text-foreground"
          />
          <div className="min-w-0">
            <p className="font-medium text-foreground">{highlight.title}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
              {highlight.subtitle}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
