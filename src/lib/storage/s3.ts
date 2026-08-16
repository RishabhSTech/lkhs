import "server-only";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * S3-compatible object storage for receipts and property photos. Works against
 * MinIO locally (docker-compose) and any S3 provider in production.
 */

let client: S3Client | null = null;

function getClient() {
  if (!process.env.S3_ENDPOINT || !process.env.S3_ACCESS_KEY) return null;

  client ??= new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? "us-east-1",
    forcePathStyle: true, // MinIO requires path-style addressing
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
  });
  return client;
}

export function isStorageConfigured() {
  return getClient() !== null;
}

/** Presigned PUT so uploads go straight to storage, not through the app server. */
export async function createUploadUrl(key: string, contentType: string) {
  const s3 = getClient();
  if (!s3) throw new Error("Object storage is not configured.");

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const publicUrl = `${process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${key}`;

  return { uploadUrl, publicUrl };
}
