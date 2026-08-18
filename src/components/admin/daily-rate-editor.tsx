"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateShort, formatINR } from "@/lib/format";

type Override = { date: string; price: number };

export function DailyRateEditor({
  propertyId,
  overrides,
}: {
  propertyId: string;
  overrides: Override[];
}) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyDate, setBusyDate] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/pricing/daily-rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, date, price: Number(price) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save the override.");
      toast.success(`${date} set to ${formatINR(Number(price))}`);
      setDate("");
      setPrice("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the override.");
    } finally {
      setSaving(false);
    }
  }

  async function clear(overrideDate: string) {
    setBusyDate(overrideDate);
    try {
      const res = await fetch("/api/admin/pricing/daily-rate", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, date: overrideDate }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Could not clear that override.");
    } finally {
      setBusyDate(null);
    }
  }

  return (
    <div className="mt-5 border-t border-border pt-4">
      <h3 className="text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
        Date overrides
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Wins over every rule for that one night.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
        <Input
          type="number"
          min={0}
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-28"
        />
        <Button size="sm" onClick={save} disabled={saving || !date || !price}>
          {saving && <Loader2 className="animate-spin" />}
          Set
        </Button>
      </div>

      {overrides.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {overrides.map((o) => (
            <li
              key={o.date}
              className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-foreground"
            >
              {formatDateShort(o.date)} · {formatINR(o.price)}
              {busyDate === o.date ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <button
                  type="button"
                  onClick={() => clear(o.date)}
                  aria-label={`Clear override for ${o.date}`}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
