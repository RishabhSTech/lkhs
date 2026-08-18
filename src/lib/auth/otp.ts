import "server-only";
import { db } from "@/lib/db";
import { EMAIL_IS_LIVE, getNotificationProvider } from "@/lib/notifications/provider";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function isEmail(identifier: string) {
  return identifier.includes("@");
}

export async function requestOtp(identifier: string) {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

  await db.otpCode.create({
    data: { identifier, code, expiresAt },
  });

  const notifier = getNotificationProvider();
  const result = await notifier.send({
    channel: isEmail(identifier) ? "EMAIL" : "SMS",
    to: identifier,
    subject: "Your Lime Kraft sign-in code",
    body: `Your Lime Kraft verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`,
    templateKey: "OTP",
  });

  // Once a channel actually delivers (email via Resend today), the code
  // should never also come back in the API response — that would defeat the
  // point of a one-time code. It's only surfaced here as a fallback for
  // channels (SMS/WhatsApp) that still have no live adapter.
  const delivered = isEmail(identifier) && EMAIL_IS_LIVE && result.status === "SENT";
  return { devCode: delivered ? null : code, expiresAt };
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "EXPIRED" | "INVALID" | "TOO_MANY_ATTEMPTS" };

export async function verifyOtp(
  identifier: string,
  code: string,
): Promise<VerifyResult> {
  const record = await db.otpCode.findFirst({
    where: { identifier, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return { ok: false, reason: "INVALID" };
  if (record.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: "TOO_MANY_ATTEMPTS" };
  }
  if (record.expiresAt < new Date()) return { ok: false, reason: "EXPIRED" };

  if (record.code !== code) {
    await db.otpCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: "INVALID" };
  }

  await db.otpCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });
  return { ok: true };
}

/** Finds or creates the user behind an identifier — no passwords involved. */
export async function findOrCreateUser(identifier: string, name?: string) {
  const where = isEmail(identifier)
    ? { email: identifier }
    : { phone: identifier };

  const existing = await db.user.findFirst({ where });
  if (existing) return existing;

  return db.user.create({
    data: {
      name: name ?? identifier.split("@")[0],
      role: "GUEST",
      ...(isEmail(identifier) ? { email: identifier } : { phone: identifier }),
    },
  });
}
