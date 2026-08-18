import { db } from "@/lib/db";
import { buildQuote } from "@/lib/pricing/engine";
import { getBlockedDates } from "@/lib/booking/availability";
import { getOtaProvider } from "@/lib/channels/provider";
import { addMonths, todayUTC } from "@/lib/dates";
import type { ChannelSyncJob } from "@/lib/queue";

const SYNC_HORIZON_MONTHS = 3;

export async function processChannelSync(job: ChannelSyncJob) {
  const link = await db.channelProperty.findUnique({
    where: { id: job.channelPropertyId },
    include: { channel: true, property: { include: { pricingRules: { where: { isActive: true } } } } },
  });
  if (!link) return;

  const syncLog = await db.channelSyncLog.create({
    data: { channelPropertyId: link.id, direction: "PUSH", status: "RUNNING" },
  });

  if (!link.externalListingId) {
    await db.channelSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "ERROR",
        message: "No listing ID mapped for this property yet.",
        finishedAt: new Date(),
      },
    });
    return;
  }

  const from = todayUTC();
  const to = addMonths(from, SYNC_HORIZON_MONTHS);

  const [overrides, blockedDates] = await Promise.all([
    db.dailyRate.findMany({
      where: { propertyId: link.propertyId, date: { gte: from, lte: to } },
    }),
    getBlockedDates(link.propertyId, from, to),
  ]);

  const quote = buildQuote({
    basePrice: Number(link.property.basePrice),
    cleaningFee: Number(link.property.cleaningFee),
    checkIn: from,
    checkOut: to,
    rules: link.property.pricingRules,
    dailyRateOverrides: Object.fromEntries(
      overrides.map((o) => [o.date.toISOString().slice(0, 10), Number(o.price)]),
    ),
  });

  const blocked = new Set(blockedDates);
  const provider = getOtaProvider(link.channel.code);
  const result = await provider.push({
    externalListingId: link.externalListingId,
    calendar: quote.nights.map((n) => ({
      date: n.date,
      available: !blocked.has(n.date),
      price: n.price,
    })),
  });

  await db.$transaction([
    db.channelSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: result.ok ? "SUCCESS" : "ERROR",
        message: result.message,
        finishedAt: new Date(),
      },
    }),
    db.channelProperty.update({
      where: { id: link.id },
      data: {
        status: result.ok ? "CONNECTED" : "ERROR",
        ...(result.ok ? { lastSyncAt: new Date() } : {}),
      },
    }),
  ]);
}
