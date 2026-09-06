import type { Metadata } from "next";
import { Newsreader, Instrument_Sans, Inter, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SITE } from "@/lib/seo/site";
import "./globals.css";

/**
 * Three roles, deliberately separated:
 *
 * - `display` (Newsreader) is the brand voice: hero and section headlines on
 *   the marketing site only. Its optical-size axis is what makes it work at
 *   both 64px and 20px; `font-optical-sizing: auto` drives it from font-size.
 * - `heading` (Instrument Sans) carries product surfaces — admin, tables,
 *   dialogs — where a serif would read as decoration rather than structure.
 * - `body` (Inter) handles UI and long text at small sizes.
 *
 * Italic is loaded because the accent word in a headline is the cheapest
 * editorial signal we have, and Newsreader's italic is a genuine cut rather
 * than a slanted roman.
 *
 * `opsz` is the only non-weight axis this face exposes. Fraunces, which this
 * replaced, also carried SOFT and WONK; anything still setting those in CSS is
 * addressing axes that no longer exist and will silently do nothing.
 */
const display = Newsreader({
  variable: "--font-display-serif",
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
});

const heading = Instrument_Sans({
  variable: "--font-heading-sans",
  subsets: ["latin"],
  display: "swap",
});

const body = Inter({
  variable: "--font-body-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Villas, apartments and homes across India`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  manifest: "/manifest.json",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: SITE.locale,
    url: SITE.url,
    title: `${SITE.name} — Villas, apartments and homes across India`,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — Villas, apartments and homes across India`,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
    // Let Google build full-size previews and long snippets; the defaults are
    // conservative and cost impressions on listing pages.
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${heading.variable} ${display.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <TooltipProvider delay={150}>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </TooltipProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
