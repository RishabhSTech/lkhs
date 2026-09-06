import { runMailboxPoll } from "@/lib/mailbox/sync";

export async function processMailboxPoll() {
  const summary = await runMailboxPoll();
  console.log(
    `[worker] mailbox-poll: ${summary.processed} processed, ${summary.failed} failed, ${summary.skipped} already seen`,
  );
}
