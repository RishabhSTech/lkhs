import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";

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
  const { user } = await getCurrentAdminUser();
  const data = parsed.data;

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

  await db.notification.create({
    data: {
      type: "MAINTENANCE_ISSUE",
      title: "New maintenance issue",
      body: task.title,
      severity: data.priority === "URGENT" ? "CRITICAL" : data.priority === "HIGH" ? "WARNING" : "INFO",
      link: "/admin/operations",
    },
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
  const { user } = await getCurrentAdminUser();
  const { id, ...rest } = parsed.data;

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
