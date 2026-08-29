import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { parseISODate } from "@/lib/dates";
import { enqueueChannelSync } from "@/lib/queue";

const RULE_TYPES = [
  "WEEKEND", "FRIDAY", "SATURDAY", "HOLIDAY", "HIGH_DEMAND", "LONG_STAY", "LAST_MINUTE", "CUSTOM_RANGE",
] as const;

const createSchema = z.object({
  propertyId: z.string().min(1),
  name: z.string().min(2, "Name the rule."),
  type: z.enum(RULE_TYPES),
  adjustmentType: z.enum(["PERCENT", "FIXED"]),
  adjustmentValue: z.number(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  minNights: z.number().int().positive().optional(),
  priority: z.number().int().default(0),
});

const patchSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean().optional(),
});

const deleteSchema = z.object({ id: z.string().min(1) });

async function syncPropertyChannels(propertyId: string) {
  const links = await db.channelProperty.findMany({
    where: { propertyId, externalListingId: { not: null } },
    select: { id: true },
  });
  await Promise.all(
    links.map((link) => enqueueChannelSync({ channelPropertyId: link.id, reason: "RATE_CHANGED" })),
  );
}

export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the rule details." },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const [{ user }, property] = await Promise.all([
    getCurrentAdminUser(),
    db.property.findUnique({ where: { id: data.propertyId }, select: { name: true } }),
  ]);
  if (!property) {
    return NextResponse.json({ error: "That property no longer exists." }, { status: 404 });
  }

  const rule = await db.pricingRule.create({
    data: {
      propertyId: data.propertyId,
      name: data.name,
      type: data.type,
      adjustmentType: data.adjustmentType,
      adjustmentValue: data.adjustmentValue,
      startDate: data.startDate ? parseISODate(data.startDate) : null,
      endDate: data.endDate ? parseISODate(data.endDate) : null,
      minNights: data.minNights ?? null,
      priority: data.priority,
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "PRICING_RULE_CREATED",
      entityType: "PricingRule",
      entityId: rule.id,
      summary: `${property.name} · ${rule.name} (${data.adjustmentValue}${data.adjustmentType === "PERCENT" ? "%" : "₹"})`,
    },
  });

  await syncPropertyChannels(data.propertyId);

  return NextResponse.json({ id: rule.id });
}

export async function PATCH(request: Request) {
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "We couldn't update that pricing rule — check the values and try again." }, { status: 400 });
  }
  const { user } = await getCurrentAdminUser();
  const rule = await db.pricingRule.update({
    where: { id: parsed.data.id },
    data: { isActive: parsed.data.isActive },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "PRICING_RULE_UPDATED",
      entityType: "PricingRule",
      entityId: rule.id,
      summary: `${rule.name} ${rule.isActive ? "enabled" : "disabled"}`,
    },
  });

  await syncPropertyChannels(rule.propertyId);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "We couldn't delete that pricing rule. Refresh and try again." }, { status: 400 });
  }
  const { user } = await getCurrentAdminUser();
  const rule = await db.pricingRule.delete({ where: { id: parsed.data.id } });

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "PRICING_RULE_DELETED",
      entityType: "PricingRule",
      entityId: rule.id,
      summary: `${rule.name} removed`,
    },
  });

  await syncPropertyChannels(rule.propertyId);

  return NextResponse.json({ ok: true });
}
