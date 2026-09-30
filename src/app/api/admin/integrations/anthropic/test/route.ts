import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { testAnthropicApiKey, getAnthropicIntegration } from "@/lib/ai/anthropic";
import { decrypt } from "@/lib/mailbox/crypto";

/** Re-checks the already-saved key without requiring it to be re-entered. */
export async function POST() {
  const { user } = await getCurrentAdminUser();
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only an admin can test the Anthropic API key." }, { status: 403 });
  }

  const integration = await getAnthropicIntegration();
  if (!integration) {
    return NextResponse.json({ error: "No Anthropic API key is configured yet." }, { status: 404 });
  }

  const apiKey = decrypt(integration.apiKeyEncrypted);
  const test = await testAnthropicApiKey(apiKey);
  const now = new Date();

  await db.anthropicIntegration.update({
    where: { id: integration.id },
    data: test.ok
      ? { status: "CONNECTED", error: null, connectedAt: now, disconnectedAt: null, lastCheckedAt: now }
      : { status: "ERROR", error: test.error, lastCheckedAt: now },
  });

  if (!test.ok) {
    return NextResponse.json({ error: test.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
