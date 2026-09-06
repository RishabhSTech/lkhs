import { db } from "@/lib/db";

/**
 * OTA emails reference a listing by its Airbnb/Booking.com/Agoda title, not
 * our internal property ID, so matching is necessarily best-effort. This is
 * deliberately conservative: it only returns a match when one property
 * stands out clearly, otherwise `null` — which routes the caller to the safe
 * log-and-alert fallback instead of guessing which property a booking is for.
 */

const MIN_SCORE = 0.4;
const MIN_MARGIN_OVER_RUNNER_UP = 0.15;

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function score(hintTokens: string[], candidateTokens: string[]): number {
  if (hintTokens.length === 0 || candidateTokens.length === 0) return 0;
  const candidateSet = new Set(candidateTokens);
  const overlap = hintTokens.filter((t) => candidateSet.has(t)).length;
  return overlap / candidateTokens.length;
}

export async function matchPropertyByHint(hint: string): Promise<{ propertyId: string; propertyName: string; confidence: number } | null> {
  const trimmed = hint.trim();
  if (!trimmed) return null;

  const properties = await db.property.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, locationArea: true },
  });
  if (properties.length === 0) return null;

  const hintTokens = normalize(trimmed);

  const scored = properties
    .map((p) => ({
      propertyId: p.id,
      propertyName: p.name,
      score: Math.max(
        score(hintTokens, normalize(p.name)),
        score(hintTokens, normalize(`${p.name} ${p.locationArea}`)) * 0.9,
      ),
    }))
    .sort((a, b) => b.score - a.score);

  const [best, runnerUp] = scored;
  if (!best || best.score < MIN_SCORE) return null;
  if (runnerUp && best.score - runnerUp.score < MIN_MARGIN_OVER_RUNNER_UP) return null;

  return { propertyId: best.propertyId, propertyName: best.propertyName, confidence: best.score };
}
