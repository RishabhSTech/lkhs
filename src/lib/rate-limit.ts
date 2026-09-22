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

// The shared connection (src/lib/queue/index.ts) sets maxRetriesPerRequest:
// null so BullMQ never drops a queued job - but that also means a command
// issued while Redis is unreachable just queues forever instead of
// rejecting, so the try/catch below would never fire. Race it against a
// short timeout so an outage fails this check open quickly instead of
// hanging the request (and its caller's `await res.json()`) indefinitely.
const CHECK_TIMEOUT_MS = 1_500;

/**
 * Fixed-window rate limiter backed by the same Redis instance as the job
 * queue. Fails open (returns null, i.e. "allowed") if Redis isn't
 * configured, unreachable, or too slow to answer - guests being able to
 * book matters more than this particular defence holding up during a Redis
 * outage.
 */
export async function checkRateLimit(
  request: Request,
  { bucket, limit, windowSeconds, key }: RateLimitOptions,
): Promise<NextResponse | null> {
  const conn = getConnection();
  if (!conn) return null;

  const redisKey = `ratelimit:${bucket}:${key ?? clientIp(request)}`;

  try {
    const count = await withTimeout(async () => {
      const value = await conn.incr(redisKey);
      if (value === 1) {
        await conn.expire(redisKey, windowSeconds);
      }
      return value;
    });
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

function withTimeout<T>(work: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`rate limit check timed out after ${CHECK_TIMEOUT_MS}ms`)),
      CHECK_TIMEOUT_MS,
    );
    work().then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
