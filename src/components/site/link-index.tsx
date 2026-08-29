import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export type IndexLink = { href: string; label: string; count: number };

/**
 * The homepage's link out to every page in the {type} × {city} matrix.
 *
 * Not decoration: this is how those pages get discovered and how authority
 * reaches them from the strongest page on the site. Which is exactly why the
 * pill-farm version was wrong — a drift of identical rounded chips is the
 * universal visual signature of an SEO footer, and it invited the reader to
 * skip the one block on the page that is pure navigation.
 *
 * Set as a ruled index instead, the way a magazine sets its back matter: each
 * row is a real destination with a real count against it, so the block reads as
 * an inventory of what exists rather than a bag of keywords.
 */
export function LinkIndex({ links }: { links: IndexLink[] }) {
  if (links.length === 0) return null;

  return (
    <ul className="grid border-t border-border sm:grid-cols-2 sm:gap-x-12">
      {links.map((link) => (
        <li key={link.href} className="index-row">
          <Link
            href={link.href}
            className="group flex items-baseline gap-4 py-3.5 outline-none focus-visible:underline"
          >
            <span className="flex-1 text-[0.9375rem] text-foreground transition-colors group-hover:text-brand-azure">
              {link.label}
            </span>
            <span className="text-[0.8125rem] text-muted-foreground tabular-nums">
              {link.count}
            </span>
            <ArrowUpRight
              aria-hidden
              className="size-3.5 shrink-0 translate-y-0.5 text-brand-mist transition-all duration-200 group-hover:-translate-y-0 group-hover:text-brand-azure"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
