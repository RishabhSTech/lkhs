"use client";

import { ChevronRight, Plus, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuickAdd } from "@/components/admin/quick-add";
import type { MaintenanceRecord } from "@/components/admin/maintenance-sheet";
import { formatDateLong } from "@/lib/format";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES: Record<string, string> = {
  URGENT: "border-destructive/25 bg-destructive/10 text-destructive",
  HIGH: "border-chart-2/25 bg-chart-2/10 text-chart-2",
  MEDIUM: "border-chart-4/25 bg-chart-4/10 text-chart-4",
  LOW: "border-border bg-muted text-muted-foreground",
};
const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export function MaintenanceList({
  tasks,
  staff,
}: {
  tasks: MaintenanceRecord[];
  staff: { id: string; name: string }[];
}) {
  const { openMaintenance, can } = useQuickAdd();
  const staffName = new Map(staff.map((s) => [s.id, s.name]));
  const open = tasks.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS");
  const closed = tasks.filter((t) => !(t.status === "OPEN" || t.status === "IN_PROGRESS"));

  const list = (items: MaintenanceRecord[]) => (
    <ul className="divide-y divide-border overflow-hidden soft-card">
      {items.map((task) => (
        <li key={task.id}>
          <button
            type="button"
            disabled={!can.manageCleaning}
            onClick={() => openMaintenance({ task })}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-muted/60 disabled:cursor-default lg:hover:bg-muted/40"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">{task.title}</span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {task.propertyName} · {formatDateLong(task.createdAt)}
              </span>
              <span className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                <Badge className={PRIORITY_STYLES[task.priority]}>{task.priority.toLowerCase()}</Badge>
                <Badge className="border-border bg-muted text-muted-foreground">{STATUS_LABEL[task.status]}</Badge>
                <span
                  className={cn(
                    "flex items-center gap-1",
                    task.assignedToId ? "text-muted-foreground" : "text-chart-4",
                  )}
                >
                  <UserRound className="size-3.5" />
                  {task.assignedToId ? staffName.get(task.assignedToId) ?? "Assigned" : "Unassigned"}
                </span>
              </span>
            </span>
            {can.manageCleaning && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <section className="space-y-4">
      <Button size="lg" variant="outline" className="w-full lg:h-10 lg:w-auto" onClick={() => openMaintenance({})}>
        <Plus />
        Report an issue
      </Button>

      {open.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card/50 px-4 py-8 text-center text-sm text-muted-foreground">
          No open issues.
        </p>
      ) : (
        list(open)
      )}

      {closed.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none px-1 text-[0.8125rem] font-semibold text-muted-foreground">
            Resolved ({closed.length})
          </summary>
          <div className="mt-2">{list(closed.slice(0, 30))}</div>
        </details>
      )}
    </section>
  );
}
