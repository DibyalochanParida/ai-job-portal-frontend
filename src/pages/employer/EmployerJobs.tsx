import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Pencil, Plus, Users } from "lucide-react";
import { api } from "../../lib/api";
import { timeAgo } from "../../lib/format";
import type { JobStatus } from "../../lib/types";
import { Badge, Card, EmptyState, ErrorNote, PageHeader, ScoreMeter, Select, Spinner } from "../../components/ui";

const STATUS_TONE: Record<JobStatus, "good" | "neutral" | "warning"> = { open: "good", closed: "neutral", draft: "warning" };

export function EmployerJobsPage() {
  const qc = useQueryClient();
  const jobs = useQuery({ queryKey: ["employer-jobs"], queryFn: api.employerJobs });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: JobStatus }) => api.setJobStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employer-jobs"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Manage postings"
        title="Jobs"
        actions={
          <Link to="/employer/jobs/new" className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover">
            <Plus className="size-4" /> Post a job
          </Link>
        }
      />
      {jobs.isLoading && <Spinner />}
      <ErrorNote error={jobs.error ?? setStatus.error} />
      {jobs.data?.jobs.length === 0 && (
        <EmptyState icon={<Briefcase className="size-5" />} title="No jobs yet">Post your first job to start receiving AI-ranked applicants.</EmptyState>
      )}
      {jobs.data && jobs.data.jobs.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="font-medium">Status</th>
                <th className="font-medium">Applicants</th>
                <th className="w-48 font-medium">Avg AI match</th>
                <th className="px-5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {jobs.data.jobs.map((j) => (
                <tr key={j.jobId} className="hover:bg-surface-2/60">
                  <td className="px-5 py-3">
                    <Link to={`/jobs/${j.jobId}`} className="font-medium hover:text-accent">{j.title}</Link>
                    <p className="text-xs text-muted">Posted {timeAgo(j.createdAt)}</p>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Badge tone={STATUS_TONE[j.status]}>{j.status}</Badge>
                      <Select
                        aria-label={`Change status of ${j.title}`}
                        value={j.status}
                        onChange={(e) => setStatus.mutate({ id: j.jobId, status: e.target.value as JobStatus })}
                        className="h-8 w-28 text-xs"
                      >
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                        <option value="draft">Draft</option>
                      </Select>
                    </div>
                  </td>
                  <td className="tabular">{j.applicants}</td>
                  <td className="pr-4"><ScoreMeter score={j.avgMatch} label={`${j.title} average match`} /></td>
                  <td className="px-5 text-right">
                    <div className="inline-flex gap-1">
                      <Link to={`/employer/candidates?jobId=${j.jobId}`} className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-ink-2 hover:bg-surface-2 hover:text-ink">
                        <Users className="size-4" /> Candidates
                      </Link>
                      <Link to={`/employer/jobs/${j.jobId}/edit`} className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-ink-2 hover:bg-surface-2 hover:text-ink">
                        <Pencil className="size-4" /> Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
