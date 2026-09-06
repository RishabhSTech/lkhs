import type {
  ChannelProfitability, PLStatement as PL,
} from "@/lib/finance/calculations";
import { SOURCE_LABELS } from "@/lib/admin/sources";
import { formatINR } from "@/lib/format";

export function PLStatement({
  title,
  pl,
  channels,
}: {
  title: string;
  pl: PL;
  channels?: ChannelProfitability[];
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>

      <dl className="mt-4 text-sm">
        <Group label="Revenue" />
        {channels?.filter((c) => c.grossRevenue > 0).map((c) => (
          <Line
            key={c.source}
            label={SOURCE_LABELS[c.source]}
            value={c.grossRevenue}
            indent
          />
        ))}
        <Line label="Gross revenue" value={pl.grossRevenue} subtotal />

        <Group label="Less" className="mt-4" />
        <Line label="Channel commission" value={-pl.otaFees} indent />
        <Line label="Payment processing" value={-pl.paymentFees} indent />
        <Line label="Net revenue" value={pl.netRevenue} subtotal />

        <Group label="Operating expenses" className="mt-4" />
        {pl.expensesByCategory.length === 0 ? (
          <p className="py-1.5 pl-3 text-muted-foreground">
            No operating expenses in this period.
          </p>
        ) : (
          pl.expensesByCategory.map((e) => (
            <Line key={e.name} label={e.name} value={-e.amount} indent />
          ))
        )}
        <Line
          label="Total operating expenses"
          value={-pl.operatingExpenses}
          subtotal
        />

        <div className="mt-4 flex items-baseline justify-between gap-3 border-t-2 border-border pt-3">
          <dt className="font-semibold text-foreground">Net operating income</dt>
          <dd
            className={
              pl.netOperatingIncome >= 0
                ? "text-lg font-semibold tabular-nums text-foreground"
                : "text-lg font-semibold tabular-nums text-destructive"
            }
          >
            {formatINR(pl.netOperatingIncome)}
          </dd>
        </div>

        {pl.depositsHeld !== 0 && (
          <p className="mt-3 rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
            {formatINR(pl.depositsHeld)} in refundable security deposits is held
            separately - it is capital tied up, not an expense, so it never
            touches net operating income.
          </p>
        )}
      </dl>
    </section>
  );
}

function Group({ label, className }: { label: string; className?: string }) {
  return (
    <p
      className={`text-[0.6875rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase ${className ?? ""}`}
    >
      {label}
    </p>
  );
}

function Line({
  label,
  value,
  indent,
  subtotal,
}: {
  label: string;
  value: number;
  indent?: boolean;
  subtotal?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 py-1.5 ${
        subtotal ? "border-t border-border font-medium" : ""
      }`}
    >
      <dt className={indent ? "pl-3 text-muted-foreground" : "text-foreground"}>
        {label}
      </dt>
      <dd
        className={`tabular-nums ${
          value < 0 ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {formatINR(value)}
      </dd>
    </div>
  );
}
