import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileUp, Lightbulb, Sparkles } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { STATUS_LABEL } from "../../lib/format";
import { JobCard } from "../../components/JobCard";
import { Badge, Card, EmptyState, ErrorNote, PageHeader, ScoreMeter, Spinner } from "../../components/ui";

export function ForYouPage() {
  const { user } = useAuth();
  const recs = useQuery({ queryKey: ["recommendations"], queryFn: () => api.recommendations(10) });
  const apps = useQuery({ queryKey: ["applications"], queryFn: api.myApplications });

  const active = apps.data?.applications.filter((a) => !["rejected", "withdrawn", "selected"].includes(a.status)) ?? [];

  return (
    <div>
      <PageHeader eyebrow={`Welcome back, ${user?.fullName.split(" ")[0]}`} title="Recommended for you">
        Jobs ranked by semantic similarity to your resume and how many required skills you already have.
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {recs.isLoading && <Spinner label="Finding matches" />}
          <ErrorNote error={recs.error} />
          {recs.data && !recs.data.resumeId && (
            <EmptyState
              icon={<FileUp className="size-5" />}
              title="Upload your resume to get recommendations"
              action={<Link to="/resume" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">Upload resume</Link>}
            >
              AI reads your experience and skills, then matches you to open roles.
            </EmptyState>
          )}
          {recs.data?.recommendations.map((r) => (
            <JobCard
              key={r.job.id}
              job={r.job}
              aside={
                <div className="space-y-2">
                  <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted">
                    <Sparkles className="size-3.5 text-accent" aria-hidden /> AI match
                  </p>
                  <ScoreMeter score={r.matchScore} label="AI match" />
                  <ul className="space-y-1 text-xs text-ink-2">
                    {r.reasons.slice(0, 2).map((reason) => (
                      <li key={reason} className="flex gap-1.5">
                        <Lightbulb className="mt-0.5 size-3 shrink-0 text-muted" aria-hidden />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              }
            />
          ))}
          {recs.data?.resumeId && recs.data.recommendations.length === 0 && (
            <EmptyState title="You've applied to every matching job">Check back soon. New roles are added daily.</EmptyState>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Active applications</h2>
              <Link to="/applications" className="text-sm text-accent hover:underline">View all</Link>
            </div>
            {apps.isLoading ? (
              <Spinner />
            ) : active.length === 0 ? (
              <p className="text-sm text-ink-2">No active applications yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {active.slice(0, 6).map((a) => (
                  <li key={a.id} className="py-2.5">
                    <Link to={`/jobs/${a.jobId}`} className="block text-sm font-medium hover:text-accent">{a.jobTitle}</Link>
                    <div className="mt-1 flex items-center justify-between text-xs text-ink-2">
                      <span>{a.companyName}</span>
                      <Badge tone="accent">{STATUS_LABEL[a.status]}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="bg-accent-soft">
            <h2 className="font-semibold text-accent-ink">Improve your matches</h2>
            <p className="mt-1 text-sm text-ink-2">Get AI feedback on your resume and close skill gaps employers are looking for.</p>
            <Link to="/resume" className="mt-3 inline-block text-sm font-medium text-accent hover:underline">Get resume feedback</Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}
