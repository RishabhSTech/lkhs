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

/** Anything with a `Headers`-like `.get()` - a `Request` or the `Headers`
 * object `next/headers`' `headers()` resolves to, so Server Components can
 * derive the same key without needing a `Request` to exist. */
interface HeaderSource {
  get(name: string): string | null;
}

export function clientIp(headers: HeaderSource): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}

// The shared connection (src/lib/queue/index.ts) sets maxRetriesPerRequest:
// null so BullMQ never drops a queued job - but that also means a command
// issued while Redis is unreachable just queues forever instead of
// rejecting, so a plain try/catch around it would never fire. Race it
// against a short timeout so an outage fails this check open quickly
// instead of hanging the request indefinitely.
const CHECK_TIMEOUT_MS = 1_500;

/**
 * Fixed-window check backed by the same Redis instance as the job queue.
 * Fails open (returns false, i.e. "allowed") if Redis isn't configured,
 * unreachable, or too slow to answer - guests being able to act matters
 * more than this particular defence holding up during a Redis outage.
 *
 * Shared core for `checkRateLimit` below and any Server Component (which
 * has no `Request` to build a key from) that needs the same fail-fast
 * behaviour - see `isRateLimited` in the booking-confirmation page.
 */
export async function isOverLimit(
  redisKey: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number },
): Promise<boolean> {
  const conn = getConnection();
  if (!conn) return false;

  try {
    const count = await withTimeout(async () => {
      const value = await conn.incr(redisKey);
      if (value === 1) {
        await conn.expire(redisKey, windowSeconds);
      }
      return value;
    });
    return count > limit;
  } catch (error) {
    console.warn(
      `[rate-limit] ${redisKey} check failed, allowing request:`,
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

export async function checkRateLimit(
  request: Request,
  { bucket, limit, windowSeconds, key }: RateLimitOptions,
): Promise<NextResponse | null> {
  const redisKey = `ratelimit:${bucket}:${key ?? clientIp(request.headers)}`;
  const limited = await isOverLimit(redisKey, { limit, windowSeconds });
  if (!limited) return null;

  return NextResponse.json(
    { error: "Too many requests. Please wait a bit and try again." },
    { status: 429 },
  );
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
