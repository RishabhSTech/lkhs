/**
 * What the host actually receives for a booking: the booking total less the
 * platform fee, host tax and other charges recorded on it. The single
 * definition behind every "Final payout" in the back office.
 */
export function finalPayout(r: {
  total: number | { toString(): string };
  platformFee: number | { toString(): string };
  hostTax: number | { toString(): string };
  otherCharges: number | { toString(): string };
}): number {
  return Number(r.total) - Number(r.platformFee) - Number(r.hostTax) - Number(r.otherCharges);
}
