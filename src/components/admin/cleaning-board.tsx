"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatDateLong } from "@/lib/format";

const STAGES = ["CHECKOUT", "CLEANING_REQUIRED", "CLEANING", "INSPECTION", "READY"] as const;

const selectClass =
  "h-8 w-full rounded-md border border-border bg-card px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Task = {
  id: string;
  propertyName: string;
  scheduledDate: string;
  status: (typeof STAGES)[number];
  assignedToId: string | null;
  assignedToName: string | null;
};

export function CleaningBoard({
  tasks,
  staff,
  properties,
}: {
  tasks: Task[];
  staff: { id: string; name: string }[];
  properties: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [creating, setCreating] = useState(false);

  async function advance(task: Task) {
    const idx = STAGES.indexOf(task.status);
    if (idx === STAGES.length - 1) return;
    setBusyId(task.id);
    try {
      const res = await fetch("/api/admin/operations/cleaning", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: STAGES[idx + 1] }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Could not update the task.");
    } finally {
      setBusyId(null);
    }
  }

  async function assign(task: Task, assignedToId: string) {
    setBusyId(task.id);
    try {
      const res = await fetch("/api/admin/operations/cleaning", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, assignedToId: assignedToId || null }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Could not reassign the task.");
    } finally {
      setBusyId(null);
    }
  }

  async function create() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/operations/cleaning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, scheduledDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create the task.");
      toast.success("Cleaning task scheduled");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the task.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Cleaning board</h2>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Plus />
          New task
        </Button>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-5">
        {STAGES.map((stage) => {
          const stageTasks = tasks.filter((t) => t.status === stage);
          return (
            <div key={stage} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
                  {stage.toLowerCase().replace(/_/g, " ")}
                </h3>
                <span className="text-xs tabular-nums text-muted-foreground">{stageTasks.length}</span>
              </div>

              <ul className="mt-3 space-y-2">
                {stageTasks.length === 0 ? (
                  <li className="text-xs text-muted-foreground">Nothing here.</li>
                ) : (
                  stageTasks.slice(0, 8).map((task) => (
                    <li key={task.id} className="rounded-lg border border-border bg-background p-2.5">
                      <p className="text-xs font-medium text-foreground">{task.propertyName}</p>
                      <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">
                        {formatDateLong(task.scheduledDate)}
                      </p>
                      <select
                        className={`${selectClass} mt-1.5`}
                        value={task.assignedToId ?? ""}
                        onChange={(e) => assign(task, e.target.value)}
                        disabled={busyId === task.id}
                      >
                        <option value="">Unassigned</option>
                        {staff.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      {stage !== "READY" && (
                        <button
                          type="button"
                          onClick={() => advance(task)}
                          disabled={busyId === task.id}
                          className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-md border border-border py-1 text-[0.6875rem] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                        >
                          {busyId === task.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <>
                              Move to {STAGES[STAGES.indexOf(stage) + 1].toLowerCase().replace(/_/g, " ")}
                              <ChevronRight className="size-3" />
                            </>
                          )}
                        </button>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Schedule a cleaning task</DialogTitle>
            <DialogDescription>Starts in Cleaning required.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Property
              </Label>
              <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className={selectClass.replace("h-8 text-xs", "h-10 text-sm")}>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Date
              </Label>
              <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={create} disabled={creating || !propertyId}>
                {creating && <Loader2 className="animate-spin" />}
                Schedule
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
