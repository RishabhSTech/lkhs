"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveSheet } from "@/components/admin/responsive-sheet";
import { ChipGroup, Field, fieldControlClass } from "@/components/admin/form-fields";

const SOURCES = [
  { value: "AIRBNB", label: "Airbnb" },
  { value: "BOOKING_COM", label: "Booking.com" },
  { value: "AGODA", label: "Agoda" },
] as const;

/**
 * There's no messaging API for Airbnb/Booking.com/Agoda yet (see
 * /admin/channels) - this is the bridge until there is. Paste a message the
 * moment it shows up on that app and it joins the same inbox, with the same
 * instant alert, as a website inquiry.
 */
export function LogOtaMessageDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState<(typeof SOURCES)[number]["value"]>("AIRBNB");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [body, setBody] = useState("");

  function reset() {
    setSource("AIRBNB");
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setBody("");
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/messages/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, guestName, guestEmail, guestPhone, body }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not log that message.");

      toast.success("Logged - the team's been alerted.");
      reset();
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not log that message.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <MessageSquarePlus className="size-3.5" />
        Log OTA message
      </Button>

      <ResponsiveSheet
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
        title="Log an OTA message"
        description="Paste an Airbnb, Booking.com or Agoda message so it lands here and alerts the team."
        size="sm"
        footer={
          <Button size="lg" className="w-full lg:h-10" onClick={save} disabled={saving || !guestName.trim() || !body.trim()}>
            {saving && <Loader2 className="animate-spin" />}
            Log message
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="Platform">
            <ChipGroup ariaLabel="Platform" value={source} onChange={setSource} options={[...SOURCES]} />
          </Field>
          <Field label="Guest name" required>
            <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Priya Sharma" className={fieldControlClass} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Phone">
              <Input type="tel" inputMode="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="+91" className={fieldControlClass} />
            </Field>
            <Field label="Email">
              <Input type="email" inputMode="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="guest@email.com" className={fieldControlClass} />
            </Field>
          </div>
          <Field label="Message" required>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What the guest actually wrote…"
              rows={5}
              className="text-base lg:text-sm"
            />
          </Field>
        </div>
      </ResponsiveSheet>
    </>
  );
}
