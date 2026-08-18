import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LogoStacked } from "@/components/brand/logo";
import { getCities } from "@/lib/queries/locations";
import { JOURNAL_POSTS } from "../../../prisma/seed-data";

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

export async function SiteFooter() {
  // Tolerate a database blip: a footer without city links is far better than a
  // 500 on every page of the site.
  const cities = await getCities().catch(() => []);

  return (
    <footer className="mt-auto border-t border-border bg-brand-blue text-white">
      <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-6 lg:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <LogoStacked tone="light" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">
              Boutique homes run with the care of a small hotel and the ease of
              your own place.
            </p>

            {/* City links in the footer put every hub one hop from every page
                on the site, which is what gets a new city crawled quickly. */}
            {cities.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2">
                {cities.map((city) => (
                  <li key={city.slug}>
                    <Link
                      href={`/stays-in-${city.slug}`}
                      className="text-sm text-white/75 transition-colors hover:text-white"
                    >
                      Stays in {city.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
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

        {/* The journal used to run as a full section on the homepage, where it
            competed with the booking argument at equal weight. Three links
            here keep it discoverable without giving it a whole band. */}
        <div className="mt-12 border-t border-white/15 pt-8">
          <h3 className="font-sans text-[0.6875rem] font-semibold tracking-[0.16em] text-white/45 uppercase">
            From the journal
          </h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3 sm:gap-6">
            {JOURNAL_POSTS.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/journal/${post.slug}`}
                  className="group flex items-start gap-1.5 text-sm text-white/75 transition-colors hover:text-white"
                >
                  <span>{post.title}</span>
                  <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 opacity-50 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <p className="mt-1 text-xs text-white/40">
                  {post.readMinutes} min read
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/15 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Lime Kraft Home Stays. India.</p>
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
