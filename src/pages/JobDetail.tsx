import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Banknote, Briefcase, CheckCircle2, MapPin, Sparkles, Target } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { EMPLOYMENT_LABEL, LEVEL_LABEL, salaryRange, STATUS_LABEL, timeAgo, WORK_MODE_LABEL } from "../lib/format";
import { AiSourceBadge, Badge, Button, Card, EmptyState, ErrorNote, Field, Modal, ScoreMeter, Select, SkillChips, Spinner, Textarea } from "../components/ui";

export function JobDetailPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const job = useQuery({ queryKey: ["job", id, user?.id], queryFn: () => api.getJob(id) });
  const resumes = useQuery({ queryKey: ["resumes"], queryFn: api.listResumes, enabled: user?.role === "seeker" });

  const [applyOpen, setApplyOpen] = useState(false);
  const [resumeId, setResumeId] = useState<string>("");
  const [coverLetter, setCoverLetter] = useState("");

  const apply = useMutation({
    mutationFn: () => api.apply(id, { resumeId: resumeId || null, coverLetter: coverLetter || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job", id] });
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["recommendations"] });
    },
  });
  const fit = useMutation({
    mutationFn: () => {
      const primary = resumes.data?.resumes.find((r) => r.isPrimary) ?? resumes.data?.resumes[0];
      if (!primary) throw new Error("Upload a resume first");
      return api.resumeFeedback(primary.id, id);
    },
  });

  if (job.isLoading) return <Spinner />;
  if (job.error || !job.data) return <EmptyState title="Job not found"><Link to="/jobs" className="text-accent">Back to jobs</Link></EmptyState>;

  const j = job.data.job;
  const existing = job.data.application;
  const salary = salaryRange(j.salaryMin, j.salaryMax, j.currency);
  const hasResume = (resumes.data?.resumes.length ?? 0) > 0;
  const fitResult = fit.data?.feedback.feedback.jobFit;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
          <ArrowLeft className="size-4" /> All jobs
        </Link>
        <div>
          <p className="text-ink-2">{j.companyName}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{j.title}</h1>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-2">
            <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-muted" />{j.location || "Anywhere"} · {WORK_MODE_LABEL[j.workMode]}</span>
            <span className="inline-flex items-center gap-1.5"><Briefcase className="size-4 text-muted" />{EMPLOYMENT_LABEL[j.employmentType]} · {LEVEL_LABEL[j.experienceLevel]}</span>
            {salary && <span className="inline-flex items-center gap-1.5"><Banknote className="size-4 text-muted" />{salary}</span>}
            <span>Posted {timeAgo(j.createdAt)}</span>
          </div>
        </div>
        <Card>
          <h2 className="mb-2 font-semibold">About the role</h2>
          <p className="whitespace-pre-line leading-relaxed text-ink-2">{j.description}</p>
          {j.requirements && (
            <>
              <h2 className="mb-2 mt-6 font-semibold">Requirements</h2>
              <p className="whitespace-pre-line leading-relaxed text-ink-2">{j.requirements}</p>
            </>
          )}
          <h2 className="mb-2 mt-6 font-semibold">Skills</h2>
          <SkillChips skills={j.skills} tone="accent" />
        </Card>
      </div>

      <aside className="space-y-4 lg:pt-11">
        <Card>
          {j.status !== "open" ? (
            <p className="text-sm text-ink-2">This job is no longer accepting applications.</p>
          ) : !user ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-2">Sign in as a job seeker to apply and see how well you match.</p>
              <Link to="/login" state={{ from: `/jobs/${j.id}` }} className="flex h-10 items-center justify-center rounded-lg bg-accent text-sm font-medium text-white hover:bg-accent-hover">
                Sign in to apply
              </Link>
            </div>
          ) : user.role !== "seeker" ? (
            <p className="text-sm text-ink-2">You're signed in as an employer. Switch to a job seeker account to apply.</p>
          ) : existing ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-medium text-good-text">
                <CheckCircle2 className="size-5" /> Applied
              </div>
              <p className="text-sm text-ink-2">Status: <Badge tone="accent">{STATUS_LABEL[existing.status]}</Badge></p>
              <ScoreMeter score={existing.matchScore} label="Your match" />
              <Link to="/applications" className="text-sm text-accent hover:underline">Track your applications</Link>
            </div>
          ) : (
            <div className="space-y-3">
              <Button className="w-full" onClick={() => setApplyOpen(true)} disabled={!hasResume}>
                Apply now
              </Button>
              {!hasResume && (
                <p className="text-sm text-ink-2">
                  <Link to="/resume" className="text-accent hover:underline">Upload a resume</Link> to apply.
                </p>
              )}
            </div>
          )}
        </Card>

        {user?.role === "seeker" && hasResume && (
          <Card>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-semibold"><Target className="size-4 text-accent" /> Check my fit</h2>
              <AiSourceBadge source={fit.data?.feedback.source} />
            </div>
            {!fitResult ? (
              <>
                <p className="mb-3 text-sm text-ink-2">AI compares your primary resume with this job and tells you what to highlight.</p>
                <Button variant="secondary" className="w-full" onClick={() => fit.mutate()} loading={fit.isPending}>
                  <Sparkles className="size-4" /> Analyse fit
                </Button>
                <div className="mt-2"><ErrorNote error={fit.error} /></div>
              </>
            ) : (
              <div className="space-y-3 text-sm">
                <ScoreMeter score={fitResult.score} label="Fit" />
                <p className="text-ink-2">{fitResult.verdict}</p>
                {fitResult.matchedSkills.length > 0 && (
                  <div><p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">You have</p><SkillChips skills={fitResult.matchedSkills} tone="good" /></div>
                )}
                {fitResult.missingSkills.length > 0 && (
                  <div><p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Gaps</p><SkillChips skills={fitResult.missingSkills} tone="warning" /></div>
                )}
              </div>
            )}
          </Card>
        )}
      </aside>

      <Modal open={applyOpen} onClose={() => { setApplyOpen(false); apply.reset(); }} title={`Apply to ${j.title}`}>
        {apply.data ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-medium text-good-text"><CheckCircle2 className="size-5" /> Application sent</div>
            <ScoreMeter score={apply.data.application.matchScore} label="AI match score" />
            {apply.data.application.missingSkills.length > 0 && (
              <div className="text-sm">
                <p className="mb-1 text-ink-2">Consider highlighting these in your follow-up:</p>
                <SkillChips skills={apply.data.application.missingSkills} tone="warning" />
              </div>
            )}
            <Button className="w-full" onClick={() => setApplyOpen(false)}>Done</Button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              apply.mutate();
            }}
          >
            <Field label="Resume" htmlFor="resume-select">
              <Select id="resume-select" value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
                <option value="">Primary resume</option>
                {resumes.data?.resumes.map((r) => (
                  <option key={r.id} value={r.id}>{r.fileName}{r.isPrimary ? " (primary)" : ""}</option>
                ))}
              </Select>
            </Field>
            <Field label="Cover letter" htmlFor="cover" hint="Optional">
              <Textarea id="cover" rows={6} maxLength={5000} value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} />
            </Field>
            <ErrorNote error={apply.error} />
            <Button type="submit" className="w-full" loading={apply.isPending}>Submit application</Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
