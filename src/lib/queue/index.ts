import { Queue } from "bullmq";
import IORedis from "ioredis";

/**
 * Background job infrastructure. Channel pushes and payment-hold expiry must
 * never block a request, and must never fail silently — they go on a
 * retrying queue instead, with the failure surfaced as a ChannelSyncLog row
 * (channel sync) or a cancelled reservation (payment expiry).
 *
 * The queue is only constructed when REDIS_URL is set, so the app runs fine
 * without Redis; jobs are simply skipped rather than crashing a request. The
 * actual consumer lives in scripts/worker.ts, run as a separate process.
 */

let connection: IORedis | null = null;

function getConnection() {
  if (!process.env.REDIS_URL) return null;
  // lazyConnect + a bounded connectTimeout so an unreachable Redis fails the
  // enqueue call quickly instead of hanging the request that's holding it —
  // enqueueX() below still races this against ENQUEUE_TIMEOUT_MS as a
  // second line of defence in case a connection drops mid-request.
  connection ??= new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    connectTimeout: 5_000,
    lazyConnect: true,
  });
  return connection;
}

export const QUEUE_NAMES = {
  channelSync: "channel-sync",
  notifications: "notifications",
  recurringExpenses: "recurring-expenses",
  reservationExpiry: "reservation-expiry",
  mailboxPoll: "mailbox-poll",
} as const;

export type ChannelSyncJob = {
  channelPropertyId: string;
  reason: "AVAILABILITY_CHANGED" | "RATE_CHANGED" | "MANUAL";
};

export type ReservationExpiryJob = {
  reservationId: string;
};

export type RecurringExpenseRolloverJob = Record<string, never>;

const RESERVATION_HOLD_MINUTES = 20;
const ENQUEUE_TIMEOUT_MS = 4_000;

const queues = new Map<string, Queue>();

export function getQueue(name: string): Queue | null {
  const conn = getConnection();
  if (!conn) return null;

  if (!queues.has(name)) {
    queues.set(
      name,
      new Queue(name, {
        connection: conn,
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: "exponential", delay: 5_000 },
          removeOnComplete: 200,
          removeOnFail: false, // failures are kept so they can be inspected
        },
      }),
    );
  }
  return queues.get(name)!;
}

/** Never lets a slow/unreachable Redis hang the caller — an enqueue that
 * can't complete quickly is dropped (and logged) rather than blocking a
 * booking or payment confirmation indefinitely. */
async function withEnqueueTimeout<T>(label: string, work: Promise<T>): Promise<T | null> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`[queue] ${label} timed out after ${ENQUEUE_TIMEOUT_MS}ms — dropped, not blocking the caller.`);
      resolve(null);
    }, ENQUEUE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([work, timeout]);
  } catch (error) {
    console.warn(`[queue] ${label} failed:`, error instanceof Error ? error.message : error);
    return null;
  } finally {
    clearTimeout(timer!);
  }
}

export async function enqueueChannelSync(job: ChannelSyncJob) {
  const queue = getQueue(QUEUE_NAMES.channelSync);
  if (!queue) {
    console.warn(
      "[queue] REDIS_URL not set — channel sync skipped for",
      job.channelPropertyId,
    );
    return null;
  }
  return withEnqueueTimeout(`channel-sync(${job.channelPropertyId})`, queue.add("sync", job));
}

/** Scheduled the moment a reservation is created with a payment still in
 * flight. If payment hasn't completed by the time this fires, the worker
 * releases the held inventory rather than sitting on it forever. */
export async function enqueueReservationExpiry(job: ReservationExpiryJob) {
  const queue = getQueue(QUEUE_NAMES.reservationExpiry);
  if (!queue) {
    console.warn(
      "[queue] REDIS_URL not set — reservation expiry not scheduled for",
      job.reservationId,
      `(will stay PENDING indefinitely if payment never completes)`,
    );
    return null;
  }
  return withEnqueueTimeout(
    `reservation-expiry(${job.reservationId})`,
    queue.add("expire", job, { delay: RESERVATION_HOLD_MINUTES * 60_000 }),
  );
}

/** Manual "Sync now" trigger — the scheduled poll (see scripts/worker.ts) runs
 * on its own timer regardless. */
export async function enqueueMailboxPoll() {
  const queue = getQueue(QUEUE_NAMES.mailboxPoll);
  if (!queue) {
    console.warn("[queue] REDIS_URL not set — mailbox sync-now skipped.");
    return null;
  }
  return withEnqueueTimeout("mailbox-poll(manual)", queue.add("poll", {}));
}
