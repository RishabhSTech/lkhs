import { absoluteUrl } from "@/lib/seo/site";

/**
 * Shared shell for every HTML email - header logo, icon hero, a flexible
 * content slot, an optional CTA button and a footer. Built with inline
 * styles and table layout rather than the site's Tailwind classes; most
 * email clients strip <style> classes and don't run a CSS pipeline.
 * Colors match the CSS custom properties in src/app/globals.css.
 */
export const EMAIL_COLORS = {
  blue: "#0b2f6b",
  ivory: "#f7f9fc",
  ink: "#0e1420",
  border: "#e3e8f1",
  muted: "#f4f7fc",
  mutedFg: "#5b6b82",
  gold: "#d99a1f",
} as const;

// Single-quoted: this string is interpolated inside double-quoted style="" attributes.
export const EMAIL_FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** One cell of the 2-up detail grid used across booking emails. */
export function emailDetailCell(label: string, value: string, sub?: string): string {
  const c = EMAIL_COLORS;
  return `
    <td style="padding:0 12px 20px 0;vertical-align:top;width:50%;">
      <p style="margin:0;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${c.mutedFg};">${label}</p>
      <p style="margin:4px 0 0;font-size:14px;font-weight:500;color:${c.ink};">${value}</p>
      ${sub ? `<p style="margin:2px 0 0;font-size:12px;color:${c.mutedFg};">${sub}</p>` : ""}
    </td>`;
}

/** Muted, rounded callout box used for asides ("we don't take payment online yet", etc). */
export function emailCallout(html: string): string {
  const c = EMAIL_COLORS;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;background-color:${c.muted};border-radius:8px;">
      <tr>
        <td style="padding:14px 16px;font-size:13px;line-height:1.5;color:${c.mutedFg};">
          ${html}
        </td>
      </tr>
    </table>`;
}

export type EmailShellOptions = {
  /** Character/entity shown in the 56px hero badge (dingbat or emoji). */
  badgeIcon: string;
  badgeColor?: string;
  badgeTextColor?: string;
  headline: string;
  subhead?: string;
  /** Arbitrary markup injected below the hero - property card, detail grid, callouts. */
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
};

export function renderEmailShell(opts: EmailShellOptions): string {
  const c = EMAIL_COLORS;
  const font = EMAIL_FONT;
  const logoUrl = absoluteUrl("/lkhs-dark.svg");
  const badgeColor = opts.badgeColor ?? c.blue;
  const badgeTextColor = opts.badgeTextColor ?? c.ivory;

  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
          <tr>
            <td style="border-radius:8px;background-color:${c.blue};">
              <a href="${opts.ctaUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;font-family:${font};">${opts.ctaLabel}</a>
            </td>
          </tr>
        </table>`
      : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:${c.muted};font-family:${font};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${c.muted};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${c.border};">
            <tr>
              <td align="center" style="padding:28px 32px;border-bottom:1px solid ${c.border};">
                <img src="${logoUrl}" alt="Lime Kraft Home Stay" height="32" style="height:32px;width:auto;display:block;border:0;" />
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:40px 32px 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td width="56" height="56" align="center" valign="middle" style="background-color:${badgeColor};border-radius:999px;font-size:24px;line-height:56px;color:${badgeTextColor};font-weight:700;">${opts.badgeIcon}</td>
                  </tr>
                </table>
                <h1 style="margin:20px 0 0;font-size:28px;line-height:1.25;font-weight:500;color:${c.ink};letter-spacing:-0.02em;font-family:${font};">${opts.headline}</h1>
                ${opts.subhead ? `<p style="margin:10px 0 0;font-size:15px;color:${c.mutedFg};">${opts.subhead}</p>` : ""}
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 8px;">
                ${opts.bodyHtml}
                ${cta}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px;border-top:1px solid ${c.border};">
                <p style="margin:0;font-size:13px;color:${c.mutedFg};">${opts.footerNote ?? "- Lime Kraft Home Stays"}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
