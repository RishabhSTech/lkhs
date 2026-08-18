import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { parseISODate } from "@/lib/dates";

const STATUSES = ["CHECKOUT", "CLEANING_REQUIRED", "CLEANING", "INSPECTION", "READY"] as const;

const createSchema = z.object({
  propertyId: z.string().min(1),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  assignedToId: z.string().min(1).optional(),
  notes: z.string().max(500).optional(),
});

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(STATUSES).optional(),
  assignedToId: z.string().nullable().optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the task details." }, { status: 400 });
  }
  const { user } = await getCurrentAdminUser();
  const data = parsed.data;

  const task = await db.cleaningTask.create({
    data: {
      propertyId: data.propertyId,
      scheduledDate: parseISODate(data.scheduledDate),
      assignedToId: data.assignedToId ?? null,
      notes: data.notes ?? null,
      status: "CLEANING_REQUIRED",
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "CLEANING_TASK_CREATED",
      entityType: "CleaningTask",
      entityId: task.id,
      summary: `Cleaning task scheduled for ${data.scheduledDate}`,
    },
  });

  return NextResponse.json({ id: task.id });
}

export async function PATCH(request: Request) {
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { user } = await getCurrentAdminUser();
  const { id, ...rest } = parsed.data;

  const task = await db.cleaningTask.update({
    where: { id },
    data: {
      ...rest,
      completedAt: rest.status === "READY" ? new Date() : undefined,
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "CLEANING_TASK_UPDATED",
      entityType: "CleaningTask",
      entityId: task.id,
      summary: `Cleaning task → ${task.status.toLowerCase().replace(/_/g, " ")}`,
    },
  });

  return NextResponse.json({ ok: true });
}
