"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type PropertyStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export function PropertyStatusActions({
  propertyId,
  propertyName,
  status,
}: {
  propertyId: string;
  propertyName: string;
  status: PropertyStatus;
}) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState(status);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function updateStatus(nextStatus: PropertyStatus) {
    setSelectedStatus(nextStatus);
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/properties/${propertyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not update status.");
      toast.success(`${propertyName} is now ${nextStatus.toLowerCase()}.`);
      router.refresh();
    } catch (error) {
      setSelectedStatus(status);
      toast.error(error instanceof Error ? error.message : "Could not update status.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProperty() {
    if (!window.confirm(`Delete ${propertyName}? This cannot be undone.`)) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/properties/${propertyId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not delete the property.");
      toast.success(`${propertyName} deleted.`);
      router.push("/admin/properties");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the property.");
      setDeleting(false);
    }
  }

  const selectClass =
    "h-9 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Property status"
        value={selectedStatus}
        onChange={(event) => updateStatus(event.target.value as PropertyStatus)}
        className={selectClass}
        disabled={saving || deleting}
      >
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
        <option value="MAINTENANCE">Maintenance</option>
      </select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={deleteProperty}
        disabled={saving || deleting}
        className="text-destructive hover:text-destructive"
      >
        {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
        Delete
      </Button>
    </div>
  );
}