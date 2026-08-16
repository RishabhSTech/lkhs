import "server-only";
import { db } from "@/lib/db";
import {
  addDays, addMonths, endOfMonthUTC, startOfMonthUTC, todayUTC,
} from "@/lib/dates";
import {
  buildMonthlySeries, buildPL, type TxWithCategory,
} from "@/lib/finance/calculations";

export type PortfolioKpis = {
  todayRevenue: number;
  occupancyPercent: number;
  adr: number;
  revPar: number;
  arrivalsToday: number;
  departuresToday: number;
  openIssues: number;
  pendingPaymentsAmount: number;
};

export async function getPortfolioKpis(): Promise<PortfolioKpis> {
  const today = todayUTC();
  const tomorrow = addDays(today, 1);
  const monthStart = startOfMonthUTC(today);
  const monthEnd = endOfMonthUTC(today);

  const [
    todayRevenueAgg,
    unitCount,
    nightsThisMonth,
    monthReservations,
    arrivals,
    departures,
    openIssues,
    pendingPayments,
  ] = await Promise.all([
    db.transaction.aggregate({
      where: { type: "REVENUE", date: today },
      _sum: { amount: true },
    }),
    db.unit.count(),
    db.inventoryNight.count({
      where: { date: { gte: monthStart, lte: monthEnd }, reservationId: { not: null } },
    }),
    db.reservation.findMany({
      where: {
        status: { in: ["CONFIRMED", "COMPLETED"] },
        checkIn: { gte: monthStart, lte: monthEnd },
      },
      select: { subtotal: true, nights: true },
    }),
    db.reservation.count({
      where: { checkIn: today, status: { in: ["CONFIRMED", "COMPLETED"] } },
    }),
    db.reservation.count({
      where: { checkOut: today, status: { in: ["CONFIRMED", "COMPLETED"] } },
    }),
    db.maintenanceTask.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    db.transaction.aggregate({
      where: { status: { in: ["PENDING", "OVERDUE"] }, type: "EXPENSE" },
      _sum: { amount: true },
    }),
  ]);

  const daysInMonth = monthEnd.getUTCDate();
  const availableNights = unitCount * daysInMonth;
  const occupancyPercent =
    availableNights > 0 ? (nightsThisMonth / availableNights) * 100 : 0;

  const roomRevenue = monthReservations.reduce(
    (sum, r) => sum + Number(r.subtotal),
    0,
  );
  const soldNights = monthReservations.reduce((sum, r) => sum + r.nights, 0);
  const adr = soldNights > 0 ? roomRevenue / soldNights : 0;
  const revPar = availableNights > 0 ? roomRevenue / availableNights : 0;

  void tomorrow;

  return {
    todayRevenue: Number(todayRevenueAgg._sum.amount ?? 0),
    occupancyPercent,
    adr,
    revPar,
    arrivalsToday: arrivals,
    departuresToday: departures,
    openIssues,
    pendingPaymentsAmount: Number(pendingPayments._sum.amount ?? 0),
  };
}

export async function getRevenueSeries(monthsBack = 6) {
  const today = todayUTC();
  const from = startOfMonthUTC(addMonths(today, -(monthsBack - 1)));

  const txs = (await db.transaction.findMany({
    where: { date: { gte: from } },
    include: { category: true },
  })) as TxWithCategory[];

  const months = Array.from({ length: monthsBack }, (_, i) =>
    startOfMonthUTC(addMonths(from, i)),
  );

  return buildMonthlySeries(txs, months);
}

export async function getOccupancySeries(monthsBack = 6) {
  const today = todayUTC();
  const unitCount = await db.unit.count();
  const points: { month: string; occupancy: number }[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const monthStart = startOfMonthUTC(addMonths(today, -i));
    const monthEnd = endOfMonthUTC(monthStart);
    const nights = await db.inventoryNight.count({
      where: {
        date: { gte: monthStart, lte: monthEnd },
        reservationId: { not: null },
      },
    });
    const available = unitCount * monthEnd.getUTCDate();
    points.push({
      month: monthStart.toISOString().slice(0, 7),
      occupancy: available > 0 ? (nights / available) * 100 : 0,
    });
  }

  return points;
}

export async function getUpcomingReservations(limit = 6) {
  const today = todayUTC();
  return db.reservation.findMany({
    where: { checkIn: { gte: today }, status: "CONFIRMED" },
    include: {
      property: { select: { name: true } },
      guest: { select: { name: true } },
    },
    orderBy: { checkIn: "asc" },
    take: limit,
  });
}

export async function getTodayOperations() {
  const today = todayUTC();
  const [arrivals, departures, cleaning] = await Promise.all([
    db.reservation.findMany({
      where: { checkIn: today, status: { in: ["CONFIRMED", "COMPLETED"] } },
      include: {
        property: { select: { name: true } },
        guest: { select: { name: true, phone: true } },
      },
    }),
    db.reservation.findMany({
      where: { checkOut: today, status: { in: ["CONFIRMED", "COMPLETED"] } },
      include: {
        property: { select: { name: true } },
        guest: { select: { name: true } },
      },
    }),
    db.cleaningTask.findMany({
      where: { status: { not: "READY" } },
      include: {
        property: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
      orderBy: { scheduledDate: "asc" },
      take: 8,
    }),
  ]);

  return { arrivals, departures, cleaning };
}

export async function getChannelHealth() {
  const channelProperties = await db.channelProperty.findMany({
    include: {
      channel: true,
      property: { select: { name: true } },
      syncLogs: { orderBy: { startedAt: "desc" }, take: 1 },
    },
  });

  const byChannel = new Map<
    string,
    { name: string; connected: number; total: number; errors: number; lastSync: Date | null }
  >();

  for (const cp of channelProperties) {
    const entry = byChannel.get(cp.channel.code) ?? {
      name: cp.channel.name,
      connected: 0,
      total: 0,
      errors: 0,
      lastSync: null,
    };
    entry.total += 1;
    if (cp.status === "CONNECTED") entry.connected += 1;
    if (cp.status === "ERROR") entry.errors += 1;
    if (cp.lastSyncAt && (!entry.lastSync || cp.lastSyncAt > entry.lastSync)) {
      entry.lastSync = cp.lastSyncAt;
    }
    byChannel.set(cp.channel.code, entry);
  }

  return [...byChannel.entries()].map(([code, value]) => ({ code, ...value }));
}

/** Portfolio-wide P&L for the current month, derived from transactions. */
export async function getCurrentMonthPL() {
  const today = todayUTC();
  const txs = (await db.transaction.findMany({
    where: {
      date: { gte: startOfMonthUTC(today), lte: endOfMonthUTC(today) },
    },
    include: { category: true },
  })) as TxWithCategory[];

  return buildPL(txs);
}
