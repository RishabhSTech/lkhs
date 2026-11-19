/**
 * Render-side guard for stored links: only http(s) URLs become hrefs or image
 * sources. Defence in depth on top of isOwnStorageUrl at write time, and it
 * covers rows saved before that check existed.
 */
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}
