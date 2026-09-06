import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRight, CreditCard, Heart, Luggage, MessageSquare, UserRound,
} from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false },
};

const LINKS = [
  { href: "/account/trips", label: "My trips", description: "Upcoming, past and cancelled stays", icon: Luggage },
  { href: "/account/saved", label: "Saved stays", description: "Homes you've kept for later", icon: Heart },
  { href: "/account", label: "Profile", description: "Your details and preferences", icon: UserRound },
  { href: "/account", label: "Payments", description: "Cards and payment history", icon: CreditCard },
  { href: "/contact", label: "Messages", description: "Talk to the Lime Kraft team", icon: MessageSquare },
];

export default async function AccountPage() {
  const session = await getSession();
  const guest = session
    ? await db.guest.findFirst({ where: { userId: session.userId } })
    : null;

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
          <h1 className="font-heading text-3xl leading-tight text-foreground sm:text-4xl">
            {session ? `Hello, ${session.name.split(" ")[0]}` : "Your account"}
          </h1>

          {!session && (
            <div className="mt-6 rounded-xl border border-border bg-card p-6">
              <h2 className="font-heading text-xl text-foreground">
                Sign in to see your trips
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                We&apos;ll send a code to your email or mobile - no password needed.
                If you&apos;ve booked with us before, your trips are already here.
              </p>
              <Button render={<Link href="/signin" />} size="lg" className="mt-5">
                Sign in
              </Button>
            </div>
          )}

          {guest && (
            <p className="mt-2 text-sm text-muted-foreground">
              {guest.email ?? guest.phone}
            </p>
          )}

          <ul className="mt-8 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {LINKS.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40"
                >
                  <link.icon className="size-5 shrink-0 text-brand-mist" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">
                      {link.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {link.description}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  );
}
