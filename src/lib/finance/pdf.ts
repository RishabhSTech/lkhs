import PDFDocument from "pdfkit";
import { formatINR } from "@/lib/format";

function streamToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function header(doc: PDFKit.PDFDocument, title: string) {
  doc.fontSize(18).fillColor("#0e1420").text("Lime Kraft Home Stays", { continued: false });
  doc.fontSize(12).fillColor("#5b6b82").text(title);
  doc.fontSize(9).fillColor("#8aa2c4").text(new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }));
  doc.moveDown(1.5);
}

function table(
  doc: PDFKit.PDFDocument,
  columns: { label: string; width: number; align?: "left" | "right" }[],
  rows: (string | number)[][],
) {
  const startX = doc.x;
  let y = doc.y;

  doc.fontSize(9).fillColor("#0e1420");
  let x = startX;
  for (const col of columns) {
    doc.text(col.label, x, y, { width: col.width, align: col.align ?? "left" });
    x += col.width;
  }
  y += 16;
  doc.moveTo(startX, y).lineTo(x, y).strokeColor("#e2ddd0").stroke();
  y += 6;

  doc.fontSize(8.5).fillColor("#5b6b82");
  for (const row of rows) {
    if (y > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    x = startX;
    row.forEach((cell, i) => {
      const col = columns[i];
      doc.text(String(cell), x, y, { width: col.width, align: col.align ?? "left" });
      x += col.width;
    });
    y += 15;
  }
  doc.y = y + 10;
}

export async function buildPortfolioReportPdf(
  rows: {
    name: string;
    locationArea: string;
    grossRevenue: number;
    otaFees: number;
    paymentFees: number;
    netRevenue: number;
    operatingExpenses: number;
    netOperatingIncome: number;
  }[],
): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
  const bufferPromise = streamToBuffer(doc);

  header(doc, "Portfolio P&L");

  table(
    doc,
    [
      { label: "Property", width: 150 },
      { label: "Location", width: 110 },
      { label: "Gross revenue", width: 90, align: "right" },
      { label: "OTA fees", width: 80, align: "right" },
      { label: "Payment fees", width: 80, align: "right" },
      { label: "Net revenue", width: 90, align: "right" },
      { label: "Op. expenses", width: 90, align: "right" },
      { label: "Net income", width: 90, align: "right" },
    ],
    rows.map((r) => [
      r.name,
      r.locationArea,
      formatINR(r.grossRevenue),
      formatINR(r.otaFees),
      formatINR(r.paymentFees),
      formatINR(r.netRevenue),
      formatINR(r.operatingExpenses),
      formatINR(r.netOperatingIncome),
    ]),
  );

  doc.end();
  return bufferPromise;
}

export async function buildTransactionsReportPdf(
  rows: {
    date: string;
    property: string;
    type: string;
    category: string;
    description: string;
    status: string;
    amount: number;
  }[],
): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
  const bufferPromise = streamToBuffer(doc);

  header(doc, "Transactions");

  table(
    doc,
    [
      { label: "Date", width: 65 },
      { label: "Property", width: 130 },
      { label: "Type", width: 80 },
      { label: "Category", width: 110 },
      { label: "Description", width: 220 },
      { label: "Status", width: 70 },
      { label: "Amount", width: 80, align: "right" },
    ],
    rows.map((r) => [r.date, r.property, r.type, r.category, r.description, r.status, formatINR(r.amount)]),
  );

  doc.end();
  return bufferPromise;
}
