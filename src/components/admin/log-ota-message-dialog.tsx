"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

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
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <MessageSquarePlus className="size-3.5" />
        Log OTA message
      </Button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log an OTA message</DialogTitle>
          <DialogDescription>
            Paste in an Airbnb, Booking.com or Agoda message so it lands in
            this inbox and alerts the team, same as a direct inquiry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Platform
            </Label>
            <Select value={source} onValueChange={(v) => setSource(v as typeof source)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Guest name
            </Label>
            <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Priya Sharma" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Email (optional)
              </Label>
              <Input value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="guest@email.com" />
            </div>
            <div>
              <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Phone (optional)
              </Label>
              <Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="+91…" />
            </div>
          </div>

          <div>
            <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Message
            </Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What the guest actually wrote…"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !guestName || !body}>
            {saving && <Loader2 className="animate-spin" />}
            Log message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
