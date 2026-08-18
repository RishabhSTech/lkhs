"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClass =
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function PropertyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [propertyType, setPropertyType] = useState("HOME");
  const [locationArea, setLocationArea] = useState("");
  const [city, setCity] = useState("Indore");
  const [state, setState] = useState("Madhya Pradesh");
  const [addressLine, setAddressLine] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [maxGuests, setMaxGuests] = useState("4");
  const [bedrooms, setBedrooms] = useState("2");
  const [bathrooms, setBathrooms] = useState("2");
  const [beds, setBeds] = useState("2");
  const [basePrice, setBasePrice] = useState("");
  const [cleaningFee, setCleaningFee] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          propertyType,
          locationArea,
          city,
          state,
          addressLine,
          tagline: tagline || undefined,
          description,
          maxGuests: Number(maxGuests),
          bedrooms: Number(bedrooms),
          bathrooms: Number(bathrooms),
          beds: Number(beds),
          basePrice: Number(basePrice),
          cleaningFee: Number(cleaningFee),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create the property.");

      toast.success(`${name} added`, {
        description: "It's inactive until photos and amenities are filled in.",
      });
      router.push(`/admin/properties/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the property.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-xl border border-border bg-card p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Palasia Loft" required />
        </Field>

        <Field label="Type" required>
          <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className={selectClass}>
            <option value="HOME">Home</option>
            <option value="VILLA">Villa</option>
            <option value="APARTMENT">Apartment</option>
            <option value="COTTAGE">Cottage</option>
          </select>
        </Field>

        <Field label="Locality" required>
          <Input value={locationArea} onChange={(e) => setLocationArea(e.target.value)} placeholder="Palasia" required />
        </Field>

        <Field label="City" required>
          <Input value={city} onChange={(e) => setCity(e.target.value)} required />
        </Field>

        <Field label="State" required>
          <Input value={state} onChange={(e) => setState(e.target.value)} required />
        </Field>

        <Field label="Tagline">
          <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Sunlit loft near MG Road" />
        </Field>

        <Field label="Address" className="sm:col-span-2" required>
          <Input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="Full street address" required />
        </Field>

        <Field label="Max guests" required>
          <Input type="number" min={1} value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)} required />
        </Field>
        <Field label="Bedrooms" required>
          <Input type="number" min={0} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} required />
        </Field>
        <Field label="Bathrooms" required>
          <Input type="number" min={0} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} required />
        </Field>
        <Field label="Beds" required>
          <Input type="number" min={1} value={beds} onChange={(e) => setBeds(e.target.value)} required />
        </Field>

        <Field label="Base price / night (₹)" required>
          <Input type="number" min={0} value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="6500" required />
        </Field>
        <Field label="Cleaning fee (₹)">
          <Input type="number" min={0} value={cleaningFee} onChange={(e) => setCleaningFee(e.target.value)} />
        </Field>
      </div>

      <Field label="Description" required>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What makes this place worth staying at?"
          rows={4}
          required
        />
      </Field>

      <p className="rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
        The property is created inactive and not bookable yet. Add photos, amenities and
        highlights from its listing editor, then switch it to active.
      </p>

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/8 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" />}
          Create property
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  required,
  className,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
        {required && <span className="text-brand-azure"> *</span>}
      </Label>
      {children}
    </div>
  );
}
