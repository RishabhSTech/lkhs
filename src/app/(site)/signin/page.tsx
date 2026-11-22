import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site/site-header";
import { SignInForm } from "@/components/site/signin-form";
import { db } from "@/lib/db";
import { getSession, redirectPathForRole, STAKEHOLDER_ROLES } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

/**
 * Where to send someone who opens /signin while already signed in (the
 * home-screen app reopening here, or a verify reply lost on a flaky mobile
 * connection after the cookie was set). Only when the destination's own
 * guard will accept them - otherwise it would bounce back here in a loop.
 */
async function alreadySignedInPath(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.userId }, select: { role: true } });
  if (!user || user.role !== session.role) return null;
  if (STAKEHOLDER_ROLES.includes(user.role)) {
    const stakeholder = await db.stakeholder.findUnique({ where: { userId: session.userId }, select: { id: true } });
    if (!stakeholder) return null;
  }
  return redirectPathForRole(user.role);
}

export default async function SignInPage() {
  const destination = await alreadySignedInPath();
  if (destination) redirect(destination);

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-md px-4 py-12 sm:px-6">
          <h1 className="font-heading text-3xl leading-tight text-foreground">
            Sign in
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            We&apos;ll send you a code. No password to remember.
          </p>
          <div className="mt-7">
            <SignInForm />
          </div>
        </div>
      </main>
    </>
  );
}
