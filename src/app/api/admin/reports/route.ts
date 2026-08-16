import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { buildPL, type TxWithCategory } from "@/lib/finance/calculations";

/** CSV export for financial reports. PDF export is not implemented. */

function toCsv(rows: (string | number)[][]) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell);
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(","),
    )
    .join("\n");
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const type = params.get("type") ?? "portfolio";
  const propertyId = params.get("property");

  if (type === "transactions") {
    const txs = await db.transaction.findMany({
      where: propertyId ? { propertyId } : {},
      include: {
        category: true,
        property: { select: { name: true } },
        reservation: { select: { code: true, source: true } },
      },
      orderBy: { date: "desc" },
    });

    const csv = toCsv([
      ["Date", "Property", "Type", "Category", "Description", "Channel", "Status", "Amount"],
      ...txs.map((t) => [
        t.date.toISOString().slice(0, 10),
        t.property.name,
        t.type,
        t.category.name,
        t.description ?? "",
        t.reservation?.source ?? "",
        t.status,
        Number(t.amount),
      ]),
    ]);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="lime-kraft-transactions.csv"`,
      },
    });
  }

  const properties = await db.property.findMany({
    include: { transactions: { include: { category: true } } },
    orderBy: { name: "asc" },
  });

  const csv = toCsv([
    ["Property", "Location", "Gross revenue", "OTA fees", "Payment fees", "Net revenue", "Operating expenses", "Net operating income"],
    ...properties.map((p) => {
      const pl = buildPL(p.transactions as TxWithCategory[]);
      return [
        p.name,
        p.locationArea,
        pl.grossRevenue,
        pl.otaFees,
        pl.paymentFees,
        pl.netRevenue,
        pl.operatingExpenses,
        pl.netOperatingIncome,
      ];
    }),
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lime-kraft-portfolio.csv"`,
    },
  });
}
