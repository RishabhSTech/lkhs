import { Check } from "lucide-react";
import { ICON_REGISTRY } from "@/components/property/icon-registry";
import { cn } from "@/lib/utils";

/**
 * Renders a lucide icon by its export name. Amenities, highlights and
 * "things to know" all store an icon name in the database rather than a
 * component, so this is the single place that turns one back into the other.
 *
 * Resolution goes through `ICON_REGISTRY` rather than the `lucide-react`
 * namespace: indexing the namespace object forced the whole icon set into the
 * bundle. See the registry for the full reasoning.
 *
 * An unknown name falls back to a tick instead of throwing, so a lucide rename
 * degrades the listing rather than breaking the page.
 */
export function DynamicIcon({
  name,
  className,
  fallback = "Check",
}: {
  name: string;
  className?: string;
  fallback?: string;
}) {
  const Resolved = ICON_REGISTRY[name] ?? ICON_REGISTRY[fallback] ?? Check;
  return <Resolved className={cn("size-5 shrink-0", className)} aria-hidden />;
}
