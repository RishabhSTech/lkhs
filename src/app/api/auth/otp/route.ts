import { NextResponse } from "next/server";
import { z } from "zod";
import { requestOtp } from "@/lib/auth/otp";

const schema = z.object({ identifier: z.string().min(5) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter your email address or mobile number and we'll send a code." },
      { status: 400 },
    );
  }

  const { devCode } = await requestOtp(parsed.data.identifier);

  // devCode is only non-null when the channel has no live delivery adapter
  // yet (see requestOtp) - otherwise the guest actually receives the code
  // and it has no business being in this response.
  return NextResponse.json({ sent: true, devCode });
}
