import { NextResponse } from "next/server";
import { z } from "zod";
import { requestOtp } from "@/lib/auth/otp";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({ identifier: z.string().min(5) });

export async function POST(request: Request) {
  // Per-IP cap stops one source spraying OTPs at many targets; per-identifier
  // cap stops one target being bombed from rotating IPs.
  const ipLimited = await checkRateLimit(request, { bucket: "otp-ip", limit: 10, windowSeconds: 900 });
  if (ipLimited) return ipLimited;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter your email address or mobile number and we'll send a code." },
      { status: 400 },
    );
  }

  const identifierLimited = await checkRateLimit(request, {
    bucket: "otp-identifier",
    limit: 5,
    windowSeconds: 900,
    key: parsed.data.identifier.trim().toLowerCase(),
  });
  if (identifierLimited) return identifierLimited;

  const { devCode } = await requestOtp(parsed.data.identifier);

  // devCode is only non-null when the channel has no live delivery adapter
  // yet (see requestOtp) - otherwise the guest actually receives the code
  // and it has no business being in this response.
  return NextResponse.json({ sent: true, devCode });
}
