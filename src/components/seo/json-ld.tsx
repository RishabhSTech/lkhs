/**
 * Renders one or more structured-data blocks. Multiple schemas are emitted as a
 * single JSON array in one script tag, which Google parses identically to
 * separate tags and keeps the document tidy.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  const payload = Array.isArray(data) ? data : [data];
  // Some callers embed guest-submitted text (e.g. review bodies) here. Escape
  // "<" so a value containing "</script>" can't close this tag early and
  // inject markup - < is a valid JSON/JS string escape, so this doesn't
  // change the parsed value, only how it's spelled in the HTML source.
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
  );
}
