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
};

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;
  verifyWebhook(payload: unknown, signature: string): Promise<boolean>;
}

/**
 * Demo provider. No real gateway is connected — this settles synchronously so
 * the booking flow is exercisable end to end. Swap for a real adapter by
 * implementing PaymentProvider and returning it from getPaymentProvider().
 */
class MockPaymentProvider implements PaymentProvider {
  readonly name = "MOCK" as const;

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

export function getPaymentProvider(): PaymentProvider {
  // Real providers are selected here once credentials exist, e.g.
  // if (process.env.RAZORPAY_KEY_ID) return new RazorpayProvider();
  return new MockPaymentProvider();
}

export const PAYMENT_PROVIDER_IS_MOCK = true;
