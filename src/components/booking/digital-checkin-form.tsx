"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type GovtIdType = "AADHAAR" | "PASSPORT" | "DRIVING_LICENCE" | "VOTER_ID" | "OTHER";

const ID_TYPE_LABELS: Record<GovtIdType, string> = {
  AADHAAR: "Aadhaar",
  PASSPORT: "Passport",
  DRIVING_LICENCE: "Driving Licence",
  VOTER_ID: "Voter ID",
  OTHER: "Other government ID",
};

type InitialGuest = {
  name: string;
  idType: GovtIdType | null;
  idNumber: string | null;
  idDocumentUrl: string | null;
};

type GuestInput = {
  name: string;
  idType: GovtIdType | null;
  idNumber: string;
  idDocumentUrl: string | null;
};

/**
 * The form behind /checkin/[code], linked from the DIGITAL_CHECKIN email.
 * One row per adult on the booking (children aren't asked for an ID - see
 * the template copy in src/lib/notifications/templates.ts). Submitting
 * replaces the whole guest list server-side (see the API route), so this
 * doubles as an edit form for a guest who wants to fix a typo.
 */
export function DigitalCheckinForm({
  code,
  adults,
  arriveBy,
  initialGuests,
}: {
  code: string;
  adults: number;
  arriveBy: string;
  initialGuests: InitialGuest[];
}) {
  const [guests, setGuests] = useState<GuestInput[]>(() =>
    Array.from({ length: adults }, (_, i) => {
      const existing = initialGuests[i];
      return {
        name: existing?.name ?? "",
        idType: existing?.idType ?? null,
        idNumber: existing?.idNumber ?? "",
        idDocumentUrl: existing?.idDocumentUrl ?? null,
      };
    }),
  );
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(
    initialGuests.length === adults && initialGuests.every((g) => g.idNumber && g.idType),
  );

  function update(index: number, patch: Partial<GuestInput>) {
    setGuests((prev) => prev.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  }

  async function handleUpload(index: number, file: File | undefined) {
    if (!file) return;
    setUploadingIndex(index);
    try {
      const presign = await fetch(`/api/checkin/${code}/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      const presignData = await presign.json();
      if (!presign.ok) throw new Error(presignData.error ?? "Could not get an upload URL.");

      const putRes = await fetch(presignData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload failed. Please try again.");

      update(index, { idDocumentUrl: presignData.publicUrl });
      toast.success("ID photo uploaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ID photo upload failed.");
    } finally {
      setUploadingIndex(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    for (const [i, guest] of guests.entries()) {
      if (guest.name.trim().length < 2) return setError(`Enter guest ${i + 1}'s full name.`);
      if (!guest.idType) return setError(`Pick an ID type for guest ${i + 1}.`);
      if (guest.idNumber.trim().length < 4) return setError(`Enter a valid ID number for guest ${i + 1}.`);
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/checkin/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guests: guests.map((g) => ({
            name: g.name.trim(),
            idType: g.idType,
            idNumber: g.idNumber.trim(),
            idDocumentUrl: g.idDocumentUrl || undefined,
          })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not save check-in. Please try again.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save check-in.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-6">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-mist" />
        <div>
          <h2 className="font-heading text-lg text-foreground">You&apos;re all checked in.</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            ID&apos;s on file for all {adults} {adults === 1 ? "adult" : "adults"}. Nothing else to
            do before {arriveBy} - see you then.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setDone(false)}>
            Edit details
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <p className="text-sm leading-relaxed text-muted-foreground">
        A government ID is required for every adult guest before arrival on {arriveBy}.
        Accepted: Aadhaar, Passport, Driving Licence or Voter ID.
      </p>

      {guests.map((guest, index) => (
        <div key={index} className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-[0.6875rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            {index === 0 ? "Primary guest" : `Guest ${index + 1}`}
          </h3>

          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 text-xs font-medium text-muted-foreground">
                Full name
              </Label>
              <Input
                value={guest.name}
                onChange={(e) => update(index, { name: e.target.value })}
                placeholder="As on their ID"
                required
              />
            </div>

            <div>
              <Label className="mb-1.5 text-xs font-medium text-muted-foreground">
                ID type
              </Label>
              <Select
                value={guest.idType ?? undefined}
                onValueChange={(value) => update(index, { idType: value as GovtIdType })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select ID type" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ID_TYPE_LABELS) as GovtIdType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {ID_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1.5 text-xs font-medium text-muted-foreground">
                ID number
              </Label>
              <Input
                value={guest.idNumber}
                onChange={(e) => update(index, { idNumber: e.target.value })}
                placeholder="e.g. XXXX XXXX 1234"
              />
            </div>

            <div>
              <Label className="mb-1.5 text-xs font-medium text-muted-foreground">
                Photo of ID{" "}
                <span className="font-normal normal-case text-muted-foreground/70">
                  (optional)
                </span>
              </Label>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => handleUpload(index, e.target.files?.[0])}
                disabled={uploadingIndex === index}
              />
              {uploadingIndex === index && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" /> Uploading...
                </p>
              )}
              {guest.idDocumentUrl && uploadingIndex !== index && (
                <p className="mt-1.5 text-xs text-brand-mist">Photo attached</p>
              )}
            </div>
          </div>
        </div>
      ))}

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/8 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={submitting || uploadingIndex !== null}
        className="w-full sm:w-auto"
      >
        {submitting && <Loader2 className="animate-spin" />}
        Complete digital check-in
      </Button>
    </form>
  );
}
