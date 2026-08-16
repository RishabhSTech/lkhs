import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getBlockedDates } from "@/lib/booking/availability";
import { addMonths, parseISODate, todayUTC } from "@/lib/dates";

/**
 * Dates a property cannot be booked on, so the guest calendar can grey them out
 * before the guest ever tries to reserve.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const slug = params.get("property");
  if (!slug) {
    return NextResponse.json({ error: "Property required." }, { status: 400 });
  }

  const property = await db.property.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!property) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }

  const fromParam = params.get("from");
  const from = fromParam ? parseISODate(fromParam) : todayUTC();
  const to = addMonths(from, 12);

  const blockedDates = await getBlockedDates(property.id, from, to);

  return NextResponse.json({ blockedDates });
}
