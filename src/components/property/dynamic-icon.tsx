import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Renders a lucide icon by its export name. Amenities, highlights and
 * "things to know" all store an icon name in the database rather than a
 * component, so this is the single place that turns one back into the other.
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
  const registry = Icons as unknown as Record<string, Icons.LucideIcon>;
  const Resolved = registry[name] ?? registry[fallback] ?? Icons.Check;
  return <Resolved className={cn("size-5 shrink-0", className)} aria-hidden />;
}
