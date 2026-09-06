/**
 * Renders one or more structured-data blocks. Multiple schemas are emitted as a
 * single JSON array in one script tag, which Google parses identically to
 * separate tags and keeps the document tidy.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <script
      type="application/ld+json"
      // Built entirely from our own database - no user-supplied strings.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
