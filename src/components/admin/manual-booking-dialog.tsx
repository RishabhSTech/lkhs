"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

type Property = {
  id: string;
  name: string;
  units: { id: string; name: string }[];
};

const selectClass =
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ManualBookingDialog({ properties }: { properties: Property[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [unitId, setUnitId] = useState(properties[0]?.units[0]?.id ?? "");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [adults, setAdults] = useState("1");
  const [children, setChildren] = useState("0");
  const [source, setSource] = useState("DIRECT");
  const [status, setStatus] = useState("CONFIRMED");
  const [grossRevenue, setGrossRevenue] = useState("");
  const [platformFee, setPlatformFee] = useState("0");
  const [hostTax, setHostTax] = useState("0");
  const [otherCharges, setOtherCharges] = useState("0");
  const [saving, setSaving] = useState(false);

  const selectedProperty = properties.find((property) => property.id === propertyId);

  function selectProperty(nextId: string) {
    const nextProperty = properties.find((property) => property.id === nextId);
    setPropertyId(nextId);
    setUnitId(nextProperty?.units[0]?.id ?? "");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/admin/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId, unitId, checkIn, checkOut, name, email, phone,
          adults: Number(adults), children: Number(children), source, status,
          grossRevenue: Number(grossRevenue), platformFee: Number(platformFee),
          hostTax: Number(hostTax), otherCharges: Number(otherCharges),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not create the booking.");
      toast.success(`Booking ${data.code} added`);
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the booking.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus />
        Add booking
      </DialogTrigger>
      <DialogContent className="max-h-[92svh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add booking</DialogTitle>
          <DialogDescription>Use this for historical or offline reservations. Past dates are allowed.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Property" required>
            <select value={propertyId} onChange={(event) => selectProperty(event.target.value)} className={selectClass} required>
              {properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
            </select>
          </Field>
          <Field label="Unit" required>
            <select value={unitId} onChange={(event) => setUnitId(event.target.value)} className={selectClass} required>
              {selectedProperty?.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
            </select>
          </Field>
          <Field label="Check-in" required><Input type="date" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} required /></Field>
          <Field label="Check-out" required><Input type="date" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} required /></Field>
          <Field label="Guest name" required><Input value={name} onChange={(event) => setName(event.target.value)} required /></Field>
          <Field label="Phone"><Input value={phone} onChange={(event) => setPhone(event.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
          <Field label="Source">
            <select value={source} onChange={(event) => setSource(event.target.value)} className={selectClass}>
              <option value="DIRECT">Direct</option><option value="AIRBNB">Airbnb</option><option value="BOOKING_COM">Booking.com</option><option value="AGODA">Agoda</option><option value="OTHER">Other</option>
            </select>
          </Field>
          <Field label="Gross booking amount (₹)" required><Input type="number" min="0" step="0.01" value={grossRevenue} onChange={(event) => setGrossRevenue(event.target.value)} placeholder="25000" required /></Field>
          <Field label="Platform fee (₹)"><Input type="number" min="0" step="0.01" value={platformFee} onChange={(event) => setPlatformFee(event.target.value)} /></Field>
          <Field label="Host tax (₹)"><Input type="number" min="0" step="0.01" value={hostTax} onChange={(event) => setHostTax(event.target.value)} /></Field>
          <Field label="Other charges (₹)"><Input type="number" min="0" step="0.01" value={otherCharges} onChange={(event) => setOtherCharges(event.target.value)} /></Field>
          <Field label="Adults" required><Input type="number" min="1" max="16" value={adults} onChange={(event) => setAdults(event.target.value)} required /></Field>
          <Field label="Children"><Input type="number" min="0" max="16" value={children} onChange={(event) => setChildren(event.target.value)} /></Field>
          <Field label="Status">
            <select value={status} onChange={(event) => setStatus(event.target.value)} className={selectClass}>
              <option value="CONFIRMED">Confirmed</option><option value="PENDING">Pending</option>
            </select>
          </Field>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={saving || !unitId}>{saving && <Loader2 className="animate-spin" />}Save booking</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <div><Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}{required && <span className="text-brand-azure"> *</span>}</Label>{children}</div>;
}