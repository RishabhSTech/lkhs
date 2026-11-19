import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guardApi, inScope, outOfScope } from "@/lib/auth/guards";
import { CLEANING_MANAGE_ROLES, CLEANING_STAFF_ROLES, MAINTENANCE_REPORT_ROLES } from "@/lib/auth/roles";
import { alertTeam } from "@/lib/notifications/alert";

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const createSchema = z.object({
  propertyId: z.string().min(1),
  title: z.string().min(3, "Describe the issue."),
  description: z.string().max(1000).optional(),
  priority: z.enum(PRIORITIES).default("MEDIUM"),
  assignedToId: z.string().min(1).optional(),
});

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assignedToId: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the issue details." },
      { status: 400 },
    );
  }
  const auth = await guardApi(MAINTENANCE_REPORT_ROLES);
  if ("error" in auth) return auth.error;
  const { user, scope } = auth;
  const data = parsed.data;
  if (!inScope(scope, data.propertyId)) return outOfScope();
  // Only managers decide who fixes it; a cleaner just reports.
  if (data.assignedToId && !CLEANING_MANAGE_ROLES.includes(user.role)) data.assignedToId = undefined;
  if (data.assignedToId) {
    const assignee = await db.user.findUnique({ where: { id: data.assignedToId }, select: { role: true } });
    if (!assignee || !CLEANING_STAFF_ROLES.includes(assignee.role)) {
      return NextResponse.json({ error: "That person isn't on the operations team." }, { status: 400 });
    }
  }
  const property = await db.property.findUnique({ where: { id: data.propertyId }, select: { name: true } });
  if (!property) return NextResponse.json({ error: "That property no longer exists." }, { status: 404 });

  const task = await db.maintenanceTask.create({
    data: {
      propertyId: data.propertyId,
      title: data.title,
      description: data.description ?? null,
      priority: data.priority,
      assignedToId: data.assignedToId ?? null,
      status: "OPEN",
    },
  });

  await alertTeam({
    type: "MAINTENANCE_ISSUE",
    title: `Maintenance: ${property.name}`,
    body: `${task.title} · reported by ${user.name}`,
    severity: data.priority === "URGENT" ? "CRITICAL" : data.priority === "HIGH" ? "WARNING" : "INFO",
    link: "/admin/operations",
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "MAINTENANCE_TASK_CREATED",
      entityType: "MaintenanceTask",
      entityId: task.id,
      summary: task.title,
    },
  });

  return NextResponse.json({ id: task.id });
}

export async function PATCH(request: Request) {
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "We couldn't update that issue. Refresh and try again." }, { status: 400 });
  }
  const auth = await guardApi(CLEANING_MANAGE_ROLES, "Ask a manager to update this issue.");
  if ("error" in auth) return auth.error;
  const { user, scope } = auth;
  const { id, ...rest } = parsed.data;
  const existing = await db.maintenanceTask.findUnique({ where: { id }, select: { propertyId: true } });
  if (!existing) return NextResponse.json({ error: "That issue no longer exists." }, { status: 404 });
  if (!inScope(scope, existing.propertyId)) return outOfScope();

  const isResolving = rest.status === "RESOLVED" || rest.status === "CLOSED";
  const task = await db.maintenanceTask.update({
    where: { id },
    data: {
      ...rest,
      resolvedAt: isResolving ? new Date() : undefined,
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "MAINTENANCE_TASK_UPDATED",
      entityType: "MaintenanceTask",
      entityId: task.id,
      summary: `${task.title} → ${task.status.toLowerCase().replace(/_/g, " ")}`,
    },
  });

  return NextResponse.json({ ok: true });
}
