"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveSheet } from "@/components/admin/responsive-sheet";
import {
  ChipGroup, Field, FormError, NativeSelect, fieldControlClass, todayISO,
} from "@/components/admin/form-fields";
import { CLEANING_STAGES, STAGE_LABEL, type CleaningStage } from "@/lib/operations/cleaning-stages";
import { formatDateLong } from "@/lib/format";

export type CleaningTaskRecord = {
  id: string;
  propertyId: string;
  propertyName: string;
  scheduledDate: string; // YYYY-MM-DD
  status: CleaningStage;
  assignedToId: string | null;
  assignedToName: string | null;
  notes: string | null;
  completedAt: string | null;
  reservation: { id: string; code: string; guestName: string } | null;
  nextArrival: { date: string; guestName: string } | null;
};

const FORM_ID = "cleaning-task-form";

export function CleaningTaskSheet({
  open,
  onOpenChange,
  session,
  canManage,
  properties,
  staff,
  task,
  defaults,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: number;
  canManage: boolean;
  properties: { id: string; name: string }[];
  staff: { id: string; name: string }[];
  task?: CleaningTaskRecord | null;
  defaults?: { propertyId?: string; scheduledDate?: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "save" | "delete">(null);
  const isEdit = Boolean(task);

  async function remove() {
    if (!task) return;
    const linked = Boolean(task.reservation);
    const ok = window.confirm(
      linked
        ? "Skip this turnover? It's closed out as ready and won't come back."
        : "Delete this cleaning task?",
    );
    if (!ok) return;
    setBusy("delete");
    try {
      const res = await fetch(`/api/admin/operations/cleaning?id=${task.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not remove the task.");
      toast.success(linked ? "Turnover skipped" : "Task deleted");
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove the task.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? task!.propertyName : "Schedule cleaning"}
      description={
        isEdit
          ? `${formatDateLong(task!.scheduledDate)}${task!.reservation ? ` · after ${task!.reservation.guestName}` : ""}`
          : "For a one-off deep clean or anything outside a checkout."
      }
      size="sm"
      footer={
        <div className="flex gap-2">
          {isEdit && canManage && (
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="lg:h-10"
              onClick={remove}
              disabled={busy !== null}
              aria-label={task!.reservation ? "Skip turnover" : "Delete task"}
            >
              {busy === "delete" ? <Loader2 className="animate-spin" /> : <Trash2 />}
            </Button>
          )}
          <Button type="submit" form={FORM_ID} size="lg" className="flex-1 lg:h-10" disabled={busy !== null}>
            {busy === "save" && <Loader2 className="animate-spin" />}
            {isEdit ? "Save" : "Schedule"}
          </Button>
        </div>
      }
    >
      <TaskFields
        key={session}
        canManage={canManage}
        properties={properties}
        staff={staff}
        task={task ?? null}
        defaults={defaults}
        onSaving={(s) => setBusy(s ? "save" : null)}
        onSaved={() => {
          onOpenChange(false);
          router.refresh();
        }}
      />
    </ResponsiveSheet>
  );
}

function TaskFields({
  canManage,
  properties,
  staff,
  task,
  defaults,
  onSaving,
  onSaved,
}: {
  canManage: boolean;
  properties: { id: string; name: string }[];
  staff: { id: string; name: string }[];
  task: CleaningTaskRecord | null;
  defaults?: { propertyId?: string; scheduledDate?: string };
  onSaving: (saving: boolean) => void;
  onSaved: () => void;
}) {
  const [propertyId, setPropertyId] = useState(
    task?.propertyId ?? defaults?.propertyId ?? (properties.length === 1 ? properties[0].id : ""),
  );
  const [scheduledDate, setScheduledDate] = useState(task?.scheduledDate ?? defaults?.scheduledDate ?? todayISO());
  const [assignedToId, setAssignedToId] = useState(task?.assignedToId ?? "");
  const [status, setStatus] = useState<CleaningStage>(task?.status ?? "CLEANING_REQUIRED");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!task && !propertyId) return setError("Pick the property.");
    onSaving(true);
    try {
      const payload = task
        ? {
            id: task.id,
            status: status !== task.status ? status : undefined,
            notes,
            ...(canManage
              ? {
                  scheduledDate: scheduledDate !== task.scheduledDate ? scheduledDate : undefined,
                  assignedToId: (assignedToId || null) !== task.assignedToId ? assignedToId || null : undefined,
                }
              : {}),
          }
        : { propertyId, scheduledDate, assignedToId: assignedToId || null, notes };
      const res = await fetch("/api/admin/operations/cleaning", {
        method: task ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save the task.");
      toast.success(task ? "Task updated" : "Cleaning scheduled");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the task.");
    } finally {
      onSaving(false);
    }
  }

  return (
    <form id={FORM_ID} onSubmit={submit} className="space-y-5">
      {!task && (
        <Field label="Property" required>
          <NativeSelect value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="">Choose property…</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}

      {task && (
        <Field label="Stage">
          <ChipGroup
            ariaLabel="Cleaning stage"
            value={status}
            onChange={setStatus}
            options={CLEANING_STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s] }))}
          />
        </Field>
      )}

      {canManage && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <Input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className={fieldControlClass}
            />
          </Field>
          <Field label="Assigned to">
            <NativeSelect value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
              <option value="">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      )}

      <Field label="Notes" hint="Linen count, damage, missing items, anything the next person should know.">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={500}
          className="text-base lg:text-sm"
        />
      </Field>

      <FormError>{error}</FormError>
    </form>
  );
}
