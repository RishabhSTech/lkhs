import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { getAnthropicIntegration } from "@/lib/ai/anthropic";

export async function POST() {
  const { user } = await getCurrentAdminUser();
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only an admin can disconnect the Anthropic API key." }, { status: 403 });
  }

  const integration = await getAnthropicIntegration();
  if (!integration || integration.status === "DISCONNECTED") {
    return NextResponse.json({ error: "No Anthropic API key is connected." }, { status: 404 });
  }

  await db.anthropicIntegration.update({
    where: { id: integration.id },
    data: { status: "DISCONNECTED", disconnectedAt: new Date() },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "ANTHROPIC_KEY_DISCONNECTED",
      entityType: "AnthropicIntegration",
      entityId: integration.id,
      summary: `${user.name} disconnected the Anthropic API key`,
    },
  });

  return NextResponse.json({ ok: true });
}
