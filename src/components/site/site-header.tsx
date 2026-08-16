"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, UserRound, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/stays", label: "Stays" },
  { href: "/destinations", label: "Destinations" },
  { href: "/journal", label: "Journal" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({ transparent = false }: { transparent?: boolean }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!transparent) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [transparent]);

  useEffect(() => setMenuOpen(false), [pathname]);

  const solid = !transparent || scrolled;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-colors duration-300",
        solid
          ? "border-b border-border/70 bg-brand-ivory/85 backdrop-blur-md"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-18">
        <Link href="/" aria-label="Lime Kraft Home Stays — home">
          <Logo tone={solid ? "dark" : "light"} />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  solid
                    ? active
                      ? "text-brand-green"
                      : "text-muted-foreground hover:text-brand-green"
                    : active
                      ? "text-white"
                      : "text-white/75 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            render={<Link href="/account" />}
            variant={solid ? "outline" : "ghost"}
            size="sm"
            className={cn(
              "hidden sm:inline-flex",
              !solid && "text-white hover:bg-white/15 hover:text-white",
            )}
          >
            <UserRound />
            Account
          </Button>
          <Button
            render={<Link href="/stays" />}
            size="sm"
            className={cn(!solid && "bg-white text-brand-green hover:bg-white/90")}
          >
            Find a stay
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn("lg:hidden", !solid && "text-white hover:bg-white/15")}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-border/70 bg-brand-ivory lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2 sm:px-6">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="border-b border-border/50 py-3 text-sm font-medium text-brand-green last:border-0"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
