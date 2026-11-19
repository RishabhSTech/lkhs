"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2, Plus } from "lucide-react";
import type { RoleName } from "@prisma/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveSheet } from "@/components/admin/responsive-sheet";
import { Field, FormError, NativeSelect, fieldControlClass } from "@/components/admin/form-fields";
import { SCOPABLE_ROLES } from "@/lib/auth/roles";

const ROLE_OPTIONS: { value: RoleName; label: string; hint: string }[] = [
  { value: "SUPER_ADMIN", label: "Super admin", hint: "Everything, including users and integrations." },
  { value: "ADMIN", label: "Admin", hint: "Everything except managing users." },
  { value: "MANAGER", label: "Manager", hint: "Bookings, pricing, listings, cleaning team." },
  { value: "FINANCE", label: "Finance", hint: "P&L, expenses, approvals, reports." },
  { value: "OPERATIONS", label: "Operations", hint: "Bookings, cleaning, maintenance." },
  { value: "CLEANER", label: "Cleaner", hint: "Their cleaning tasks and expenses only." },
  { value: "MARKETING", label: "Marketing", hint: "Listings, photos and reviews." },
];

export type UserManagerUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: RoleName;
  propertyAssignments?: Array<{ property: { id?: string; name: string } }>;
};

type Sheet = { open: boolean; session: number; user: UserManagerUser | null };

export function UserManager({
  initialUsers,
  properties,
}: {
  initialUsers: UserManagerUser[];
  properties: { id: string; name: string }[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [sheet, setSheet] = useState<Sheet>({ open: false, session: 0, user: null });
  const [saving, setSaving] = useState(false);

  const open = (user: UserManagerUser | null) => setSheet((s) => ({ open: true, session: s.session + 1, user }));

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{users.length} people</p>
        <Button size="sm" onClick={() => open(null)}>
          <Plus />
          Add user
        </Button>
      </div>

      <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {users.map((user) => {
          const scoped = user.propertyAssignments?.length ?? 0;
          return (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => open(user)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-muted/60 lg:hover:bg-muted/40"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-blue/10 text-xs font-semibold text-brand-blue">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-foreground">{user.name}</span>
                    <Badge className="border-border bg-muted text-muted-foreground">
                      {ROLE_OPTIONS.find((r) => r.value === user.role)?.label ?? user.role.toLowerCase()}
                    </Badge>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {user.email ?? user.phone ?? "No contact on file"}
                    {SCOPABLE_ROLES.includes(user.role) &&
                      (scoped ? ` · ${scoped} ${scoped === 1 ? "property" : "properties"}` : " · all properties")}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          );
        })}
        {users.length === 0 && <li className="p-6 text-sm text-muted-foreground">No back-office users yet.</li>}
      </ul>

      <ResponsiveSheet
        open={sheet.open}
        onOpenChange={(o) => setSheet((s) => ({ ...s, open: o }))}
        title={sheet.user ? sheet.user.name : "Add user"}
        description="They sign in with this email or phone number."
        size="md"
        footer={
          <Button type="submit" form="user-form" size="lg" className="w-full lg:h-10" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            {sheet.user ? "Save changes" : "Add user"}
          </Button>
        }
      >
        <UserForm
          key={sheet.session}
          user={sheet.user}
          properties={properties}
          setSaving={setSaving}
          onSaved={(saved) => {
            setUsers((current) =>
              [...current.filter((u) => u.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name)),
            );
            setSheet((s) => ({ ...s, open: false }));
          }}
        />
      </ResponsiveSheet>
    </div>
  );
}

function UserForm({
  user,
  properties,
  setSaving,
  onSaved,
}: {
  user: UserManagerUser | null;
  properties: { id: string; name: string }[];
  setSaving: (saving: boolean) => void;
  onSaved: (user: UserManagerUser) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [role, setRole] = useState<RoleName>(user?.role ?? "OPERATIONS");
  const [selected, setSelected] = useState<Set<string>>(
    new Set((user?.propertyAssignments ?? []).map((a) => a.property.id).filter((id): id is string => Boolean(id))),
  );
  const [error, setError] = useState<string | null>(null);
  const scopable = SCOPABLE_ROLES.includes(role);

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
    if (name.trim().length < 2) return setError("Enter their name.");
    if (!email.trim() && !phone.trim()) return setError("Add an email or a phone number to sign in with.");
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        propertyIds: scopable ? [...selected] : [],
      };
      const res = await fetch("/api/admin/users", {
        method: user ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user ? { ...body, id: user.id } : body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save that user.");
      toast.success(user ? "User updated" : `${body.name} added`);
      onSaved(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form id="user-form" onSubmit={submit} className="space-y-4">
      <Field label="Name" required>
        <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" className={fieldControlClass} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Phone">
          <Input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91" className={fieldControlClass} />
        </Field>
        <Field label="Email">
          <Input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldControlClass} />
        </Field>
      </div>
      <Field label="Role" hint={ROLE_OPTIONS.find((r) => r.value === role)?.hint}>
        <NativeSelect value={role} onChange={(e) => setRole(e.target.value as RoleName)}>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </NativeSelect>
      </Field>

      {scopable && properties.length > 0 && (
        <fieldset>
          <legend className="mb-1.5 text-xs font-semibold text-muted-foreground">Properties they can access</legend>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {properties.map((p) => (
              <li key={p.id}>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 bg-card px-3.5 py-2.5">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="size-5 accent-[var(--color-brand-blue)]"
                  />
                  <span className="text-sm text-foreground">{p.name}</span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {selected.size === 0
              ? "None ticked = access to every property. Tick some to limit them to those."
              : `Limited to ${selected.size} ${selected.size === 1 ? "property" : "properties"} - portfolio-wide screens are hidden.`}
          </p>
        </fieldset>
      )}

      <FormError>{error}</FormError>
    </form>
  );
}
