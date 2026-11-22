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
    // Node tries each of the host's addresses (IPv6 + IPv4) but by default
    // gives every attempt only 250ms before moving on. From a far-away
    // worker the TLS handshake to Hostinger can take longer than that, so a
    // healthy server would fail with an AggregateError whose message is
    // empty - the "Could not connect to ...: ." alert.
    tls: { autoSelectFamilyAttemptTimeout: 5000 } as Record<string, unknown>,
    ...extra,
  });
}

type ImapLikeError = Error & {
  code?: string;
  authenticationFailed?: boolean;
  responseText?: string;
  errors?: unknown[];
};

/** True when the server rejected the username/password - retrying won't help. */
export function isImapAuthFailure(error: unknown): boolean {
  return !!error && typeof error === "object" && (error as ImapLikeError).authenticationFailed === true;
}

/**
 * Human-readable reason for an IMAP failure. Node reports a failed
 * multi-address connect as an AggregateError with an EMPTY message, and
 * imapflow puts the server's own words in responseText, so error.message
 * alone is often blank or just "Command failed".
 */
export function describeImapError(error: unknown): string {
  if (!(error instanceof Error)) return "unknown error";
  const err = error as ImapLikeError;
  const parts: string[] = [];
  if (err.authenticationFailed) parts.push("the mailbox rejected the email/password");
  if (err.message) parts.push(err.message);
  if (err.responseText && err.responseText !== err.message) parts.push(err.responseText);
  if (err.code) parts.push(`(${err.code})`);
  if (Array.isArray(err.errors)) {
    const inner = err.errors
      .map((e) => (e && typeof e === "object" ? ((e as ImapLikeError).code ?? (e as Error).message) : String(e)))
      .filter(Boolean);
    if (inner.length) parts.push(`network: ${[...new Set(inner)].join(", ")}`);
  }
  return parts.join(" ").trim() || "connection failed with no reason given (network timeout?)";
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
    return { ok: false, error: describeImapError(error) };
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
