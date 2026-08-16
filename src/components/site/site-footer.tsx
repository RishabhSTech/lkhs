import Link from "next/link";
import { LogoStacked } from "@/components/brand/logo";

const COLUMNS = [
  {
    title: "Stay",
    links: [
      { href: "/stays", label: "All stays" },
      { href: "/destinations", label: "Destinations" },
      { href: "/stays?category=long-stay", label: "Long stays" },
      { href: "/stays?category=work-trip", label: "Work trips" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us" },
      { href: "/journal", label: "Journal" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Guests",
    links: [
      { href: "/account", label: "My account" },
      { href: "/account/trips", label: "My trips" },
      { href: "/account/saved", label: "Saved stays" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-brand-green text-white">
      <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-6 lg:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <LogoStacked tone="light" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">
              Boutique homes across Indore, run with the care of a small hotel and
              the ease of your own place.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="font-sans text-[0.6875rem] font-semibold tracking-[0.16em] text-white/45 uppercase">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/75 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/15 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Lime Kraft Home Stays. Indore, India.</p>
          <div className="flex gap-5">
            <Link href="/contact" className="transition-colors hover:text-white">
              Support
            </Link>
            <Link href="/admin" className="transition-colors hover:text-white">
              Team login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
