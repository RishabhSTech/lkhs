import type { CapitalPosition } from "@/lib/finance/calculations";
import { formatINR, formatPercent } from "@/lib/format";

export function CapitalRecovery({ capital }: { capital: CapitalPosition }) {
  const pct = Math.min(100, capital.capitalRecoveredPercent);
  const recovered = Math.min(
    capital.cumulativeNetEarnings,
    capital.totalFundsDeployed,
  );

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground">Capital recovery</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Earnings returned against capital deployed
      </p>

      <p className="mt-5 font-heading text-4xl leading-none text-brand-green">
        {formatPercent(capital.capitalRecoveredPercent)}
      </p>
      <p className="mt-1.5 text-xs text-muted-foreground">recovered so far</p>

      <div
        className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Capital recovered"
      >
        <div
          className="h-full rounded-full bg-chart-1 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      <dl className="mt-5 space-y-2.5 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Funds deployed</dt>
          <dd className="font-medium tabular-nums text-foreground">
            {formatINR(capital.totalFundsDeployed)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Recovered</dt>
          <dd className="font-medium tabular-nums text-chart-1">
            {formatINR(recovered)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2.5">
          <dt className="text-muted-foreground">Remaining</dt>
          <dd className="font-semibold tabular-nums text-foreground">
            {formatINR(capital.remainingToRecover)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
