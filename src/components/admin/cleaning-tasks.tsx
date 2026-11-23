"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ChevronRight, Loader2, SlidersHorizontal, StickyNote, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/admin/form-fields";
import { ResponsiveSheet } from "@/components/admin/responsive-sheet";
import { Button } from "@/components/ui/button";
import { useQuickAdd } from "@/components/admin/quick-add";
import type { CleaningTaskRecord } from "@/components/admin/cleaning-task-sheet";
import {
  CLEANING_STAGES, NEXT_ACTION, STAGE_LABEL, stageBadgeClass,
} from "@/lib/operations/cleaning-stages";
import { cn } from "@/lib/utils";

type View = "todo" | "upcoming" | "done";

function dayLabel(iso: string, today: string) {
  const diff = Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (diff < 0) return "Late";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function CleaningTasks({
  tasks,
  today,
  userId,
  canManage,
  properties,
  staff,
}: {
  tasks: CleaningTaskRecord[];
  today: string;
  userId: string;
  canManage: boolean;
  properties: { id: string; name: string }[];
  staff: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { openCleaning } = useQuickAdd();
  const [view, setView] = useState<View>("todo");
  const [mineOnly, setMineOnly] = useState(!canManage);
  const [propertyId, setPropertyId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Optimistic stage changes so the button responds instantly on a slow network.
  // Applied only while the server still reports the stage we moved from, so a
  // later edit made elsewhere always wins.
  type Stage = CleaningTaskRecord["status"];
  const [optimistic, setOptimistic] = useState<Record<string, { from: Stage; to: Stage }>>({});

  const withOptimistic = useMemo(
    () =>
      tasks.map((t) => {
        const o = optimistic[t.id];
        return o && o.from === t.status ? { ...t, status: o.to } : t;
      }),
    [tasks, optimistic],
  );

  const scoped = withOptimistic.filter(
    (t) =>
      (!mineOnly || t.assignedToId === userId || (!canManage && t.assignedToId === null)) &&
      (!propertyId || t.propertyId === propertyId) &&
      (!assigneeId || (assigneeId === "none" ? t.assignedToId === null : t.assignedToId === assigneeId)),
  );
  const buckets: Record<View, CleaningTaskRecord[]> = {
    todo: scoped.filter((t) => t.status !== "READY" && t.scheduledDate <= today),
    upcoming: scoped.filter((t) => t.status !== "READY" && t.scheduledDate > today),
    done: scoped
      .filter((t) => t.status === "READY")
      .sort((a, b) => (b.completedAt ?? b.scheduledDate).localeCompare(a.completedAt ?? a.scheduledDate)),
  };
  const visible = buckets[view];

  const groups = new Map<string, CleaningTaskRecord[]>();
  for (const t of visible) {
    const key = view === "done" ? (t.completedAt ?? t.scheduledDate).slice(0, 10) : t.scheduledDate < today ? "overdue" : t.scheduledDate;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }

  async function advance(task: CleaningTaskRecord) {
    const next = NEXT_ACTION[task.status];
    if (!next) return;
    setBusyId(task.id);
    setOptimistic((o) => ({ ...o, [task.id]: { from: task.status, to: next.to } }));
    try {
      const res = await fetch("/api/admin/operations/cleaning", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: next.to }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not update the task.");
      if (next.to === "READY") toast.success(`${task.propertyName} is ready for guests`);
      router.refresh();
    } catch (err) {
      setOptimistic((o) => {
        const copy = { ...o };
        delete copy[task.id];
        return copy;
      });
      toast.error(err instanceof Error ? err.message : "Could not update the task.");
    } finally {
      setBusyId(null);
    }
  }

  const stageCounts = CLEANING_STAGES.filter((s) => s !== "READY").map((s) => ({
    stage: s,
    count: scoped.filter((t) => t.status === s && t.scheduledDate <= today).length,
  }));

  const filterSelects = (
    <>
            <div className="w-full lg:w-56">
              <NativeSelect
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                aria-label="Filter by property"
                className="lg:h-9 lg:rounded-full"
              >
                <option value="">All properties</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="w-full lg:w-48">
              <NativeSelect
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                aria-label="Filter by cleaner"
                className="lg:h-9 lg:rounded-full"
              >
                <option value="">All cleaners</option>
                <option value="none">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
    </>
  );

  return (
    <div>
      {canManage && (
        <ResponsiveSheet
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          title="Filter cleanings"
          size="sm"
          footer={
            <div className="flex gap-2">
              {(propertyId || assigneeId) && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setPropertyId("");
                    setAssigneeId("");
                  }}
                >
                  Clear
                </Button>
              )}
              <Button size="lg" className="flex-1" onClick={() => setFiltersOpen(false)}>
                Done
              </Button>
            </div>
          }
        >
          <div className="grid gap-3">{filterSelects}</div>
        </ResponsiveSheet>
      )}
      {/* Segmented control */}
      <div className="grid grid-cols-3 rounded-xl bg-muted p-1">
        {(
          [
            ["todo", "Today"],
            ["upcoming", "Coming up"],
            ["done", "Done"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={cn(
              "flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors",
              view === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {label}
            {key !== "done" && buckets[key].length > 0 && (
              <span
                className={cn(
                  "min-w-5 rounded-full px-1.5 text-xs tabular-nums",
                  key === "todo" ? "bg-primary text-white" : "bg-muted-foreground/15 text-muted-foreground",
                )}
              >
                {buckets[key].length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setMineOnly((v) => !v)}
          aria-pressed={mineOnly}
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium",
            mineOnly ? "border-primary bg-primary text-white" : "border-border bg-card text-foreground",
          )}
        >
          <UserRound className="size-4" />
          {canManage ? "Mine" : "Only mine"}
        </button>
        {canManage && <div className="hidden flex-wrap gap-2 lg:flex">{filterSelects}</div>}
        {canManage && (
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium lg:hidden",
              propertyId || assigneeId ? "border-primary bg-primary/8 text-primary" : "border-border bg-card text-foreground",
            )}
          >
            <SlidersHorizontal className="size-4" />
            {propertyId || assigneeId ? "Filtered" : "Filter"}
          </button>
        )}
      </div>

      {view === "todo" && buckets.todo.length > 0 && (
        <div className="mt-3 hidden gap-1.5 lg:flex overflow-x-auto [scrollbar-width:none]">
          {stageCounts
            .filter((s) => s.count > 0)
            .map((s) => (
              <span key={s.stage} className={cn("shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium", stageBadgeClass(s.stage))}>
                {STAGE_LABEL[s.stage]} · {s.count}
              </span>
            ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="mt-6 flex flex-col items-center soft-card px-6 py-12 text-center">
          <CheckCircle2 className="size-8 text-chart-1" />
          <p className="mt-3 font-heading text-lg text-foreground">
            {view === "todo" ? "All clear" : view === "upcoming" ? "Nothing scheduled" : "Nothing finished yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {view === "todo"
              ? "Every home due today is ready for guests."
              : view === "upcoming"
                ? "Cleanings show up here by themselves when a booking is confirmed."
                : "Finished cleanings show up here."}
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {[...groups].map(([key, items]) => (
            <section key={key}>
              <h2
                className={cn(
                  "px-1 pb-2 text-xs font-semibold tracking-wide uppercase",
                  key === "overdue" ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {key === "overdue" ? "Late - still to do" : view === "done" ? `Finished ${dayLabel(key, today).toLowerCase()}` : dayLabel(key, today)}
              </h2>
              <ul className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                {items.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    today={today}
                    busy={busyId === task.id}
                    onAdvance={() => advance(task)}
                    onOpen={() => openCleaning({ task })}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

    </div>
  );
}

function TaskCard({
  task,
  today,
  busy,
  onAdvance,
  onOpen,
}: {
  task: CleaningTaskRecord;
  today: string;
  busy: boolean;
  onAdvance: () => void;
  onOpen: () => void;
}) {
  const next = NEXT_ACTION[task.status];
  const sameDay = task.nextArrival && task.nextArrival.date === task.scheduledDate;
  const overdue = task.status !== "READY" && task.scheduledDate < today;

  return (
    <li className={cn("overflow-hidden rounded-xl border bg-card", sameDay && task.status !== "READY" ? "border-chart-4/50" : "border-border")}>
      <button type="button" onClick={onOpen} className="block w-full p-4 text-left active:bg-muted/50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground">{task.propertyName}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {task.reservation
                ? `Checkout · ${task.reservation.guestName}`
                : "Scheduled clean"}
              {overdue && <span className="text-destructive"> · due {dayLabel(task.scheduledDate, today).toLowerCase()}</span>}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1">
            <Badge className={stageBadgeClass(task.status)}>{STAGE_LABEL[task.status]}</Badge>
            <ChevronRight className="size-4 text-muted-foreground" />
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          <span className={cn("flex items-center gap-1", task.assignedToName ? "text-foreground" : "text-chart-4")}>
            <UserRound className="size-3.5" />
            {task.assignedToName ?? "Unassigned"}
          </span>
          {task.nextArrival && task.status !== "READY" && (
            <span className={cn("flex items-center gap-1", sameDay ? "font-medium text-chart-4" : "text-muted-foreground")}>
              {sameDay && <AlertTriangle className="size-3.5" />}
              {sameDay
                ? `Same-day check-in · ${task.nextArrival.guestName}`
                : `Next guest ${dayLabel(task.nextArrival.date, today).toLowerCase()}`}
            </span>
          )}
        </div>

        {task.notes && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            <StickyNote className="mt-px size-3.5 shrink-0" />
            <span className="line-clamp-2">{task.notes}</span>
          </p>
        )}
      </button>

      {next && (
        <div className="flex gap-2 border-t border-border p-2">
          <button
            type="button"
            onClick={onAdvance}
            disabled={busy}
            className={cn(
              "flex h-11 w-full flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60",
              next.to === "READY"
                ? "bg-chart-1 text-white active:bg-chart-1/90"
                : "bg-primary text-white active:bg-primary/90",
            )}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : next.label}
          </button>
        </div>
      )}
    </li>
  );
}
