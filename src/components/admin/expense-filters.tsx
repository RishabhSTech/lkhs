"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function ExpenseFilters({
  properties,
  filters,
}: {
  properties: { id: string; name: string }[];
  filters: { propertyId?: string; status?: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const selectClass =
    "h-9 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={filters.propertyId ?? ""}
        onChange={(e) => setParam("property", e.target.value)}
        className={selectClass}
        aria-label="Filter by property"
      >
        <option value="">All properties</option>
        {properties.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <select
        value={filters.status ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
        className={selectClass}
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        <option value="PAID">Paid</option>
        <option value="PENDING">Pending</option>
        <option value="OVERDUE">Overdue</option>
        <option value="APPROVED">Approved</option>
      </select>
    </div>
  );
}
