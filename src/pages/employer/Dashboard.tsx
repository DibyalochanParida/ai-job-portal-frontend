import { useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock, Plus, TrendingUp, Users } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { compact, dateTime, STATUS_LABEL } from "../../lib/format";
import type { EmployerAnalytics } from "../../lib/types";
import { StatTile } from "../../components/dashboard/StatTile";
import { PipelineHealth } from "../../components/dashboard/PipelineHealth";
import { MatchQuality } from "../../components/dashboard/MatchQuality";
import { AssistantPanel } from "../../components/dashboard/AssistantPanel";
import { Button, Card, EmptyState, ErrorNote, PageHeader, Select, Spinner } from "../../components/ui";

const PERIODS = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
];

function bucketLabels(a: EmployerAnalytics): string[] {
  const from = new Date(a.period.from).getTime();
  const to = new Date(a.period.to).getTime();
  const step = (to - from) / 8;
  const fmt = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return Array.from({ length: 8 }, (_, i) => `${fmt(from + i * step)} – ${fmt(from + (i + 1) * step)}`);
}

function exportCsv(a: EmployerAnalytics) {
  const rows: (string | number | null)[][] = [
    ["Section", "Metric", "Value"],
    ["Period", "From", a.period.from],
    ["Period", "To", a.period.to],
    ["KPI", "Candidates in period", a.kpis.totalCandidates.value],
    ["KPI", "Avg interview length (min)", a.kpis.interviewTime.value],
    ["KPI", "Offer rate (%)", a.kpis.hireRate.value],
    ["KPI", "Active jobs", a.kpis.activeJobs.value],
    ...a.pipeline.stages.map((s) => ["Pipeline", STATUS_LABEL[s.key], s.count]),
    ...a.pipeline.conversions.map((c) => ["Conversion", `${STATUS_LABEL[c.from]} → ${STATUS_LABEL[c.to]} (%)`, c.rate]),
    ["Match quality", "Overall (%)", a.matchQuality.overall],
    ...a.matchQuality.jobs.map((j) => ["Match quality", j.title, j.score]),
    ...a.matchQuality.topMissingSkills.map((s) => ["Missing skill (% of applicants)", s.skill, s.percent]),
  ];
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `hiring-report-${a.period.days}d-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function DashboardPage() {
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const analytics = useQuery({
    queryKey: ["analytics", days],
    queryFn: () => api.analytics(days),
    placeholderData: keepPreviousData, // no skeleton flash when switching periods
  });
  const a = analytics.data;
  const periodLabel = `previous ${days} days`;
  const labels = a ? bucketLabels(a) : [];

  return (
    <div>
      <PageHeader
        eyebrow={`Welcome${user ? `, ${user.fullName.split(" ")[0]}` : ""}`}
        title="Dashboard"
        actions={
          <>
            <Select aria-label="Reporting period" value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-40">
              {PERIODS.map((p) => (
                <option key={p.days} value={p.days}>{p.label}</option>
              ))}
            </Select>
            <Button onClick={() => a && exportCsv(a)} disabled={!a}>Export Report</Button>
          </>
        }
      />

      {analytics.isLoading && <Spinner label="Loading analytics" />}
      <ErrorNote error={analytics.error} />

      {a && (
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              icon={<Users className="size-5" aria-hidden />}
              label="Total Candidates"
              sublabel={`Applied in last ${days} days`}
              value={compact(a.kpis.totalCandidates.value)}
              kpi={a.kpis.totalCandidates}
              periodLabel={periodLabel}
              bucketLabels={labels}
              formatPoint={(v) => `${v} applications`}
            />
            <StatTile
              icon={<Clock className="size-5" aria-hidden />}
              label="Interview Time"
              sublabel="Avg per completed interview"
              value={a.kpis.interviewTime.value ? `${a.kpis.interviewTime.value} mins` : "–"}
              kpi={a.kpis.interviewTime}
              direction="neutral"
              periodLabel={periodLabel}
              bucketLabels={labels}
              formatPoint={(v) => (v ? `${v} min avg` : "no interviews")}
            />
            <StatTile
              icon={<TrendingUp className="size-5" aria-hidden />}
              label="Hire Rate"
              sublabel="Interviewed → offer"
              value={`${a.kpis.hireRate.value}%`}
              kpi={a.kpis.hireRate}
              periodLabel={periodLabel}
              bucketLabels={labels}
              formatPoint={(v) => `${v}% offer rate`}
            />
            <StatTile
              icon={<CalendarDays className="size-5" aria-hidden />}
              label="Active Jobs"
              sublabel="Open positions"
              value={String(a.kpis.activeJobs.value)}
              kpi={a.kpis.activeJobs}
              periodLabel={`${days} days ago (new postings)`}
              bucketLabels={labels}
              formatPoint={(v) => `${v} jobs posted to date`}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-[1.15fr_1fr_0.95fr]">
            <PipelineHealth data={a.pipeline} periodLabel={`the last ${days} days`} />
            <MatchQuality data={a.matchQuality} periodLabel={periodLabel} />
            <div className="lg:col-span-2 xl:col-span-1">
              <AssistantPanel />
            </div>
          </div>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Upcoming interviews</h2>
              <Link to="/employer/interviews" className="text-sm text-accent hover:underline">View all</Link>
            </div>
            {a.upcomingInterviews.length === 0 ? (
              <EmptyState
                title="No interviews scheduled"
                action={<Link to="/employer/jobs/new" className="inline-flex items-center gap-1 text-sm font-medium text-accent"><Plus className="size-4" />Post a job</Link>}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wider text-muted">
                    <tr><th className="py-2 font-medium">Candidate</th><th className="font-medium">Role</th><th className="font-medium">When</th><th className="font-medium">Interviewer</th><th className="font-medium">Mode</th></tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {a.upcomingInterviews.map((i) => (
                      <tr key={i.id}>
                        <td className="py-2.5 font-medium">{i.candidateName}</td>
                        <td className="text-ink-2">{i.jobTitle}</td>
                        <td className="tabular text-ink-2">{dateTime(i.scheduledAt)} · {i.durationMinutes}m</td>
                        <td className="text-ink-2">{i.interviewer ?? "–"}</td>
                        <td className="capitalize text-ink-2">{i.mode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
