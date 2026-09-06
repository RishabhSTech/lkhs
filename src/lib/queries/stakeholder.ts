import "server-only";
import { db } from "@/lib/db";
import {
  addMonths, endOfMonthUTC, startOfMonthUTC, todayUTC,
} from "@/lib/dates";
import {
  buildCapitalPosition, buildChannelProfitability, buildMonthlySeries, buildPL,
  type TxWithCategory,
} from "@/lib/finance/calculations";

/**
 * Stakeholder views are scoped strictly by the StakeholderProperty join - a
 * stakeholder can never see a property that isn't assigned to them.
 */
export async function getStakeholderPortfolio(stakeholderId: string) {
  const links = await db.stakeholderProperty.findMany({
    where: { stakeholderId },
    include: {
      property: {
        include: {
          images: { take: 1, orderBy: { sortOrder: "asc" } },
          transactions: {
            include: { category: true, reservation: { select: { source: true } } },
          },
          units: { select: { id: true } },
        },
      },
    },
  });

  const today = todayUTC();
  const monthStart = startOfMonthUTC(today);
  const monthEnd = endOfMonthUTC(today);

  const properties = await Promise.all(
    links.map(async (link) => {
      const txs = link.property.transactions as TxWithCategory[];
      const pl = buildPL(txs);
      const capital = buildCapitalPosition(txs);

      const unitIds = link.property.units.map((u) => u.id);
      const [soldNights, unitCount] = await Promise.all([
        db.inventoryNight.count({
          where: {
            unitId: { in: unitIds },
            date: { gte: monthStart, lte: monthEnd },
            reservationId: { not: null },
          },
        }),
        Promise.resolve(unitIds.length),
      ]);
      const availableNights = unitCount * monthEnd.getUTCDate();

      return {
        id: link.property.id,
        name: link.property.name,
        locationArea: link.property.locationArea,
        city: link.property.city,
        image: link.property.images[0]?.url ?? null,
        investmentAmount: Number(link.investmentAmount),
        ownershipPercent: link.ownershipPercent
          ? Number(link.ownershipPercent)
          : null,
        pl,
        capital,
        occupancyPercent:
          availableNights > 0 ? (soldNights / availableNights) * 100 : 0,
      };
    }),
  );

  const totals = properties.reduce(
    (acc, p) => ({
      invested: acc.invested + p.investmentAmount,
      revenue: acc.revenue + p.pl.grossRevenue,
      expenses:
        acc.expenses +
        p.pl.operatingExpenses +
        p.pl.otaFees +
        p.pl.paymentFees,
      net: acc.net + p.pl.netOperatingIncome,
    }),
    { invested: 0, revenue: 0, expenses: 0, net: 0 },
  );

  return {
    properties,
    totals: {
      ...totals,
      roiPercent: totals.invested > 0 ? (totals.net / totals.invested) * 100 : 0,
      portfolioValue: totals.invested + totals.net,
    },
  };
}

export async function getStakeholderProperty(
  stakeholderId: string,
  propertyId: string,
  monthsBack = 6,
) {
  // The join is the authorisation check: no link, no access.
  const link = await db.stakeholderProperty.findFirst({
    where: { stakeholderId, propertyId },
    include: {
      property: {
        include: {
          images: { take: 1, orderBy: { sortOrder: "asc" } },
          transactions: {
            include: { category: true, reservation: { select: { source: true } } },
          },
          units: { select: { id: true } },
        },
      },
    },
  });
  if (!link) return null;

  const today = todayUTC();
  const txs = link.property.transactions as TxWithCategory[];
  const months = Array.from({ length: monthsBack }, (_, i) =>
    startOfMonthUTC(addMonths(today, -(monthsBack - 1 - i))),
  );

  const unitIds = link.property.units.map((u) => u.id);
  const monthStart = startOfMonthUTC(today);
  const monthEnd = endOfMonthUTC(today);
  const soldNights = await db.inventoryNight.count({
    where: {
      unitId: { in: unitIds },
      date: { gte: monthStart, lte: monthEnd },
      reservationId: { not: null },
    },
  });
  const availableNights = unitIds.length * monthEnd.getUTCDate();

  return {
    property: link.property,
    investmentAmount: Number(link.investmentAmount),
    ownershipPercent: link.ownershipPercent ? Number(link.ownershipPercent) : null,
    pl: buildPL(txs),
    capital: buildCapitalPosition(txs),
    channels: buildChannelProfitability(
      txs as (TxWithCategory & { reservation: { source: never } | null })[],
    ),
    monthlySeries: buildMonthlySeries(txs, months),
    occupancyPercent:
      availableNights > 0 ? (soldNights / availableNights) * 100 : 0,
  };
}
