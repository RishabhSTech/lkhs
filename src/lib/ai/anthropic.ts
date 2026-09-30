import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/mailbox/crypto";

/**
 * The Anthropic API key can be set two ways: here in the database (Settings
 * -> Integrations -> Anthropic, admin-configured, encrypted at rest) or via
 * the ANTHROPIC_API_KEY env var. The database key wins when both exist, so
 * an admin can rotate or fix a key without a redeploy; the env var remains a
 * fallback for local dev and any deployment that hasn't configured one here.
 */

export async function getAnthropicIntegration() {
  return db.anthropicIntegration.findFirst({ orderBy: { createdAt: "desc" } });
}

export async function resolveAnthropicApiKey(): Promise<string | null> {
  const integration = await getAnthropicIntegration();
  // A CONNECTED or ERROR key is still "the configured one" - an ERROR key
  // might be a transient failure, and a real API error from actually using
  // it is more informative than silently falling back. Only an explicit
  // disconnect (or no row at all) hands control back to the env var.
  if (integration && integration.status !== "DISCONNECTED") {
    return decrypt(integration.apiKeyEncrypted);
  }
  return process.env.ANTHROPIC_API_KEY || null;
}

/** Returns null when no key is configured anywhere - callers should treat that as "feature unavailable", not throw. */
export async function getAnthropicClient(): Promise<Anthropic | null> {
  const apiKey = await resolveAnthropicApiKey();
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

/**
 * The cheapest request that still exercises real generation - a models.list
 * or a bare auth check wouldn't have caught the "API key is not scoped to a
 * workspace" failure mode we hit in production, since that only surfaces on
 * an actual messages.create call.
 */
export async function testAnthropicApiKey(apiKey: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const client = new Anthropic({ apiKey });
    await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1,
      messages: [{ role: "user", content: "hi" }],
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not connect to Anthropic." };
  }
}

export function encryptApiKey(apiKey: string): string {
  return encrypt(apiKey);
}
