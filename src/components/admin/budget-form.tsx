"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const selectClass =
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function BudgetForm({
  propertyId,
  categories,
}: {
  propertyId: string;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, categoryId, amount: Number(amount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save the budget.");
      toast.success("Budget set for this month");
      setOpen(false);
      setAmount("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the budget.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Plus />
        Set budget
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set a monthly budget</DialogTitle>
            <DialogDescription>Applies to this calendar month; update anytime.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Category
              </Label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={selectClass}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Budget amount (₹)
              </Label>
              <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="20000" />
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={saving || !categoryId || !amount}>
                {saving && <Loader2 className="animate-spin" />}
                Save
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
