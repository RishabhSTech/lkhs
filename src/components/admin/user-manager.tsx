"use client";

import { useState } from "react";
import { AlertCircle, Loader2, PencilLine, UserRound } from "lucide-react";
import type { RoleName } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLE_OPTIONS: RoleName[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "FINANCE",
  "OPERATIONS",
  "CLEANER",
  "MARKETING",
];

const selectClass =
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

export type UserManagerUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: RoleName;
  propertyAssignments?: Array<{ property: { name: string } }>;
};

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  role: "ADMIN" as RoleName,
};

export function UserManager({ initialUsers }: { initialUsers: UserManagerUser[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function startEdit(user: UserManagerUser) {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email ?? "",
      phone: user.phone ?? "",
      role: user.role,
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      };

      if (!payload.name) throw new Error("Name is required.");
      if (!payload.email && !payload.phone) {
        throw new Error("Add either an email or a phone number.");
      }

      const res = await fetch("/api/admin/users", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId ? { ...payload, id: editingId } : payload,
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The user request failed.");

      const nextUser: UserManagerUser = data;
      setUsers((current) => {
        const filtered = current.filter((user) => user.id !== nextUser.id);
        return [...filtered, nextUser].sort((a, b) => a.name.localeCompare(b.name));
      });
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              User access
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              {editingId ? "Edit user" : "Add user"}
            </h2>
          </div>
          {editingId && (
            <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="user-name">Name</Label>
            <Input
              id="user-name"
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
              placeholder="Ava Singh"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
              placeholder="ava@limekraft.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-phone">Phone</Label>
            <Input
              id="user-phone"
              value={form.phone}
              onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
              placeholder="9876543210"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-role">Role</Label>
            <select
              id="user-role"
              value={form.role}
              onChange={(e) => setForm((current) => ({ ...current, role: e.target.value as RoleName }))}
              className={selectClass}
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/8 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editingId ? "Update user" : "Add user"}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Clear
              </Button>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <UserRound className="size-4" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Team
              </p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">Backend users</h2>
            </div>
          </div>
          <Badge className="border-chart-3/25 bg-chart-3/10 text-chart-3">{users.length} total</Badge>
        </div>

        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{user.name}</p>
                  <Badge className="border-border bg-muted text-muted-foreground">
                    {user.role.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {user.email ?? user.phone ?? "No contact on file"}
                  {user.propertyAssignments && user.propertyAssignments.length > 0
                    ? ` · ${user.propertyAssignments.length} property assignments`
                    : ""}
                </p>
              </div>

              <Button type="button" variant="outline" size="sm" onClick={() => startEdit(user)}>
                <PencilLine className="size-3.5" />
                Edit
              </Button>
            </div>
          ))}

          {users.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              No backend users yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
