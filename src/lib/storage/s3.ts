import "server-only";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * S3-compatible object storage for receipts and property photos. Works against
 * MinIO locally (docker-compose), Supabase Storage, or any other S3 provider
 * in production - see S3_PUBLIC_URL_BASE below for providers that serve
 * public objects from a different host than the one they're uploaded to.
 */

let presignClient: S3Client | null = null;

/** Platforms don't always agree on what "unset" means - some omit the key
 * entirely, others ship it as an empty string - so treat both as absent
 * rather than using `??`, which only falls back on null/undefined. */
function env(key: string) {
  const value = process.env[key];
  return value ? value : undefined;
}

function isConfigured() {
  return Boolean(env("S3_ENDPOINT") && env("S3_ACCESS_KEY"));
}

/**
 * Presigned URLs are always for a browser to PUT to directly, so they must be
 * signed against a host the browser can actually reach - S3_PUBLIC_ENDPOINT,
 * not S3_ENDPOINT (which, behind docker-compose, is the container-network
 * hostname `minio:9000` and resolves nowhere outside it). Falls back to
 * S3_ENDPOINT only when no public endpoint is configured (e.g. a real S3
 * bucket, where the endpoint already is the public one).
 */
function signingEndpoint() {
  return env("S3_PUBLIC_ENDPOINT") ?? env("S3_ENDPOINT");
}

/**
 * The browser-facing base URL an uploaded object is displayed at. Defaults to
 * the signing endpoint (true for MinIO and most S3 providers, which serve the
 * object from the same host it was uploaded to). Set S3_PUBLIC_URL_BASE
 * explicitly for providers that split the two - e.g. Supabase Storage, where
 * the S3 protocol endpoint (`<ref>.storage.supabase.co/storage/v1/s3`) only
 * accepts signed S3 operations, and public objects are served from a
 * different host and path (`<ref>.supabase.co/storage/v1/object/public`).
 */
function publicUrlBase() {
  return env("S3_PUBLIC_URL_BASE") ?? signingEndpoint();
}

function getPresignClient() {
  if (!isConfigured()) return null;

  presignClient ??= new S3Client({
    endpoint: signingEndpoint(),
    region: env("S3_REGION") ?? "us-east-1",
    forcePathStyle: true, // MinIO and Supabase Storage both require path-style addressing
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
  const publicUrl = `${publicUrlBase()}/${process.env.S3_BUCKET}/${key}`;

  return { uploadUrl, publicUrl };
}
