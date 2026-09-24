import sanitizeHtml from "sanitize-html";

/**
 * Property descriptions were plain text (with manual line breaks) before the
 * rich text editor shipped, and existing rows are still stored that way -
 * these helpers let both formats coexist without a data migration.
 */

const HTML_TAG_RE = /<\/?[a-z][\s\S]*>/i;

// Matches the marks/nodes the rich text editor's schema actually allows -
// see src/components/admin/rich-text-editor.tsx. Applied on save (the admin
// PATCH route) and again wherever a description is rendered as HTML, so a
// bad row already in the database can't reach a visitor's browser unescaped.
export function sanitizeDescriptionHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "strong", "em", "ul", "ol", "li", "br"],
    allowedAttributes: {},
  });
}

export function isHtmlContent(value: string) {
  return HTML_TAG_RE.test(value);
}

export function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Wraps legacy plain text into paragraph HTML so it loads into the rich
 * editor, and renders on the public page, with its line breaks intact. */
export function plainTextToHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Normalizes a description to safe, renderable HTML regardless of whether
 * it's legacy plain text or already-rich HTML saved by the editor. */
export function descriptionToHtml(value: string) {
  return sanitizeDescriptionHtml(isHtmlContent(value) ? value : plainTextToHtml(value));
}

/** Plain-text rendering for contexts that can't have markup - meta
 * descriptions, JSON-LD. */
export function descriptionToPlainText(value: string) {
  return isHtmlContent(value) ? stripHtml(value) : value;
}
