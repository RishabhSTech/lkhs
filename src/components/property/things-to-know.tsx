import { DynamicIcon } from "@/components/property/dynamic-icon";
import {
  THING_TO_KNOW_GROUP_LABELS,
  THING_TO_KNOW_GROUP_ORDER,
  type ResolvedThingToKnow,
} from "@/lib/property/things-to-know";
import type { ThingToKnowGroup } from "@prisma/client";

export type ThingsToKnowItem = ResolvedThingToKnow & {
  group: ThingToKnowGroup;
};

/**
 * The three-column block that closes the listing: house rules, safety and
 * property, cancellation policy. A column with nothing in it is dropped rather
 * than printed as an empty heading.
 *
 * `fallbacks` carries the free-text `houseRules` / `cancellationPolicy` already
 * on the property, so a listing an admin hasn't itemised yet still says
 * something useful.
 */
export function ThingsToKnow({
  items,
  fallbacks,
}: {
  items: ThingsToKnowItem[];
  fallbacks?: Partial<Record<ThingToKnowGroup, string | null>>;
}) {
  const columns = THING_TO_KNOW_GROUP_ORDER.map((group) => ({
    group,
    label: THING_TO_KNOW_GROUP_LABELS[group],
    items: items.filter((item) => item.group === group),
    fallback: fallbacks?.[group]?.trim() || null,
  })).filter((column) => column.items.length > 0 || column.fallback);

  if (columns.length === 0) return null;

  return (
    <div className="grid gap-x-12 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
      {columns.map((column) => (
        <section key={column.group}>
          <h3 className="font-heading text-lg text-foreground">
            {column.label}
          </h3>

          {column.items.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {column.items.map((item) => (
                <li key={item.code} className="flex items-start gap-3">
                  <DynamicIcon
                    name={item.icon}
                    className="mt-0.5 size-4 text-muted-foreground"
                  />
                  <span className="text-sm leading-relaxed text-foreground">
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-foreground">
              {column.fallback}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
