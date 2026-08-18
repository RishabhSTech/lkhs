import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { createUploadUrl, isStorageConfigured } from "@/lib/storage/s3";

const schema = z.object({
  folder: z.enum(["properties", "receipts"]),
  filename: z.string().min(1),
  contentType: z.string().min(1),
});

function sanitize(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(request: Request) {
  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: "Object storage is not configured (S3_ENDPOINT / S3_ACCESS_KEY)." },
      { status: 503 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }
  const { user } = await getCurrentAdminUser();
  const { folder, filename, contentType } = parsed.data;

  const key = `${folder}/${user.id}/${Date.now()}-${sanitize(filename)}`;
  const { uploadUrl, publicUrl } = await createUploadUrl(key, contentType);

  return NextResponse.json({ uploadUrl, publicUrl });
}
