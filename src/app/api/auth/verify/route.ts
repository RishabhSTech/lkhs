import { NextResponse } from "next/server";
import { z } from "zod";
import { findOrCreateUser, verifyOtp } from "@/lib/auth/otp";
import { createSession, redirectPathForRole } from "@/lib/auth/session";

const schema = z.object({
  identifier: z.string().min(5),
  code: z.string().length(6),
  name: z.string().optional(),
});

const REASONS: Record<string, string> = {
  EXPIRED: "That code has expired. Request a new one.",
  INVALID: "That code isn't right. Check it and try again.",
  TOO_MANY_ATTEMPTS: "Too many attempts. Request a new code.",
};

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }

  const result = await verifyOtp(parsed.data.identifier, parsed.data.code);
  if (!result.ok) {
    return NextResponse.json({ error: REASONS[result.reason] }, { status: 400 });
  }

  const user = await findOrCreateUser(parsed.data.identifier, parsed.data.name);
  await createSession({
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
  });

  return NextResponse.json({ redirectTo: redirectPathForRole(user.role) });
}
