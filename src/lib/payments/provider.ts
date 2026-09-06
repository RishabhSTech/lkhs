import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentMethodType, PaymentProviderName } from "@prisma/client";

/**
 * Provider-agnostic payment surface. Razorpay/Stripe adapters implement this
 * interface; nothing above this layer knows which provider is in use.
 */

export type PaymentIntentInput = {
  reservationCode: string;
  amount: number;
  currency: string;
  method: PaymentMethodType;
  customer: { name: string; email?: string | null; phone?: string | null };
};

export type PaymentIntentResult = {
  providerRef: string;
  status: "SUCCEEDED" | "FAILED" | "PENDING";
  /** Where a real provider would send the customer to complete payment. */
  redirectUrl?: string;
  failureReason?: string;
  /**
   * Present only for providers that settle asynchronously (the guest must
   * complete a checkout step client-side before payment is confirmed).
   */
  clientCheckout?: {
    provider: "razorpay";
    keyId: string;
    orderId: string;
    amountPaise: number;
    currency: string;
  };
};

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  /** True when payment only settles after an async step (checkout + webhook/
   * verify), so callers must not treat "PENDING" as a booking-blocking error. */
  readonly settlesAsynchronously: boolean;
  createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;
  verifyWebhook(rawBody: string, signature: string | null): Promise<boolean>;
}

/**
 * Demo provider. No real gateway is connected - this settles synchronously so
 * the booking flow is exercisable end to end. Used automatically whenever
 * Razorpay credentials aren't set.
 */
class MockPaymentProvider implements PaymentProvider {
  readonly name = "MOCK" as const;
  readonly settlesAsynchronously = false;

  async createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    await new Promise((r) => setTimeout(r, 400));
    return {
      providerRef: `mock_${input.reservationCode}_${Date.now().toString(36)}`,
      status: "SUCCEEDED",
    };
  }

  async verifyWebhook(): Promise<boolean> {
    return true;
  }
}

const RAZORPAY_METHOD: Record<PaymentMethodType, string> = {
  UPI: "upi",
  CARD: "card",
  NETBANKING: "netbanking",
  OTHER: "card",
};

/**
 * Real Razorpay integration - Orders API to open an intent, Checkout.js on
 * the client to collect payment, then either the client-side verify callback
 * (src/app/api/bookings/confirm/route.ts) or the webhook
 * (src/app/api/payments/webhook/razorpay/route.ts) confirms it server-side.
 * Razorpay is chosen over Stripe because it settles INR/UPI natively -
 * Stripe's India support is limited to specific onboarded entities.
 */
class RazorpayProvider implements PaymentProvider {
  readonly name = "RAZORPAY" as const;
  readonly settlesAsynchronously = true;

  private get keyId() {
    const key = process.env.RAZORPAY_KEY_ID;
    if (!key) throw new Error("RAZORPAY_KEY_ID is not set");
    return key;
  }

  private get keySecret() {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) throw new Error("RAZORPAY_KEY_SECRET is not set");
    return secret;
  }

  async createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const amountPaise = Math.round(input.amount * 100);
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64");

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: input.currency,
        receipt: input.reservationCode,
        method: RAZORPAY_METHOD[input.method],
        notes: { reservationCode: input.reservationCode, guestName: input.customer.name },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        providerRef: "",
        status: "FAILED",
        failureReason: `Razorpay order creation failed (HTTP ${res.status}): ${body.slice(0, 300)}`,
      };
    }

    const order = (await res.json()) as { id: string; amount: number; currency: string };

    return {
      providerRef: order.id,
      status: "PENDING",
      clientCheckout: {
        provider: "razorpay",
        keyId: this.keyId,
        orderId: order.id,
        amountPaise: order.amount,
        currency: order.currency,
      },
    };
  }

  /** HMAC-SHA256 over the raw webhook body, keyed by RAZORPAY_WEBHOOK_SECRET,
   * compared to the X-Razorpay-Signature header - per Razorpay's webhook spec. */
  async verifyWebhook(rawBody: string, signature: string | null): Promise<boolean> {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret || !signature) return false;

    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /** Verifies the signature Razorpay Checkout.js hands back to the client on
   * success - separate scheme from the webhook signature (order_id|payment_id). */
  static verifyCheckoutSignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) return false;
    const expected = createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    return expected === signature;
  }
}

export function getPaymentProvider(): PaymentProvider {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    return new RazorpayProvider();
  }
  return new MockPaymentProvider();
}

export { RazorpayProvider };

export const PAYMENT_PROVIDER_IS_MOCK = !(
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
);
