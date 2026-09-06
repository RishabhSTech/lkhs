"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

const RULE_TYPES = [
  "WEEKEND", "FRIDAY", "SATURDAY", "HOLIDAY", "HIGH_DEMAND", "LONG_STAY", "LAST_MINUTE", "CUSTOM_RANGE",
] as const;

const NEEDS_DATE_RANGE = new Set(["HOLIDAY", "HIGH_DEMAND", "CUSTOM_RANGE"]);
const NEEDS_MIN_NIGHTS = new Set(["LONG_STAY", "LAST_MINUTE"]);

const selectClass =
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

type RuleRow = {
  id: string;
  name: string;
  type: string;
  adjustmentType: string;
  adjustmentValue: number;
  isActive: boolean;
};

export function PricingRuleEditor({
  propertyId,
  rules,
}: {
  propertyId: string;
  rules: RuleRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof RULE_TYPES)[number]>("WEEKEND");
  const [adjustmentType, setAdjustmentType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [adjustmentValue, setAdjustmentValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minNights, setMinNights] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function createRule() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/pricing/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          name,
          type,
          adjustmentType,
          adjustmentValue: Number(adjustmentValue),
          startDate: NEEDS_DATE_RANGE.has(type) ? startDate : undefined,
          endDate: NEEDS_DATE_RANGE.has(type) ? endDate : undefined,
          minNights: NEEDS_MIN_NIGHTS.has(type) && minNights ? Number(minNights) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save the rule.");
      toast.success("Pricing rule added");
      setOpen(false);
      setName("");
      setAdjustmentValue("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the rule.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleRule(rule: RuleRow) {
    setBusyId(rule.id);
    try {
      const res = await fetch("/api/admin/pricing/rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, isActive: !rule.isActive }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Could not update the rule.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteRule(rule: RuleRow) {
    setBusyId(rule.id);
    try {
      const res = await fetch("/api/admin/pricing/rules", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${rule.name} removed`);
      router.refresh();
    } catch {
      toast.error("Could not remove the rule.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
          Active rules
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Plus />
          Add rule
        </Button>
      </div>

      <ul className="mt-3 space-y-2">
        {rules.length === 0 && (
          <li className="text-sm text-muted-foreground">No rules yet - base rate applies every night.</li>
        )}
        {rules.map((rule) => (
          <li key={rule.id} className="flex items-center justify-between gap-3 text-sm">
            <span className={rule.isActive ? "text-foreground" : "text-muted-foreground line-through"}>
              {rule.name}
            </span>
            <span className="flex items-center gap-2">
              <Badge className="border-border bg-muted text-muted-foreground">
                {rule.type.toLowerCase().replace(/_/g, " ")}
              </Badge>
              <span
                className={
                  rule.adjustmentValue >= 0
                    ? "font-medium tabular-nums text-chart-1"
                    : "font-medium tabular-nums text-chart-2"
                }
              >
                {rule.adjustmentValue > 0 ? "+" : ""}
                {rule.adjustmentValue}
                {rule.adjustmentType === "PERCENT" ? "%" : "₹"}
              </span>
              {busyId === rule.id ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Switch checked={rule.isActive} onCheckedChange={() => toggleRule(rule)} />
                  <button
                    type="button"
                    onClick={() => deleteRule(rule)}
                    aria-label={`Delete ${rule.name}`}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a pricing rule</DialogTitle>
            <DialogDescription>Stacks on top of the base rate, highest priority first.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Name
              </Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Weekend premium" />
            </div>

            <div>
              <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Applies when
              </Label>
              <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={selectClass}>
                {RULE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.toLowerCase().replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            {NEEDS_DATE_RANGE.has(type) && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    From
                  </Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    To
                  </Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
            )}

            {NEEDS_MIN_NIGHTS.has(type) && (
              <div>
                <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {type === "LONG_STAY" ? "Minimum nights to qualify" : "Days before check-in"}
                </Label>
                <Input type="number" min={1} value={minNights} onChange={(e) => setMinNights(e.target.value)} placeholder={type === "LONG_STAY" ? "7" : "3"} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Adjustment
                </Label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value as "PERCENT" | "FIXED")}
                  className={selectClass}
                >
                  <option value="PERCENT">Percent</option>
                  <option value="FIXED">Fixed amount</option>
                </select>
              </div>
              <div>
                <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Value (+/-)
                </Label>
                <Input
                  type="number"
                  value={adjustmentValue}
                  onChange={(e) => setAdjustmentValue(e.target.value)}
                  placeholder={adjustmentType === "PERCENT" ? "15" : "500"}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={createRule} disabled={saving || !name || !adjustmentValue}>
                {saving && <Loader2 className="animate-spin" />}
                Save rule
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
