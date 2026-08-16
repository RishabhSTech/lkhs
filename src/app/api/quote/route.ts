import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseISODate, toISODate } from "@/lib/dates";
import { buildQuote } from "@/lib/pricing/engine";
import { isPropertyAvailable } from "@/lib/booking/availability";

const schema = z.object({
  propertyId: z.string().min(1),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Provide a property and valid check-in / check-out dates." },
      { status: 400 },
    );
  }

  const checkIn = parseISODate(parsed.data.checkIn);
  const checkOut = parseISODate(parsed.data.checkOut);
  if (checkOut <= checkIn) {
    return NextResponse.json(
      { error: "Check-out must be after check-in." },
      { status: 400 },
    );
  }

  const property = await db.property.findUnique({
    where: { id: parsed.data.propertyId },
    include: { pricingRules: { where: { isActive: true } } },
  });
  if (!property) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }

  const overrides = await db.dailyRate.findMany({
    where: { propertyId: property.id, date: { gte: checkIn, lt: checkOut } },
  });

  const quote = buildQuote({
    basePrice: Number(property.basePrice),
    cleaningFee: Number(property.cleaningFee),
    checkIn,
    checkOut,
    rules: property.pricingRules,
    dailyRateOverrides: Object.fromEntries(
      overrides.map((o) => [toISODate(o.date), Number(o.price)]),
    ),
  });

  const available = await isPropertyAvailable(property.id, checkIn, checkOut);

  return NextResponse.json({ quote, available });
}
