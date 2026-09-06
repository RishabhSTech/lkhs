import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { confirmReservation, releasePendingReservation } from "@/lib/booking/create-reservation";
import { getPaymentProvider } from "@/lib/payments/provider";

/**
 * Authoritative payment confirmation. Configure this URL
 * (APP_URL + /api/payments/webhook/razorpay) in the Razorpay dashboard once
 * RAZORPAY_WEBHOOK_SECRET is set. The client-side confirm route
 * (src/app/api/bookings/confirm/route.ts) is a same-request convenience -
 * this is the path that's trustworthy even if the guest closes their tab.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  const provider = getPaymentProvider();
  if (provider.name !== "RAZORPAY") {
    return NextResponse.json({ error: "Razorpay is not the active payment provider." }, { status: 400 });
  }

  const verified = await provider.verifyWebhook(rawBody, signature);
  if (!verified) {
    return NextResponse.json({ error: "Webhook signature verification failed." }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as {
    event: string;
    payload?: { payment?: { entity?: { order_id?: string; id?: string } } };
  };

  const orderId = event.payload?.payment?.entity?.order_id;
  const paymentId = event.payload?.payment?.entity?.id;
  if (!orderId) {
    return NextResponse.json({ ok: true }); // event we don't care about
  }

  const payment = await db.reservationPayment.findFirst({
    where: { providerRef: orderId },
  });
  if (!payment) {
    return NextResponse.json({ ok: true }); // unknown order, nothing to do
  }

  if (event.event === "payment.captured") {
    if (paymentId) {
      await db.reservationPayment.update({
        where: { id: payment.id },
        data: { providerRef: paymentId },
      });
    }
    await confirmReservation(payment.reservationId);
  } else if (event.event === "payment.failed") {
    await releasePendingReservation(payment.reservationId);
  }

  return NextResponse.json({ ok: true });
}
