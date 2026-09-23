import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site/site-header";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false },
};

const FIELDS = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Mobile" },
] as const;

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/signin");

  const guest = await db.guest.findFirst({ where: { userId: session.userId } });

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
          <h1 className="font-heading text-3xl leading-tight text-foreground sm:text-4xl">
            Profile
          </h1>

          <dl className="mt-8 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {FIELDS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-4 px-5 py-4">
                <dt className="text-sm font-medium text-foreground">{label}</dt>
                <dd className="min-w-0 truncate text-sm text-muted-foreground">
                  {guest?.[key] ?? session[key] ?? "Not provided"}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </main>
    </>
  );
}
