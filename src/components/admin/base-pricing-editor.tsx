"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BasePricingEditor({
  propertyId,
  initial,
}: {
  propertyId: string;
  initial: { basePrice: number; cleaningFee: number };
}) {
  const router = useRouter();
  const [basePrice, setBasePrice] = useState(String(initial.basePrice));
  const [cleaningFee, setCleaningFee] = useState(String(initial.cleaningFee));
  const [saving, setSaving] = useState(false);

  const basePriceNumber = Number(basePrice);
  const cleaningFeeNumber = Number(cleaningFee);
  const valid = basePriceNumber > 0 && cleaningFeeNumber >= 0;

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/properties/${propertyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basePrice: basePriceNumber, cleaningFee: cleaningFeeNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save the price.");
      toast.success("Base pricing updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the price.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div>
        <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Base rate / night
        </Label>
        <Input type="number" min={1} value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
      </div>
      <div>
        <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Cleaning fee
        </Label>
        <Input type="number" min={0} value={cleaningFee} onChange={(e) => setCleaningFee(e.target.value)} />
      </div>
      <div className="flex items-end">
        <Button onClick={save} disabled={saving || !valid} className="w-full sm:w-auto">
          {saving && <Loader2 className="animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}
