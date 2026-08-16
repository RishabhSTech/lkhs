import { Queue } from "bullmq";
import IORedis from "ioredis";

/**
 * Background job infrastructure. Channel pushes must never block a booking, and
 * must never fail silently — they go on a retrying queue instead, with the
 * failure surfaced as a ChannelSyncLog row.
 *
 * The queue is only constructed when REDIS_URL is set, so the app runs fine
 * without Redis; jobs are simply skipped rather than crashing a request.
 */

let connection: IORedis | null = null;

function getConnection() {
  if (!process.env.REDIS_URL) return null;
  connection ??= new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });
  return connection;
}

export const QUEUE_NAMES = {
  channelSync: "channel-sync",
  notifications: "notifications",
  recurringExpenses: "recurring-expenses",
} as const;

export type ChannelSyncJob = {
  channelPropertyId: string;
  reason: "AVAILABILITY_CHANGED" | "RATE_CHANGED" | "MANUAL";
};

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

export async function enqueueChannelSync(job: ChannelSyncJob) {
  const queue = getQueue(QUEUE_NAMES.channelSync);
  if (!queue) {
    console.warn(
      "[queue] REDIS_URL not set — channel sync skipped for",
      job.channelPropertyId,
    );
    return null;
  }
  return queue.add("sync", job);
}
