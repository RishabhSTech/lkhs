import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createUploadUrl, isStorageConfigured } from "@/lib/storage/s3";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Presigned upload for a guest's ID document photo, requested from the
 * public /checkin/[code] form - no session, so the booking code plus a
 * confirmed reservation is the only gate. Deliberately restricted to
 * image/PDF content types; anything else is a document type this form has
 * no business accepting.
 */
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const schema = z.object({
  filename: z.string().min(1),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
});

function sanitize(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(request: Request, { params }: RouteContext<"/api/checkin/[code]/upload-url">) {
  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: "ID uploads aren't set up yet. Please message us your ID instead." },
      { status: 503 },
    );
  }

  const { code } = await params;

  const limited = await checkRateLimit(request, {
    bucket: "checkin-upload",
    limit: 30,
    windowSeconds: 600,
    key: code,
  });
  if (limited) return limited;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !ALLOWED_CONTENT_TYPES.has(parsed.data.contentType)) {
    return NextResponse.json(
      { error: "That file type isn't supported. Upload a JPG, PNG or PDF." },
      { status: 400 },
    );
  }

  const reservation = await db.reservation.findUnique({
    where: { code },
    select: { id: true, status: true },
  });
  if (!reservation || (reservation.status !== "CONFIRMED" && reservation.status !== "COMPLETED")) {
    return NextResponse.json({ error: "This booking isn't ready for check-in yet." }, { status: 404 });
  }

  const { filename, contentType } = parsed.data;
  const key = `checkin/${reservation.id}/${Date.now()}-${sanitize(filename)}`;
  const { uploadUrl, publicUrl } = await createUploadUrl(key, contentType);

  return NextResponse.json({ uploadUrl, publicUrl });
}
