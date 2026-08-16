import { NextResponse } from "next/server";
import { z } from "zod";
import { requestOtp } from "@/lib/auth/otp";

const schema = z.object({ identifier: z.string().min(5) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter your email address or mobile number." },
      { status: 400 },
    );
  }

  const { devCode } = await requestOtp(parsed.data.identifier);

  // No SMS/email provider is connected, so the code is surfaced here rather
  // than silently failing. Remove this field once a real provider is wired up.
  return NextResponse.json({ sent: true, devCode });
}
