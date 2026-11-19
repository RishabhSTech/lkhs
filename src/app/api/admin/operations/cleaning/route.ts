import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { getPropertyScope, inScope, outOfScope } from "@/lib/auth/guards";
import { CLEANING_MANAGE_ROLES, CLEANING_STAFF_ROLES } from "@/lib/auth/roles";
import { parseISODate } from "@/lib/dates";

const STATUSES = ["CHECKOUT", "CLEANING_REQUIRED", "CLEANING", "INSPECTION", "READY"] as const;
const STATUS_LABEL: Record<(typeof STATUSES)[number], string> = {
  CHECKOUT: "awaiting checkout",
  CLEANING_REQUIRED: "to clean",
  CLEANING: "cleaning",
  INSPECTION: "inspection",
  READY: "ready",
};

const createSchema = z.object({
  propertyId: z.string().min(1),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  assignedToId: z.string().min(1).nullable().optional(),
  notes: z.string().max(500).optional(),
});

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(STATUSES).optional(),
  assignedToId: z.string().nullable().optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(500).nullable().optional(),
});

async function assertAssignee(assignedToId: string | null | undefined) {
  if (!assignedToId) return true;
  const staff = await db.user.findUnique({ where: { id: assignedToId }, select: { role: true } });
  return Boolean(staff && CLEANING_STAFF_ROLES.includes(staff.role));
}

export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the task details - something there isn't right." }, { status: 400 });
  }
  const { user } = await getCurrentAdminUser();
  if (!CLEANING_MANAGE_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Only the operations team can schedule cleaning." }, { status: 403 });
  }
  const data = parsed.data;
  if (!inScope(await getPropertyScope(user), data.propertyId)) return outOfScope();
  if (!(await assertAssignee(data.assignedToId))) {
    return NextResponse.json({ error: "That person isn't on the cleaning team." }, { status: 400 });
  }

  const task = await db.cleaningTask.create({
    data: {
      propertyId: data.propertyId,
      scheduledDate: parseISODate(data.scheduledDate),
      assignedToId: data.assignedToId ?? null,
      notes: data.notes?.trim() || null,
      status: "CLEANING_REQUIRED",
    },
    include: { property: { select: { name: true } } },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "CLEANING_TASK_CREATED",
      entityType: "CleaningTask",
      entityId: task.id,
      summary: `Cleaning scheduled at ${task.property.name} for ${data.scheduledDate}`,
    },
  });

  return NextResponse.json({ id: task.id });
}

/**
 * Managers can change anything on a task. A cleaner can only move a task
 * that's theirs (or unassigned - starting it claims it) along the stages and
 * leave a note; dates and reassignment stay with the managers.
 */
export async function PATCH(request: Request) {
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "We couldn't update that task. Refresh and try again." }, { status: 400 });
  }
  const { user } = await getCurrentAdminUser();
  const { id, ...rest } = parsed.data;

  const existing = await db.cleaningTask.findUnique({
    where: { id },
    include: { property: { select: { name: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "That task no longer exists." }, { status: 404 });
  }
  if (!inScope(await getPropertyScope(user), existing.propertyId)) return outOfScope();

  const isManager = CLEANING_MANAGE_ROLES.includes(user.role);
  if (!isManager) {
    const ownsTask = existing.assignedToId === user.id || existing.assignedToId === null;
    const touchesManagerFields = rest.scheduledDate !== undefined || rest.assignedToId !== undefined;
    if (!CLEANING_STAFF_ROLES.includes(user.role) || !ownsTask || touchesManagerFields) {
      return NextResponse.json({ error: "Ask a manager to change this task." }, { status: 403 });
    }
  }
  if (rest.assignedToId !== undefined && !(await assertAssignee(rest.assignedToId))) {
    return NextResponse.json({ error: "That person isn't on the cleaning team." }, { status: 400 });
  }

  const claim = !isManager && existing.assignedToId === null && rest.status ? { assignedToId: user.id } : {};

  const task = await db.cleaningTask.update({
    where: { id },
    data: {
      status: rest.status,
      assignedToId: rest.assignedToId,
      notes: rest.notes === undefined ? undefined : rest.notes?.trim() || null,
      scheduledDate: rest.scheduledDate ? parseISODate(rest.scheduledDate) : undefined,
      completedAt: rest.status ? (rest.status === "READY" ? new Date() : null) : undefined,
      ...claim,
    },
  });

  const summary = rest.status
    ? `${existing.property.name} → ${STATUS_LABEL[task.status]}`
    : `${existing.property.name} cleaning task updated`;
  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "CLEANING_TASK_UPDATED",
      entityType: "CleaningTask",
      entityId: task.id,
      summary,
    },
  });

  return NextResponse.json({ ok: true, status: task.status });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Task id is required." }, { status: 400 });
  const { user } = await getCurrentAdminUser();
  if (!CLEANING_MANAGE_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Only the operations team can delete tasks." }, { status: 403 });
  }
  const task = await db.cleaningTask.findUnique({
    where: { id },
    include: { property: { select: { name: true } } },
  });
  if (!task) return NextResponse.json({ error: "That task no longer exists." }, { status: 404 });
  if (!inScope(await getPropertyScope(user), task.propertyId)) return outOfScope();

  // A turnover generated from a booking would just be re-created by the
  // scheduler, so "deleting" it closes it out as skipped instead.
  if (task.reservationId) {
    await db.cleaningTask.update({
      where: { id },
      data: {
        status: "READY",
        completedAt: new Date(),
        notes: [task.notes, `Skipped by ${user.name}`].filter(Boolean).join(" · "),
      },
    });
    await db.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        action: "CLEANING_TASK_SKIPPED",
        entityType: "CleaningTask",
        entityId: id,
        summary: `${task.property.name} turnover skipped`,
      },
    });
    return NextResponse.json({ skipped: true });
  }

  await db.$transaction([
    db.cleaningTask.delete({ where: { id } }),
    db.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        action: "CLEANING_TASK_DELETED",
        entityType: "CleaningTask",
        entityId: id,
        summary: `${task.property.name} cleaning task removed`,
      },
    }),
  ]);
  return NextResponse.json({ deleted: true });
}
