import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * Visible breadcrumbs, paired with BreadcrumbList JSON-LD at the call site.
 * Google will only render a breadcrumb trail in the SERP when the markup
 * matches something a visitor can actually see and click.
 */
export function Breadcrumbs({
  trail,
}: {
  trail: { name: string; href: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {trail.map((crumb, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-1.5">
              {last ? (
                <span aria-current="page" className="font-medium text-foreground">
                  {crumb.name}
                </span>
              ) : (
                <>
                  <Link
                    href={crumb.href}
                    className="transition-colors hover:text-brand-terracotta"
                  >
                    {crumb.name}
                  </Link>
                  <ChevronRight className="size-3.5 shrink-0 opacity-50" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
