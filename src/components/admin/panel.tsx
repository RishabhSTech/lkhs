import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared admin surface so every card, table and chart sits in the same frame. */
export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  flush = false,
}: {
  title?: string;
  description?: string;
  action?: { href: string; label: string };
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Removes body padding for edge-to-edge tables. */
  flush?: boolean;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card",
        className,
      )}
    >
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3.5">
          <div className="min-w-0">
            {title && (
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {action && (
            <Link
              href={action.href}
              className="shrink-0 text-xs font-medium text-brand-azure transition-opacity hover:opacity-70"
            >
              {action.label}
            </Link>
          )}
        </div>
      )}
      <div className={cn(!flush && "p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Consistent table chrome — sticky header, hairline rows, tabular figures. */
export function DataTable({
  headers,
  children,
  className,
}: {
  headers: { label: string; align?: "left" | "right" }[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {headers.map((h) => (
              <th
                key={h.label}
                scope="col"
                className={cn(
                  "px-4 py-2.5 text-[0.6875rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase",
                  h.align === "right" ? "text-right" : "text-left",
                )}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}
