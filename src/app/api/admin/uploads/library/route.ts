import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";

/** Every photo ever uploaded for a property, deduped by URL, newest first -
 * backs the "choose from library" tab so admins can reuse a photo instead of
 * uploading it again. */
export async function GET() {
  await getCurrentAdminUser();

  const rows = await db.propertyImage.findMany({
    select: { url: true, alt: true, property: { select: { name: true } } },
    orderBy: { id: "desc" },
    take: 300,
  });

  const seen = new Set<string>();
  const images: { url: string; alt: string | null; propertyName: string }[] = [];
  for (const row of rows) {
    if (seen.has(row.url)) continue;
    seen.add(row.url);
    images.push({ url: row.url, alt: row.alt, propertyName: row.property.name });
  }

  return NextResponse.json({ images });
}
