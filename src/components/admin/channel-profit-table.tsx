import type { ChannelProfitability } from "@/lib/finance/calculations";
import { SOURCE_LABELS, SOURCE_VAR } from "@/lib/admin/sources";
import { formatINRCompact, formatPercent } from "@/lib/format";

export function ChannelProfitTable({
  channels,
}: {
  channels: ChannelProfitability[];
}) {
  if (channels.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No channel revenue recorded yet.
      </p>
    );
  }

  const maxNet = Math.max(...channels.map((c) => c.netRevenue), 1);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left">
          {["Channel", "Gross", "Fees", "Net", "Share"].map((h) => (
            <th
              key={h}
              className="pb-2 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase last:text-right"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {channels.map((channel) => (
          <tr key={channel.source}>
            <td className="py-2.5">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ background: SOURCE_VAR[channel.source] }}
                />
                <span className="text-foreground">
                  {SOURCE_LABELS[channel.source]}
                </span>
              </span>
              {/* Share bar doubles as the visual comparison; the number is beside it. */}
              <span
                aria-hidden
                className="mt-1.5 block h-1 rounded-full"
                style={{
                  width: `${Math.max(4, (channel.netRevenue / maxNet) * 100)}%`,
                  background: SOURCE_VAR[channel.source],
                  opacity: 0.35,
                }}
              />
            </td>
            <td className="py-2.5 tabular-nums text-muted-foreground">
              {formatINRCompact(channel.grossRevenue)}
            </td>
            <td className="py-2.5 tabular-nums text-muted-foreground">
              {formatINRCompact(channel.fees)}
            </td>
            <td className="py-2.5 font-medium tabular-nums text-foreground">
              {formatINRCompact(channel.netRevenue)}
            </td>
            <td className="py-2.5 text-right tabular-nums text-muted-foreground">
              {formatPercent(channel.sharePercent, 0)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
