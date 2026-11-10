import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Download, Mail, Search, Users } from "lucide-react";
import { absoluteUrl, api } from "../../lib/api";
import { dateTime, STATUS_LABEL, timeAgo } from "../../lib/format";
import type { ApplicationStatus } from "../../lib/types";
import { Badge, Button, Card, EmptyState, ErrorNote, Field, Input, Modal, PageHeader, ScoreMeter, Select, SkillChips, Spinner } from "../../components/ui";

const EMPLOYER_STATUSES: ApplicationStatus[] = ["applied", "shortlisted", "scheduled", "interviewed", "recommended", "selected", "rejected"];

function defaultInterviewTime() {
  const d = new Date(Date.now() + 2 * 86_400_000);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function CandidateDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const detail = useQuery({ queryKey: ["application", id], queryFn: () => api.application(id) });
  const [schedule, setSchedule] = useState({ at: defaultInterviewTime(), duration: 45, mode: "video", interviewer: "" });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["application", id] });
    qc.invalidateQueries({ queryKey: ["candidates"] });
    qc.invalidateQueries({ queryKey: ["analytics"] });
    qc.invalidateQueries({ queryKey: ["interviews"] });
  };
  const status = useMutation({ mutationFn: (s: ApplicationStatus) => api.setApplicationStatus(id, s), onSuccess: invalidate });
  const book = useMutation({
    mutationFn: () =>
      api.scheduleInterview(id, {
        scheduledAt: new Date(schedule.at).toISOString(),
        durationMinutes: schedule.duration,
        mode: schedule.mode,
        interviewer: schedule.interviewer || null,
      }),
    onSuccess: invalidate,
  });
  const openResume = async () => {
    const { url } = await api.applicantResume(id);
    window.open(absoluteUrl(url), "_blank", "noopener");
  };

  if (detail.isLoading || !detail.data) return <Spinner />;
  const { application: a, events, interviews } = detail.data;
  const closed = a.status === "withdrawn";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">{a.candidateName}</p>
          <p className="text-sm text-ink-2">{[a.candidateHeadline, a.candidateYears != null ? `${a.candidateYears} yrs` : null].filter(Boolean).join(" · ")}</p>
          <p className="mt-1 text-sm text-ink-2">Applied to <span className="font-medium text-ink">{a.jobTitle}</span> {timeAgo(a.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          <a href={`mailto:${a.candidateEmail}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-sm hover:bg-surface-2">
            <Mail className="size-4" /> Email
          </a>
          {a.resumeId && (
            <Button variant="secondary" size="sm" onClick={openResume}><Download className="size-4" /> Resume</Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-surface-2 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">AI match</p>
          <ScoreMeter score={a.matchScore} label="AI match" />
          {a.matchedSkills.length > 0 && <div className="mt-3"><SkillChips skills={a.matchedSkills} tone="good" /></div>}
          {a.missingSkills.length > 0 && (
            <div className="mt-2">
              <p className="mb-1 text-xs text-muted">Missing</p>
              <SkillChips skills={a.missingSkills} tone="warning" />
            </div>
          )}
        </div>
        <div className="rounded-xl bg-surface-2 p-4">
          <label htmlFor="stage" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">Stage</label>
          <Select id="stage" value={a.status} disabled={closed || status.isPending} onChange={(e) => status.mutate(e.target.value as ApplicationStatus)}>
            {closed && <option value="withdrawn">Withdrawn</option>}
            {EMPLOYER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </Select>
          <ol className="mt-3 space-y-1 text-xs text-ink-2">
            {events.map((e, i) => (
              <li key={i}>
                <span className="font-medium text-ink">{STATUS_LABEL[e.toStatus as ApplicationStatus] ?? e.toStatus}</span> · {timeAgo(e.createdAt)}
                {e.note ? ` · ${e.note}` : ""}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {a.coverLetter && (
        <div>
          <p className="mb-1 text-sm font-semibold">Cover letter</p>
          <p className="whitespace-pre-line text-sm text-ink-2">{a.coverLetter}</p>
        </div>
      )}
      {a.resumeParsed?.summary && (
        <div>
          <p className="mb-1 text-sm font-semibold">Resume summary</p>
          <p className="text-sm text-ink-2">{a.resumeParsed.summary}</p>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold">Interviews</p>
        {interviews.length === 0 ? (
          <p className="text-sm text-ink-2">None yet.</p>
        ) : (
          <ul className="mb-3 space-y-1 text-sm">
            {interviews.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-2">
                <Badge tone={i.status === "completed" ? "good" : i.status === "cancelled" ? "neutral" : "accent"}>{i.status}</Badge>
                {dateTime(i.scheduledAt)} · {i.durationMinutes}m · {i.mode}
                {i.interviewer ? ` · ${i.interviewer}` : ""}
                {i.rating ? ` · ${i.rating}/5` : ""}
              </li>
            ))}
          </ul>
        )}
        {!closed && a.status !== "rejected" && (
          <form
            className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              book.mutate();
            }}
          >
            <Field label="Date & time" htmlFor="iv-at">
              <Input id="iv-at" type="datetime-local" required value={schedule.at} onChange={(e) => setSchedule((s) => ({ ...s, at: e.target.value }))} />
            </Field>
            <Field label="Interviewer" htmlFor="iv-who">
              <Input id="iv-who" placeholder="Optional" value={schedule.interviewer} onChange={(e) => setSchedule((s) => ({ ...s, interviewer: e.target.value }))} />
            </Field>
            <Field label="Duration" htmlFor="iv-dur">
              <Select id="iv-dur" value={schedule.duration} onChange={(e) => setSchedule((s) => ({ ...s, duration: Number(e.target.value) }))}>
                {[30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} minutes</option>)}
              </Select>
            </Field>
            <Field label="Mode" htmlFor="iv-mode">
              <Select id="iv-mode" value={schedule.mode} onChange={(e) => setSchedule((s) => ({ ...s, mode: e.target.value }))}>
                <option value="video">Video</option>
                <option value="phone">Phone</option>
                <option value="onsite">On-site</option>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <ErrorNote error={book.error} />
              <Button type="submit" loading={book.isPending} className="mt-1">
                <CalendarPlus className="size-4" /> Schedule interview
              </Button>
            </div>
          </form>
        )}
      </div>
      <ErrorNote error={status.error} />
      <div className="text-right">
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

export function CandidatesPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [openId, setOpenId] = useState<string | null>(null);
  const filters = { jobId: params.get("jobId") ?? "", status: params.get("status") ?? "", q: params.get("q") ?? "", sort: params.get("sort") ?? "match" };
  const jobs = useQuery({ queryKey: ["employer-jobs"], queryFn: api.employerJobs });
  const list = useQuery({ queryKey: ["candidates", filters], queryFn: () => api.candidates({ ...filters, limit: 100 }), placeholderData: keepPreviousData });

  const setFilter = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next);
  };

  return (
    <div>
      <PageHeader eyebrow="Talent pipeline" title="Candidates">
        Ranked by AI match score: a blend of required-skill coverage and semantic similarity between resume and job.
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setFilter("q", q.trim());
          }}
          className="relative"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input aria-label="Search candidates" placeholder="Search name or title" value={q} onChange={(e) => setQ(e.target.value)} className="w-64 pl-9" />
        </form>
        <Select aria-label="Job" value={filters.jobId} onChange={(e) => setFilter("jobId", e.target.value)} className="w-56">
          <option value="">All jobs</option>
          {jobs.data?.jobs.map((j) => <option key={j.jobId} value={j.jobId}>{j.title}</option>)}
        </Select>
        <Select aria-label="Stage" value={filters.status} onChange={(e) => setFilter("status", e.target.value)} className="w-44">
          <option value="">All stages</option>
          {[...EMPLOYER_STATUSES, "withdrawn" as const].map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </Select>
        <Select aria-label="Sort" value={filters.sort} onChange={(e) => setFilter("sort", e.target.value)} className="w-40">
          <option value="match">Best match</option>
          <option value="recent">Most recent</option>
        </Select>
      </div>

      {list.isLoading && <Spinner />}
      <ErrorNote error={list.error} />
      {list.data?.candidates.length === 0 && <EmptyState icon={<Users className="size-5" />} title="No candidates match these filters" />}
      {list.data && list.data.candidates.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Candidate</th>
                <th className="font-medium">Job</th>
                <th className="w-44 font-medium">AI match</th>
                <th className="font-medium">Skill gaps</th>
                <th className="font-medium">Stage</th>
                <th className="px-5 font-medium">Applied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.data.candidates.map((c) => (
                <tr key={c.id} className="cursor-pointer hover:bg-surface-2/60" onClick={() => setOpenId(c.id)}>
                  <td className="px-5 py-3">
                    <button className="text-left font-medium hover:text-accent" onClick={() => setOpenId(c.id)}>{c.candidateName}</button>
                    <p className="text-xs text-muted">{c.candidateHeadline ?? "–"}</p>
                  </td>
                  <td className="text-ink-2">{c.jobTitle}</td>
                  <td className="pr-4"><ScoreMeter score={c.matchScore} label={`${c.candidateName} match`} /></td>
                  <td>{c.missingSkills.length ? <SkillChips skills={c.missingSkills} tone="warning" max={2} /> : <span className="text-xs text-muted">None</span>}</td>
                  <td><Badge tone={c.status === "selected" ? "good" : c.status === "rejected" || c.status === "withdrawn" ? "neutral" : "accent"}>{STATUS_LABEL[c.status]}</Badge></td>
                  <td className="px-5 text-ink-2">{timeAgo(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={Boolean(openId)} onClose={() => setOpenId(null)} title="Candidate" wide>
        {openId && <CandidateDetail id={openId} onClose={() => setOpenId(null)} />}
      </Modal>
    </div>
  );
}
