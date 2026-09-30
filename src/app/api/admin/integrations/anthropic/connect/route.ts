import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { testAnthropicApiKey, encryptApiKey, getAnthropicIntegration } from "@/lib/ai/anthropic";

const schema = z.object({
  apiKey: z.string().min(1, "Enter an API key."),
});

/**
 * Always saves the key (encrypted), whether or not it validates - status
 * reflects the real outcome (CONNECTED or ERROR with the reason) rather than
 * silently rejecting a bad key and leaving the UI in a stale state. Powers
 * both the mailbox email extractor and the guest chatbot.
 */
export async function POST(request: Request) {
  const { user } = await getCurrentAdminUser();
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only an admin can set the Anthropic API key." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Enter an API key." },
      { status: 400 },
    );
  }
  const { apiKey } = parsed.data;

  const test = await testAnthropicApiKey(apiKey);
  const apiKeyEncrypted = encryptApiKey(apiKey);
  const now = new Date();

  const existing = await getAnthropicIntegration();
  const data = test.ok
    ? { apiKeyEncrypted, status: "CONNECTED" as const, error: null, connectedAt: now, disconnectedAt: null, lastCheckedAt: now }
    : { apiKeyEncrypted, status: "ERROR" as const, error: test.error, lastCheckedAt: now };

  const integration = existing
    ? await db.anthropicIntegration.update({ where: { id: existing.id }, data })
    : await db.anthropicIntegration.create({ data });

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: test.ok ? "ANTHROPIC_KEY_CONNECTED" : "ANTHROPIC_KEY_SAVE_FAILED",
      entityType: "AnthropicIntegration",
      entityId: integration.id,
      summary: test.ok
        ? `${user.name} set a working Anthropic API key`
        : `${user.name} saved an Anthropic API key that failed validation: ${test.error}`,
    },
  });

  if (!test.ok) {
    return NextResponse.json({ error: test.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
