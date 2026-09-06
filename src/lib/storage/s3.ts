import "server-only";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * S3-compatible object storage for receipts and property photos. Works against
 * MinIO locally (docker-compose) and any S3 provider in production.
 */

let presignClient: S3Client | null = null;

function isConfigured() {
  return Boolean(process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY);
}

/**
 * Presigned URLs are always for a browser to PUT to directly, so they must be
 * signed against a host the browser can actually reach - S3_PUBLIC_ENDPOINT,
 * not S3_ENDPOINT (which, behind docker-compose, is the container-network
 * hostname `minio:9000` and resolves nowhere outside it). Falls back to
 * S3_ENDPOINT only when no public endpoint is configured (e.g. a real S3
 * bucket, where the endpoint already is the public one).
 */
function getPresignClient() {
  if (!isConfigured()) return null;

  presignClient ??= new S3Client({
    endpoint: process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? "us-east-1",
    forcePathStyle: true, // MinIO requires path-style addressing
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
  });
  return presignClient;
}

export function isStorageConfigured() {
  return isConfigured();
}

/** Presigned PUT so uploads go straight to storage, not through the app server. */
export async function createUploadUrl(key: string, contentType: string) {
  const s3 = getPresignClient();
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
