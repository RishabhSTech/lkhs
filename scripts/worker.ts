import "dotenv/config";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { QUEUE_NAMES, type ChannelSyncJob, type ReservationExpiryJob } from "@/lib/queue";
import { processChannelSync } from "@/lib/queue/processors/channel-sync";
import { processReservationExpiry } from "@/lib/queue/processors/reservation-expiry";
import { processRecurringExpenseRollover } from "@/lib/queue/processors/recurring-expenses";
import { processMailboxPoll } from "@/lib/queue/processors/mailbox-poll";

/**
 * Consumer process for the queues defined in src/lib/queue/index.ts. The
 * Next.js app only ever enqueues - this is the process that actually does
 * the work. Run alongside the app (see docker-compose.yml's `worker`
 * service) with `npm run worker`.
 */

if (!process.env.REDIS_URL) {
  console.error("[worker] REDIS_URL is not set - nothing to consume, exiting.");
  process.exit(1);
}

const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });

const channelSyncWorker = new Worker<ChannelSyncJob>(
  QUEUE_NAMES.channelSync,
  async (job) => processChannelSync(job.data),
  { connection },
);

const reservationExpiryWorker = new Worker<ReservationExpiryJob>(
  QUEUE_NAMES.reservationExpiry,
  async (job) => processReservationExpiry(job.data),
  { connection },
);

const recurringExpensesWorker = new Worker(
  QUEUE_NAMES.recurringExpenses,
  async () => processRecurringExpenseRollover(),
  { connection },
);

const mailboxPollWorker = new Worker(
  QUEUE_NAMES.mailboxPoll,
  async () => processMailboxPoll(),
  { connection },
);

for (const worker of [channelSyncWorker, reservationExpiryWorker, recurringExpensesWorker, mailboxPollWorker]) {
  worker.on("completed", (job) => {
    console.log(`[worker] ${job.queueName}#${job.id} completed`);
  });
  worker.on("failed", (job, err) => {
    console.error(`[worker] ${job?.queueName}#${job?.id} failed:`, err.message);
  });
}

/** Recurring expenses have no per-event trigger - they run on a schedule. */
const recurringExpensesQueue = new Queue(QUEUE_NAMES.recurringExpenses, { connection });
recurringExpensesQueue
  .upsertJobScheduler(
    "daily-rollover",
    { pattern: "0 2 * * *" }, // 02:00 server time, daily
    { name: "rollover" },
  )
  .catch((err) => {
    console.error("[worker] failed to schedule recurring-expense rollover:", err);
  });

/** Airbnb/Booking.com/Agoda have no messaging/reservation API for this
 * account - homestay@ inbox notification emails are polled instead. See
 * src/lib/mailbox/. */
const mailboxPollQueue = new Queue(QUEUE_NAMES.mailboxPoll, { connection });
mailboxPollQueue
  .upsertJobScheduler("mailbox-poll", { pattern: "*/5 * * * *" }, { name: "poll" })
  .catch((err) => {
    console.error("[worker] failed to schedule mailbox poll:", err);
  });

console.log("[worker] listening on:", Object.values(QUEUE_NAMES).join(", "));

process.on("SIGTERM", async () => {
  await Promise.all([
    channelSyncWorker.close(),
    reservationExpiryWorker.close(),
    recurringExpensesWorker.close(),
    mailboxPollWorker.close(),
  ]);
  process.exit(0);
});
