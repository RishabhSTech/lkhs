import "server-only";
import { ImapFlow } from "imapflow";
import { simpleParser, type ParsedMail } from "mailparser";
import { buildImapSearchQuery } from "@/lib/mailbox/parse-email";

export type ImapCredentials = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
};

function makeClient(creds: ImapCredentials, extra?: Partial<ConstructorParameters<typeof ImapFlow>[0]>) {
  return new ImapFlow({
    host: creds.host,
    port: creds.port,
    secure: creds.secure,
    auth: { user: creds.user, pass: creds.pass },
    logger: false,
    ...extra,
  });
}

/**
 * Connects and disconnects immediately (`verifyOnly`) - used by the
 * Settings → Integrations "Save & test connection" flow so bad credentials
 * are caught before anything is stored.
 */
export async function testImapLogin(creds: ImapCredentials): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = makeClient(creds, { verifyOnly: true });
  try {
    await client.connect();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not connect to the mailbox." };
  }
}

export type FetchedEmail = { uid: number; parsed: ParsedMail };

/**
 * One poll cycle: connect, search INBOX for anything from a known OTA domain
 * since the given date, download and parse each match, disconnect. Always
 * closes the connection, even on error, so a broken poll can't leak sockets.
 */
export async function fetchNewMessages(creds: ImapCredentials, since: Date): Promise<FetchedEmail[]> {
  const client = makeClient(creds);
  const results: FetchedEmail[] = [];

  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const uids = await client.search(buildImapSearchQuery(since), { uid: true });
      if (!uids || uids.length === 0) return results;

      for await (const message of client.fetch(uids, { source: true }, { uid: true })) {
        if (!message.source) continue;
        const parsed = await simpleParser(message.source);
        results.push({ uid: message.uid, parsed });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => client.close());
  }

  return results;
}
