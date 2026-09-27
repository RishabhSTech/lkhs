import Link from "next/link";
import { Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/site/empty-state";
import { formatDateTime } from "@/lib/format";
import { OTA_SOURCE_LABELS, type InboxThread, type InboxEmail } from "@/lib/mailbox/inbox-threads";

const CLASSIFICATION_LABELS: Record<InboxEmail["classification"], string> = {
  INQUIRY: "Inquiry",
  BOOKING_CONFIRMED: "Booking confirmed",
  BOOKING_MODIFIED: "Booking modified",
  BOOKING_CANCELLED: "Booking cancelled",
  OTHER: "Other",
};

const CLASSIFICATION_STYLES: Record<InboxEmail["classification"], string> = {
  INQUIRY: "border-chart-4/25 bg-chart-4/10 text-chart-4",
  BOOKING_CONFIRMED: "border-chart-1/25 bg-chart-1/10 text-chart-1",
  BOOKING_MODIFIED: "border-chart-1/25 bg-chart-1/10 text-chart-1",
  BOOKING_CANCELLED: "border-destructive/25 bg-destructive/10 text-destructive",
  OTHER: "border-border bg-muted text-muted-foreground",
};

const OUTCOME_LABELS: Record<InboxThread["outcome"], string> = {
  BOOKED: "Booked",
  CANCELLED: "Cancelled",
  INQUIRY_ONLY: "Inquiry only",
};

const OUTCOME_STYLES: Record<InboxThread["outcome"], string> = {
  BOOKED: "border-chart-1/25 bg-chart-1/10 text-chart-1",
  CANCELLED: "border-destructive/25 bg-destructive/10 text-destructive",
  INQUIRY_ONLY: "border-chart-4/25 bg-chart-4/10 text-chart-4",
};

export function MailboxInboxFeed({ threads }: { threads: InboxThread[] }) {
  if (threads.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="Nothing in the mailbox yet"
        description="Airbnb, Booking.com and Agoda notification emails will show up here as they're synced - as an inquiry first, and again if it later turns into a booking."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {threads.map((thread) => (
        <li key={thread.key} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {thread.guestName ?? "Unmatched guest"}
              </p>
              <p className="text-xs text-muted-foreground">
                {thread.propertyName ?? "Property unknown until booked"}
                {thread.sources.length > 0 &&
                  ` · ${thread.sources.map((s) => OTA_SOURCE_LABELS[s] ?? s).join(", ")}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {thread.needsAttention && (
                <Badge className="border-chart-4/25 bg-chart-4/10 text-chart-4">Needs review</Badge>
              )}
              <Badge
                className={OUTCOME_STYLES[thread.outcome]}
                render={
                  thread.reservationCode ? (
                    <Link href={`/admin/reservations?code=${thread.reservationCode}`} />
                  ) : undefined
                }
              >
                {OUTCOME_LABELS[thread.outcome]}
                {thread.reservationCode && ` · ${thread.reservationCode}`}
              </Badge>
            </div>
          </div>

          <ul className="mt-3 space-y-2.5">
            {thread.emails.map((email) => (
              <li key={email.id} className="rounded-lg bg-muted/50 p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge className={CLASSIFICATION_STYLES[email.classification]}>
                    {CLASSIFICATION_LABELS[email.classification]}
                  </Badge>
                  {email.source && (
                    <Badge className="border-border bg-background text-muted-foreground">
                      {OTA_SOURCE_LABELS[email.source] ?? email.source}
                    </Badge>
                  )}
                  <span className="ml-auto text-[0.6875rem] text-muted-foreground/70">
                    {formatDateTime(email.receivedAt)}
                  </span>
                </div>

                <p className="mt-2 text-sm font-medium text-foreground">{email.subject}</p>
                {email.bodySnippet && (
                  <p className="mt-1 line-clamp-3 text-xs whitespace-pre-line text-muted-foreground">
                    {email.bodySnippet}
                  </p>
                )}
                <p className="mt-1.5 text-[0.6875rem] text-muted-foreground/70">{email.fromAddress}</p>

                {email.status !== "PROCESSED" && email.error && (
                  <p className="mt-1.5 text-[0.6875rem] text-chart-4">{email.error}</p>
                )}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
