"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle, Phone, Plus, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveSheet } from "@/components/admin/responsive-sheet";
import { Field, FormError, fieldControlClass } from "@/components/admin/form-fields";
import { cn } from "@/lib/utils";

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  propertyIds: string[];
  openTasks: number;
  dueToday: number;
  doneThisWeek: number;
};

function waLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
}

export function CleaningTeam({
  members,
  properties,
  canManage,
  unassignedOpen,
}: {
  members: TeamMember[];
  properties: { id: string; name: string }[];
  canManage: boolean;
  unassignedOpen: number;
}) {
  const [sheet, setSheet] = useState<{ open: boolean; session: number; member: TeamMember | null }>({
    open: false,
    session: 0,
    member: null,
  });
  const propertyName = new Map(properties.map((p) => [p.id, p.name]));

  return (
    <div className="space-y-4">
      {unassignedOpen > 0 && (
        <p className="rounded-xl border border-chart-4/30 bg-chart-4/8 px-4 py-3 text-sm text-foreground">
          <span className="font-semibold">{unassignedOpen}</span> open task{unassignedOpen === 1 ? " has" : "s have"} no
          one assigned. Assign cleaners to properties below and new turnovers go to them automatically.
        </p>
      )}

      {canManage && (
        <Button
          size="lg"
          variant="outline"
          className="w-full lg:h-10 lg:w-auto"
          onClick={() => setSheet((s) => ({ open: true, session: s.session + 1, member: null }))}
        >
          <Plus />
          Add cleaner
        </Button>
      )}

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No one on the cleaning team yet.</p>
      ) : (
        <ul className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {members.map((m) => (
            <li key={m.id} className="soft-card p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {m.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-foreground">{m.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">{m.role.toLowerCase()}</p>
                </div>
                {m.phone && (
                  <div className="flex shrink-0 gap-1.5">
                    <a
                      href={`tel:${m.phone}`}
                      aria-label={`Call ${m.name}`}
                      className="grid size-10 place-items-center rounded-full border border-border text-foreground"
                    >
                      <Phone className="size-4" />
                    </a>
                    <a
                      href={waLink(m.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`WhatsApp ${m.name}`}
                      className="grid size-10 place-items-center rounded-full border border-border text-chart-1"
                    >
                      <MessageCircle className="size-4" />
                    </a>
                  </div>
                )}
              </div>

              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Stat label="Due today" value={m.dueToday} highlight={m.dueToday > 0} />
                <Stat label="Open" value={m.openTasks} />
                <Stat label="Done (7d)" value={m.doneThisWeek} />
              </dl>

              <div className="mt-3 flex items-start justify-between gap-2">
                <p className="min-w-0 text-xs text-muted-foreground">
                  {m.propertyIds.length
                    ? m.propertyIds.map((id) => propertyName.get(id)).filter(Boolean).join(", ")
                    : "No properties assigned"}
                </p>
                {canManage && m.role === "CLEANER" && (
                  <button
                    type="button"
                    onClick={() => setSheet((s) => ({ open: true, session: s.session + 1, member: m }))}
                    className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary"
                  >
                    <Settings2 className="size-3.5" />
                    Properties
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <MemberSheet
          session={sheet.session}
          open={sheet.open}
          onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
          member={sheet.member}
          properties={properties}
        />
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={cn("rounded-lg py-2", highlight ? "bg-primary/8" : "bg-muted/60")}>
      <dt className="text-[0.6875rem] text-muted-foreground">{label}</dt>
      <dd className={cn("text-lg font-semibold tabular-nums", highlight ? "text-primary" : "text-foreground")}>{value}</dd>
    </div>
  );
}

function MemberSheet({
  session,
  open,
  onOpenChange,
  member,
  properties,
}: {
  session: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMember | null;
  properties: { id: string; name: string }[];
}) {
  const [saving, setSaving] = useState(false);
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={member ? member.name : "Add cleaner"}
      description={member ? "Which properties they look after." : "They get a cleaner login: their tasks and expenses only."}
      size="sm"
      footer={
        <Button type="submit" form="member-sheet-form" size="lg" className="w-full lg:h-10" disabled={saving}>
          {saving && <Loader2 className="animate-spin" />}
          {member ? "Save" : "Add to team"}
        </Button>
      }
    >
      <MemberForm
        key={session}
        member={member}
        properties={properties}
        setSaving={setSaving}
        onDone={() => onOpenChange(false)}
      />
    </ResponsiveSheet>
  );
}

function MemberForm({
  member,
  properties,
  setSaving,
  onDone,
}: {
  member: TeamMember | null;
  properties: { id: string; name: string }[];
  setSaving: (saving: boolean) => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(member?.propertyIds ?? []));
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/operations/team", {
        method: member ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          member
            ? { id: member.id, propertyIds: [...selected] }
            : { name, phone, email, propertyIds: [...selected] },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save.");
      toast.success(member ? "Properties updated" : `${name} added to the team`, {
        description: member ? undefined : "They sign in with their phone number.",
      });
      onDone();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
      <form id="member-sheet-form" onSubmit={submit} className="space-y-4">
        {!member && (
          <>
            <Field label="Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} className={fieldControlClass} />
            </Field>
            <Field label="Phone" required hint="Used to sign in and to call or WhatsApp them.">
              <Input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91"
                className={fieldControlClass}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldControlClass}
              />
            </Field>
          </>
        )}
        <fieldset>
          <legend className="mb-1.5 text-xs font-semibold text-muted-foreground">Looks after</legend>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {properties.map((p) => (
              <li key={p.id}>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 bg-card px-3.5 py-2.5">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="size-5 accent-[var(--primary)]"
                  />
                  <span className="text-sm text-foreground">{p.name}</span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-muted-foreground">
            New turnovers at a property go straight to its cleaner when it has exactly one.
          </p>
        </fieldset>
        <FormError>{error}</FormError>
      </form>
  );
}
