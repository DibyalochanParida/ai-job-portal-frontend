import { useState, type ReactNode } from "react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { Kpi } from "../../lib/types";
import { cx, IconTile } from "../ui";

type Direction = "up-good" | "neutral";

function formatDelta(kpi: Kpi): string | null {
  if (kpi.delta == null) return null;
  const sign = kpi.delta > 0 ? "+" : kpi.delta < 0 ? "−" : "±";
  const abs = Math.abs(kpi.delta);
  if (kpi.deltaUnit === "percent") return `${sign}${abs}%`;
  if (kpi.deltaUnit === "points") return `${sign}${abs} pts`;
  return `${sign}${abs}`;
}

/** Delta pill: signed, versus the previous period; colour = direction × whether up is good, always with an icon. */
export function DeltaBadge({ kpi, direction = "up-good", periodLabel }: { kpi: Kpi; direction?: Direction; periodLabel: string }) {
  const text = formatDelta(kpi);
  if (!text) return null;
  const d = kpi.delta ?? 0;
  const tone = direction === "neutral" || d === 0 ? "neutral" : d > 0 ? "good" : "critical";
  const Icon = d > 0 ? TrendingUp : d < 0 ? TrendingDown : Minus;
  const toneClass = { neutral: "bg-surface-2 text-ink-2", good: "bg-good-soft text-good-text", critical: "bg-critical-soft text-critical-text" }[tone];
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", toneClass)} title={`${text} vs ${periodLabel}`}>
      <Icon className="size-3.5" aria-hidden />
      {text}
      <span className="sr-only"> vs {periodLabel}</span>
    </span>
  );
}

/**
 * Mini column sparkline: past buckets in the de-emphasis step, the current bucket in the accent.
 * Each column has a full-height hit target and a hover/focus tooltip.
 */
export function Sparkline({ values, labels, format, name }: { values: number[]; labels: string[]; format: (v: number) => string; name: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...values, 1);
  const H = 40;
  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <div className="flex h-10 items-end gap-[3px]" role="img" aria-label={`${name} trend: ${values.map((v, i) => `${labels[i]} ${format(v)}`).join(", ")}`}>
        {values.map((v, i) => {
          const h = v === 0 ? 2 : Math.max(4, Math.round((v / max) * H));
          const current = i === values.length - 1;
          return (
            <div
              key={i}
              className="flex h-full w-[7px] items-end"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              tabIndex={-1}
            >
              <div
                className="w-full rounded-t-[2px]"
                style={{ height: h, background: current ? "var(--accent)" : "var(--spark)", opacity: hover != null && hover !== i ? 0.55 : 1 }}
              />
            </div>
          );
        })}
      </div>
      {hover != null && (
        <div className="pointer-events-none absolute bottom-full right-0 z-10 mb-2 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-md">
          <p className="text-muted">{labels[hover]}</p>
          <p className="font-semibold text-ink tabular">{format(values[hover]!)}</p>
        </div>
      )}
    </div>
  );
}

export function StatTile(props: {
  icon: ReactNode;
  label: string;
  sublabel: string;
  value: string;
  kpi: Kpi;
  direction?: Direction;
  periodLabel: string;
  bucketLabels: string[];
  formatPoint: (v: number) => string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-start justify-between">
        <IconTile>{props.icon}</IconTile>
        <DeltaBadge kpi={props.kpi} direction={props.direction} periodLabel={props.periodLabel} />
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-3xl font-semibold tracking-tight">{props.value}</p>
          <p className="mt-1 text-sm font-medium">{props.label}</p>
          <p className="text-xs text-muted">{props.sublabel}</p>
        </div>
        <Sparkline values={props.kpi.series} labels={props.bucketLabels} format={props.formatPoint} name={props.label} />
      </div>
    </div>
  );
}
