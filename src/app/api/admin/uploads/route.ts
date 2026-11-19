import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { LISTING_ROLES } from "@/lib/auth/roles";
import { createUploadUrl, isStorageConfigured } from "@/lib/storage/s3";

// Images and PDFs only. Anything the browser would render as a page (HTML,
// SVG, XML) is refused so the bucket can't host a script on our behalf.
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/heic",
  "image/heif",
  "application/pdf",
] as const;

const schema = z.object({
  folder: z.enum(["properties", "receipts", "reviews"]),
  filename: z.string().min(1).max(200),
  contentType: z.enum(ALLOWED_TYPES, { error: "Upload a photo (JPG, PNG, WebP, HEIC) or a PDF." }),
});

function folderNeedsListingRole(folder: string) {
  return folder !== "receipts";
}

function sanitize(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(request: Request) {
  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: "Photo storage isn't set up yet. Add S3_ENDPOINT and S3_ACCESS_KEY to the environment, then restart." },
      { status: 503 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error?.issues.find((i) => i.path[0] === "contentType")?.message ?? "We couldn't start that upload. Check the file type and try again." },
      { status: 400 },
    );
  }
  const { user } = await getCurrentAdminUser();
  if (folderNeedsListingRole(parsed.data.folder) && !LISTING_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "You can only upload receipts." }, { status: 403 });
  }
  const { folder, filename, contentType } = parsed.data;

  const key = `${folder}/${user.id}/${Date.now()}-${sanitize(filename)}`;
  const { uploadUrl, publicUrl } = await createUploadUrl(key, contentType);

  return NextResponse.json({ uploadUrl, publicUrl });
}
