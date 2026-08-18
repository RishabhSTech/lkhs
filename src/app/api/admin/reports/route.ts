import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { buildPL, type TxWithCategory } from "@/lib/finance/calculations";
import { buildPortfolioReportPdf, buildTransactionsReportPdf } from "@/lib/finance/pdf";

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
  const format = params.get("format") ?? "csv";
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

    if (format === "pdf") {
      const pdf = await buildTransactionsReportPdf(
        txs.map((t) => ({
          date: t.date.toISOString().slice(0, 10),
          property: t.property.name,
          type: t.type,
          category: t.category.name,
          description: t.description ?? "",
          status: t.status,
          amount: Number(t.amount),
        })),
      );
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="lime-kraft-transactions.pdf"`,
        },
      });
    }

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
  const portfolioRows = properties.map((p) => {
    const pl = buildPL(p.transactions as TxWithCategory[]);
    return {
      name: p.name,
      locationArea: p.locationArea,
      grossRevenue: pl.grossRevenue,
      otaFees: pl.otaFees,
      paymentFees: pl.paymentFees,
      netRevenue: pl.netRevenue,
      operatingExpenses: pl.operatingExpenses,
      netOperatingIncome: pl.netOperatingIncome,
    };
  });

  if (format === "pdf") {
    const pdf = await buildPortfolioReportPdf(portfolioRows);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="lime-kraft-portfolio.pdf"`,
      },
    });
  }

  const csv = toCsv([
    ["Property", "Location", "Gross revenue", "OTA fees", "Payment fees", "Net revenue", "Operating expenses", "Net operating income"],
    ...portfolioRows.map((r) => [
      r.name,
      r.locationArea,
      r.grossRevenue,
      r.otaFees,
      r.paymentFees,
      r.netRevenue,
      r.operatingExpenses,
      r.netOperatingIncome,
    ]),
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lime-kraft-portfolio.csv"`,
    },
  });
}
