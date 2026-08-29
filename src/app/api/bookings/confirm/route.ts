import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { confirmReservation } from "@/lib/booking/create-reservation";
import { RazorpayProvider } from "@/lib/payments/provider";

/**
 * Hit by the client once Razorpay Checkout's success handler fires. This is
 * a convenience path for immediate UX — the webhook (see
 * src/app/api/payments/webhook/razorpay/route.ts) is the authoritative
 * confirmation and will also fire, but confirmReservation() is idempotent so
 * whichever arrives first wins and the second is a no-op.
 */
const schema = z.object({
  reservationId: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "We couldn't read the payment confirmation. Don't pay again — message us with your booking reference and we'll finish it by hand." }, { status: 400 });
  }
  const { reservationId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  const valid = RazorpayProvider.verifyCheckoutSignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  );
  if (!valid) {
    return NextResponse.json({ error: "We couldn't verify that payment with the gateway. Nothing has been charged twice — send us your booking reference and we'll sort it out today." }, { status: 400 });
  }

  const payment = await db.reservationPayment.findFirst({
    where: { reservationId, providerRef: razorpay_order_id },
  });
  if (!payment) {
    return NextResponse.json({ error: "We can't find a payment against that booking yet. If your bank has taken the money, send us the reference and we'll match it up." }, { status: 404 });
  }

  await db.reservationPayment.update({
    where: { id: payment.id },
    data: { providerRef: razorpay_payment_id },
  });

  await confirmReservation(reservationId);

  const reservation = await db.reservation.findUnique({
    where: { id: reservationId },
    select: { code: true, status: true },
  });

  return NextResponse.json({ code: reservation?.code, status: reservation?.status });
}
