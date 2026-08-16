"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function AreaFilter({
  areas,
  active,
}: {
  areas: string[];
  active?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(area?: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (area) params.set("area", area);
    else params.delete("area");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:px-0">
      <FilterChip active={!active} onClick={() => select(undefined)}>
        All areas
      </FilterChip>
      {areas.map((area) => (
        <FilterChip
          key={area}
          active={active === area}
          onClick={() => select(area)}
        >
          {area}
        </FilterChip>
      ))}
    </div>
  );
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card text-muted-foreground hover:border-ring hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
