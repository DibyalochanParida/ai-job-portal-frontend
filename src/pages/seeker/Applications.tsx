import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Inbox } from "lucide-react";
import { api } from "../../lib/api";
import { dateTime, PIPELINE, STATUS_LABEL, timeAgo } from "../../lib/format";
import type { Application } from "../../lib/types";
import { Badge, Button, Card, cx, EmptyState, ErrorNote, PageHeader, ScoreMeter, Spinner } from "../../components/ui";

function Progress({ status }: { status: Application["status"] }) {
  const closed = status === "rejected" || status === "withdrawn";
  const idx = PIPELINE.indexOf(status);
  return (
    <ol className="flex items-center gap-1" aria-label={`Stage: ${STATUS_LABEL[status]}`}>
      {PIPELINE.map((s, i) => (
        <li key={s} className="flex-1" title={STATUS_LABEL[s]}>
          <div className={cx("h-1.5 rounded-full", closed ? "bg-line" : i <= idx ? "bg-accent" : "bg-accent-track")} />
        </li>
      ))}
    </ol>
  );
}

export function ApplicationsPage() {
  const qc = useQueryClient();
  const apps = useQuery({ queryKey: ["applications"], queryFn: api.myApplications });
  const withdraw = useMutation({
    mutationFn: api.withdraw,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["applications"] }),
  });

  return (
    <div>
      <PageHeader eyebrow="Track progress" title="My applications" />
      {apps.isLoading && <Spinner />}
      <ErrorNote error={apps.error ?? withdraw.error} />
      {apps.data?.applications.length === 0 && (
        <EmptyState icon={<Inbox className="size-5" />} title="No applications yet" action={<Link to="/for-you" className="text-sm font-medium text-accent hover:underline">See recommended jobs</Link>} />
      )}
      <div className="space-y-3">
        {apps.data?.applications.map((a) => {
          const upcoming = a.interviews?.find((i) => i.status === "scheduled" && new Date(i.scheduledAt) > new Date());
          const closed = ["rejected", "withdrawn", "selected"].includes(a.status);
          return (
            <Card key={a.id}>
              <div className="grid gap-4 md:grid-cols-[1fr_200px_auto] md:items-center">
                <div className="min-w-0">
                  <Link to={`/jobs/${a.jobId}`} className="font-semibold hover:text-accent">{a.jobTitle}</Link>
                  <p className="text-sm text-ink-2">{a.companyName} · applied {timeAgo(a.createdAt)}</p>
                  <div className="mt-3 max-w-md space-y-1.5">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge tone={a.status === "selected" ? "good" : a.status === "rejected" || a.status === "withdrawn" ? "neutral" : "accent"}>
                        {STATUS_LABEL[a.status]}
                      </Badge>
                      {upcoming && (
                        <span className="inline-flex items-center gap-1 text-ink-2">
                          <Calendar className="size-3.5" aria-hidden /> Interview {dateTime(upcoming.scheduledAt)}
                        </span>
                      )}
                    </div>
                    <Progress status={a.status} />
                  </div>
                </div>
                <ScoreMeter score={a.matchScore} label="AI match" />
                <div className="md:text-right">
                  {!closed && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => confirm(`Withdraw your application to ${a.jobTitle}?`) && withdraw.mutate(a.id)}
                      loading={withdraw.isPending && withdraw.variables === a.id}
                    >
                      Withdraw
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
