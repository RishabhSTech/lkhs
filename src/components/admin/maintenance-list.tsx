"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatDateLong } from "@/lib/format";

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const PRIORITY_STYLES: Record<string, string> = {
  URGENT: "border-destructive/25 bg-destructive/10 text-destructive",
  HIGH: "border-chart-2/25 bg-chart-2/10 text-chart-2",
  MEDIUM: "border-chart-4/25 bg-chart-4/10 text-chart-4",
  LOW: "border-border bg-muted text-muted-foreground",
};

const selectClass =
  "h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Task = {
  id: string;
  title: string;
  propertyName: string;
  createdAt: string;
  status: (typeof STATUSES)[number];
  priority: (typeof PRIORITIES)[number];
  assignedToId: string | null;
};

export function MaintenanceList({
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>("MEDIUM");
  const [creating, setCreating] = useState(false);

  async function update(task: Task, patch: Record<string, unknown>) {
    setBusyId(task.id);
    try {
      const res = await fetch("/api/admin/operations/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, ...patch }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Could not update the issue.");
    } finally {
      setBusyId(null);
    }
  }

  async function create() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/operations/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, title, description, priority }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not log the issue.");
      toast.success("Maintenance issue logged");
      setOpen(false);
      setTitle("");
      setDescription("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not log the issue.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Maintenance</h2>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Plus />
          New issue
        </Button>
      </div>

      {tasks.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No maintenance issues logged.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {tasks.map((task) => (
            <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{task.title}</p>
                <p className="text-xs text-muted-foreground">
                  {task.propertyName} · {formatDateLong(task.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={PRIORITY_STYLES[task.priority]}>{task.priority.toLowerCase()}</Badge>
                {busyId === task.id ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <select
                      className={selectClass}
                      value={task.assignedToId ?? ""}
                      onChange={(e) => update(task, { assignedToId: e.target.value || null })}
                    >
                      <option value="">Unassigned</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className={selectClass}
                      value={task.status}
                      onChange={(e) => update(task, { status: e.target.value })}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.toLowerCase().replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log a maintenance issue</DialogTitle>
            <DialogDescription>Notifies the team immediately if it&apos;s high or urgent.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Property
              </Label>
              <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className={`${selectClass} h-10 w-full text-sm`}>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Title
              </Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="AC not cooling — Master bedroom" />
            </div>
            <div>
              <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Priority
              </Label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className={`${selectClass} h-10 w-full text-sm`}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p.toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Details
              </Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="flex gap-2">
              <Button onClick={create} disabled={creating || !title || !propertyId}>
                {creating && <Loader2 className="animate-spin" />}
                Log issue
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
