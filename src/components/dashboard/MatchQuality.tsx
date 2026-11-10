import { Link } from "react-router-dom";
import { AlertTriangle, Target } from "lucide-react";
import { titleCaseSkill } from "../../lib/format";
import type { EmployerAnalytics } from "../../lib/types";
import { Card, IconTile, ScoreMeter } from "../ui";
import { DeltaBadge } from "./StatTile";

export function MatchQuality({ data, periodLabel }: { data: EmployerAnalytics["matchQuality"]; periodLabel: string }) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconTile className="size-9"><Target className="size-4" aria-hidden /></IconTile>
          <div>
            <h2 className="font-semibold">AI Match Quality</h2>
            <p className="text-xs text-muted">Average resume-to-job match, open roles</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-5xl font-semibold leading-none tracking-tight text-accent-ink">{data.overall != null ? `${data.overall}%` : "–"}</p>
          <div className="mt-1.5">
            <DeltaBadge kpi={{ value: data.overall ?? 0, delta: data.delta, deltaUnit: "points", series: [] }} periodLabel={periodLabel} />
          </div>
        </div>
      </div>

      {data.jobs.length === 0 ? (
        <p className="mt-6 text-sm text-ink-2">No applications to open jobs yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {data.jobs.map((j) => (
            <li key={j.jobId} className="grid grid-cols-[minmax(0,140px)_1fr] items-center gap-3">
              <Link to={`/employer/candidates?jobId=${j.jobId}`} className="truncate text-sm hover:text-accent" title={`${j.title} · ${j.applicants} applicants`}>
                {j.title}
              </Link>
              <ScoreMeter score={j.score} label={j.title} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-6">
        <div className="rounded-xl border border-warning/40 bg-warning-soft p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-warning-text">
            <AlertTriangle className="size-4" aria-hidden /> Top Missing Skills
          </p>
          {data.topMissingSkills.length === 0 ? (
            <p className="mt-2 text-sm text-ink-2">No common gaps detected.</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Skills most often missing from applicants">
              {data.topMissingSkills.map((s) => (
                <li key={s.skill} className="rounded-full bg-surface/70 px-2.5 py-1 text-xs font-medium text-ink" title={`${s.count} applicants missing ${s.skill}`}>
                  {titleCaseSkill(s.skill)} <span className="text-ink-2 tabular">({s.percent}%)</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}
