import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { UserManager } from "@/components/admin/user-manager";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { formatDateLong } from "@/lib/format";
import { PAYMENT_PROVIDER_IS_MOCK } from "@/lib/payments/provider";
import { EMAIL_IS_LIVE } from "@/lib/notifications/provider";

export const dynamic = "force-dynamic";

const ROLE_DESCRIPTIONS: Record<string, string> = {
  SUPER_ADMIN: "Full access to everything, including permissions and settings.",
  ADMIN: "Everything except permission changes.",
  MANAGER: "Bookings, calendar and guests for assigned properties.",
  FINANCE: "Financial records, expenses, budgets and reports.",
  OPERATIONS: "Cleaning and maintenance across assigned properties.",
  CLEANER: "Only their own assigned cleaning tasks.",
  OWNER: "Financial performance for properties they own.",
  INVESTOR: "Investment and returns for properties they hold.",
  MARKETING: "Listings, content and promotions.",
  GUEST: "Their own bookings only.",
};

function buildIntegrations(mailboxStatus: string | null) {
  const airbnbConfigured = Boolean(process.env.AIRBNB_API_KEY && process.env.AIRBNB_API_BASE_URL);
  const redisConfigured = Boolean(process.env.REDIS_URL);
  const s3Configured = Boolean(process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY);

  return [
    {
      name: "OTA email parsing",
      detail: "Mailbox (Hostinger IMAP) — Airbnb / Booking.com / Agoda",
      status: mailboxStatus === "CONNECTED" ? "Connected" : "Not connected",
      note:
        mailboxStatus === "CONNECTED"
          ? "Reading homestay@ inbox notifications every 5 minutes."
          : "Connect the mailbox to pull in OTA inquiries and bookings automatically.",
    },
    {
      name: "Payments",
      detail: "Razorpay",
      status: PAYMENT_PROVIDER_IS_MOCK ? "Not connected" : "Connected",
      note: PAYMENT_PROVIDER_IS_MOCK
        ? "Bookings settle through a mock provider."
        : "Bookings settle through Razorpay Checkout + webhook.",
    },
    {
      name: "Email",
      detail: "Resend",
      status: EMAIL_IS_LIVE ? "Connected" : "Not connected",
      note: EMAIL_IS_LIVE
        ? "Booking confirmations and OTP codes are delivered."
        : "Outbound email is logged, not delivered.",
    },
    {
      name: "WhatsApp",
      detail: "WhatsApp Business API",
      status: "Not connected",
      note: "Messages are logged, not delivered.",
    },
    {
      name: "Channel manager",
      detail: "Airbnb / Booking.com / Agoda",
      status: airbnbConfigured ? "Configured" : "Not connected",
      note: airbnbConfigured
        ? "Airbnb syncs live; Booking.com and Agoda have no adapter yet."
        : "No live OTA syncing.",
    },
    {
      name: "Background jobs",
      detail: "Redis / BullMQ",
      status: redisConfigured ? "Connected" : "Not connected",
      note: redisConfigured
        ? "Channel sync, payment-hold expiry and recurring expenses run on schedule."
        : "REDIS_URL not set — jobs are skipped, not queued.",
    },
    {
      name: "Object storage",
      detail: "S3-compatible (MinIO)",
      status: s3Configured ? "Configured" : "Not connected",
      note: "Available for receipt and photo uploads.",
    },
    { name: "Database", detail: "Supabase Postgres", status: "Connected", note: "Source of truth for all records." },
  ];
}

export default async function SettingsPage() {
  const { user } = await getCurrentAdminUser();
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const [users, auditLogs, mailboxIntegration] = await Promise.all([
    db.user.findMany({
      include: { propertyAssignments: { include: { property: { select: { name: true } } } } },
      orderBy: { name: "asc" },
    }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
    db.mailboxIntegration.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);
  const integrations = buildIntegrations(mailboxIntegration?.status ?? null);

  return (
    <AdminPage>
      <PageHeader
        title="Settings"
        description="Team access, integrations and the audit trail."
      />

      <Tabs defaultValue="team" className="mt-6">
        <TabsList>
          <TabsTrigger value="team">Team & roles</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="mt-5 space-y-5">
          {isSuperAdmin && (
            <UserManager
              initialUsers={users.map((member) => ({
                id: member.id,
                name: member.name,
                email: member.email,
                phone: member.phone,
                role: member.role,
                propertyAssignments: member.propertyAssignments.map((assignment) => ({
                  property: { name: assignment.property.name },
                })),
              }))}
            />
          )}

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Team</h2>
            <ul className="mt-4 divide-y divide-border">
              {users.map((user) => (
                <li
                  key={user.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.email ?? user.phone ?? "No contact"}
                      {user.propertyAssignments.length > 0 &&
                        ` · ${user.propertyAssignments.length} properties`}
                    </p>
                  </div>
                  <Badge className="border-chart-3/25 bg-chart-3/10 text-chart-3">
                    {user.role.toLowerCase().replace(/_/g, " ")}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">
              What each role can do
            </h2>
            <dl className="mt-4 space-y-3">
              {Object.entries(ROLE_DESCRIPTIONS).map(([role, description]) => (
                <div key={role} className="flex flex-wrap gap-x-3 gap-y-1">
                  <dt className="w-32 shrink-0 text-sm font-medium capitalize text-foreground">
                    {role.toLowerCase().replace(/_/g, " ")}
                  </dt>
                  <dd className="flex-1 text-sm text-muted-foreground">
                    {description}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </TabsContent>

        <TabsContent value="integrations" className="mt-5 space-y-5">
          <Link
            href="/admin/settings/integrations"
            className="group flex items-center justify-between rounded-xl border border-border bg-card p-5 transition-colors hover:border-ring"
          >
            <div>
              <h2 className="text-sm font-semibold text-foreground">Mailbox OTA email parsing</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Connect the mailbox and see what&apos;s been parsed.
              </p>
            </div>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">
              Integration status
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Nothing here is faked — anything not connected says so.
            </p>
            <ul className="mt-4 divide-y divide-border">
              {integrations.map((integration) => (
                <li
                  key={integration.name}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {integration.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {integration.detail} · {integration.note}
                    </p>
                  </div>
                  <Badge
                    className={
                      integration.status === "Connected"
                        ? "border-chart-1/25 bg-chart-1/10 text-chart-1"
                        : integration.status === "Configured"
                          ? "border-chart-3/25 bg-chart-3/10 text-chart-3"
                          : "border-border bg-muted text-muted-foreground"
                    }
                  >
                    {integration.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        </TabsContent>

        <TabsContent value="audit" className="mt-5">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Audit log</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Every change that touches money, pricing or bookings.
            </p>
            <ul className="mt-4 divide-y divide-border">
              {auditLogs.map((log) => (
                <li key={log.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{log.userName}</span>{" "}
                    {log.summary}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {log.action.toLowerCase().replace(/_/g, " ")} ·{" "}
                    {formatDateLong(log.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </TabsContent>
      </Tabs>
    </AdminPage>
  );
}
