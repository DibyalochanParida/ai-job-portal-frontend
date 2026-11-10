import { useState } from "react";
import { ArrowRight, Minus, TrendingDown, TrendingUp, Users } from "lucide-react";
import { STATUS_LABEL } from "../../lib/format";
import type { EmployerAnalytics } from "../../lib/types";
import { Card, cx, IconTile } from "../ui";

// Ordinal ramp (validated light & dark): later stages are darker; dropped is neutral gray.
const STAGE_COLOR: Record<string, string> = {
  applied: "var(--stage-1)",
  shortlisted: "var(--stage-2)",
  scheduled: "var(--stage-3)",
  interviewed: "var(--stage-4)",
  recommended: "var(--stage-5)",
  selected: "var(--stage-6)",
  dropped: "var(--stage-dropped)",
};

export function PipelineHealth({ data, periodLabel }: { data: EmployerAnalytics["pipeline"]; periodLabel: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const total = data.total;
  const parts = data.stages.filter((s) => s.count > 0);
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <Card className="flex flex-col">
      <div className="flex items-center gap-3">
        <IconTile className="size-9"><Users className="size-4" aria-hidden /></IconTile>
        <div>
          <h2 className="font-semibold">Pipeline Health</h2>
          <p className="text-xs text-muted">{total.toLocaleString()} candidates applied in {periodLabel}</p>
        </div>
      </div>

      {/* Thin segmented bar: one whole split into stages; 2px surface gaps; legend = the tiles below. */}
      <div className="relative mt-5">
        <div
          className="flex h-2 gap-[2px] overflow-hidden rounded-full bg-surface-2"
          role="img"
          aria-label={`Pipeline: ${data.stages.map((s) => `${STATUS_LABEL[s.key]} ${s.count} (${pct(s.count)}%)`).join(", ")}`}
          onMouseLeave={() => setHover(null)}
        >
          {parts.map((s) => (
            <div
              key={s.key}
              className="h-full transition-opacity"
              style={{ flexGrow: s.count, flexBasis: 0, background: STAGE_COLOR[s.key], opacity: hover && hover !== s.key ? 0.4 : 1 }}
              onMouseEnter={() => setHover(s.key)}
            />
          ))}
        </div>
        {hover && (
          <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-md">
            <span className="font-semibold">{STATUS_LABEL[hover as keyof typeof STATUS_LABEL]}</span>{" "}
            <span className="text-ink-2 tabular">
              {data.stages.find((s) => s.key === hover)?.count} · {pct(data.stages.find((s) => s.key === hover)?.count ?? 0)}%
            </span>
          </div>
        )}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {data.stages.map((s) => (
          <li
            key={s.key}
            onMouseEnter={() => setHover(s.key)}
            onMouseLeave={() => setHover(null)}
            className={cx("rounded-xl bg-surface-2 px-3 py-2.5 text-center transition", hover === s.key && "ring-1 ring-line")}
          >
            <p className="flex items-center justify-center gap-1.5 text-xs text-ink-2">
              <span className="size-2 rounded-full" style={{ background: STAGE_COLOR[s.key] }} aria-hidden />
              {STATUS_LABEL[s.key]}
            </p>
            <p className="mt-0.5 text-xl font-semibold">{s.count.toLocaleString()}</p>
          </li>
        ))}
        <li className="rounded-xl border border-line px-3 py-2.5 text-center">
          <p className="text-xs text-ink-2">Total</p>
          <p className="mt-0.5 text-xl font-semibold">{total.toLocaleString()}</p>
        </li>
      </ul>

      <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted">Conversion flow</h3>
      <ul className="space-y-1">
        {data.conversions.map((c) => {
          const change = c.rate != null && c.previousRate != null ? c.rate - c.previousRate : null;
          const Icon = change == null || change === 0 ? Minus : change > 0 ? TrendingUp : TrendingDown;
          const tone = change == null || change === 0 ? "text-muted" : change > 0 ? "text-good-text" : "text-critical-text";
          const changeText = change == null ? "no previous data" : `${change > 0 ? "+" : change < 0 ? "−" : "±"}${Math.abs(change)} pts vs previous period`;
          return (
            <li key={c.from} className="grid grid-cols-[1fr_96px_44px_20px] items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2">
              <span className="flex min-w-0 items-center gap-1.5 text-sm">
                <span className="truncate">{STATUS_LABEL[c.from]}</span>
                <ArrowRight className="size-3.5 shrink-0 text-muted" aria-hidden />
                <span className="truncate text-ink-2">{STATUS_LABEL[c.to]}</span>
              </span>
              <div
                className="h-2 overflow-hidden rounded-full bg-accent-track/60"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={c.rate ?? undefined}
                aria-label={`${STATUS_LABEL[c.from]} to ${STATUS_LABEL[c.to]}: ${c.rate ?? "no data"}${c.rate != null ? "%" : ""}`}
              >
                <div className="h-full rounded-full bg-accent" style={{ width: `${c.rate ?? 0}%` }} />
              </div>
              <span className="text-right text-sm font-semibold tabular">{c.rate != null ? `${c.rate}%` : "–"}</span>
              <span title={changeText} className={tone}>
                <Icon className="size-4" aria-hidden />
                <span className="sr-only">{changeText}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
