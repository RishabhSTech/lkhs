import "server-only";
import { NextResponse } from "next/server";
import { getConnection } from "@/lib/queue";

interface RateLimitOptions {
  /** Namespaces the counter, e.g. "otp", "bookings". */
  bucket: string;
  limit: number;
  windowSeconds: number;
  /** Identifier to scope the limit by. Defaults to the caller's IP. Pass an
   * explicit value (e.g. the OTP target) to also cap attempts per-target
   * regardless of source IP. */
  key?: string;
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Fixed-window rate limiter backed by the same Redis instance as the job
 * queue. Fails open (returns null, i.e. "allowed") if Redis isn't
 * configured or unreachable - guests being able to book matters more than
 * this particular defence holding up during a Redis outage.
 */
export async function checkRateLimit(
  request: Request,
  { bucket, limit, windowSeconds, key }: RateLimitOptions,
): Promise<NextResponse | null> {
  const conn = getConnection();
  if (!conn) return null;

  const redisKey = `ratelimit:${bucket}:${key ?? clientIp(request)}`;

  try {
    const count = await conn.incr(redisKey);
    if (count === 1) {
      await conn.expire(redisKey, windowSeconds);
    }
    if (count > limit) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a bit and try again." },
        { status: 429 },
      );
    }
    return null;
  } catch (error) {
    console.warn(
      `[rate-limit] ${bucket} check failed, allowing request:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
