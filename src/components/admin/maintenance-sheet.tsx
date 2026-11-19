"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveSheet } from "@/components/admin/responsive-sheet";
import { ChipGroup, Field, FormError, NativeSelect, fieldControlClass } from "@/components/admin/form-fields";

export const MAINTENANCE_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
export const MAINTENANCE_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
type Status = (typeof MAINTENANCE_STATUSES)[number];
type Priority = (typeof MAINTENANCE_PRIORITIES)[number];

export type MaintenanceRecord = {
  id: string;
  title: string;
  propertyId?: string;
  propertyName: string;
  createdAt: string;
  status: Status;
  priority: Priority;
  assignedToId: string | null;
};

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
] as const;
const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
] as const;

const FORM_ID = "maintenance-form";

export function MaintenanceSheet({
  open,
  onOpenChange,
  session,
  canManage,
  properties,
  staff,
  task,
  defaultPropertyId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: number;
  canManage: boolean;
  properties: { id: string; name: string }[];
  staff: { id: string; name: string }[];
  task?: MaintenanceRecord | null;
  defaultPropertyId?: string;
}) {
  const [saving, setSaving] = useState(false);
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={task ? task.title : "Report an issue"}
      description={task ? task.propertyName : "Something broken or missing? The team is alerted straight away."}
      size="sm"
      footer={
        <Button type="submit" form={FORM_ID} size="lg" className="w-full lg:h-10" disabled={saving}>
          {saving && <Loader2 className="animate-spin" />}
          {task ? "Save" : "Report issue"}
        </Button>
      }
    >
      <MaintenanceFields
        key={session}
        canManage={canManage}
        properties={properties}
        staff={staff}
        task={task ?? null}
        defaultPropertyId={defaultPropertyId}
        setSaving={setSaving}
        onDone={() => onOpenChange(false)}
      />
    </ResponsiveSheet>
  );
}

function MaintenanceFields({
  canManage,
  properties,
  staff,
  task,
  defaultPropertyId,
  setSaving,
  onDone,
}: {
  canManage: boolean;
  properties: { id: string; name: string }[];
  staff: { id: string; name: string }[];
  task: MaintenanceRecord | null;
  defaultPropertyId?: string;
  setSaving: (saving: boolean) => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState(
    defaultPropertyId ?? (properties.length === 1 ? properties[0].id : ""),
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "MEDIUM");
  const [status, setStatus] = useState<Status>(task?.status ?? "OPEN");
  const [assignedToId, setAssignedToId] = useState(task?.assignedToId ?? "");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!task) {
      if (!propertyId) return setError("Pick the property.");
      if (title.trim().length < 3) return setError("Say what's wrong in a few words.");
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/operations/maintenance", {
        method: task ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          task
            ? { id: task.id, status, priority, assignedToId: assignedToId || null }
            : {
                propertyId,
                title: title.trim(),
                description: description.trim() || undefined,
                priority,
                ...(canManage && assignedToId ? { assignedToId } : {}),
              },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save the issue.");
      toast.success(task ? "Issue updated" : "Issue reported", {
        description: task ? undefined : "The team has been alerted.",
      });
      onDone();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the issue.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form id={FORM_ID} onSubmit={submit} className="space-y-5">
      {!task && (
        <>
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
          <Field label="What's wrong?" required>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Geyser not heating in master bath"
              maxLength={120}
              className={fieldControlClass}
            />
          </Field>
          <Field label="Details">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Where exactly, since when, anything already tried"
              className="text-base lg:text-sm"
            />
          </Field>
        </>
      )}

      <Field label="How urgent?">
        <ChipGroup ariaLabel="Priority" value={priority} onChange={setPriority} options={[...PRIORITY_OPTIONS]} />
      </Field>

      {task && (
        <Field label="Status">
          <ChipGroup ariaLabel="Status" value={status} onChange={setStatus} options={[...STATUS_OPTIONS]} />
        </Field>
      )}

      {canManage && (
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
      )}

      <FormError>{error}</FormError>
    </form>
  );
}
