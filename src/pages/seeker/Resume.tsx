import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, FileText, GraduationCap, Sparkles, Star, Trash2, UploadCloud, Wrench } from "lucide-react";
import { absoluteUrl, api } from "../../lib/api";
import { fileSize, timeAgo } from "../../lib/format";
import type { FeedbackRecord, Resume } from "../../lib/types";
import { AiSourceBadge, Badge, Button, Card, cx, EmptyState, ErrorNote, PageHeader, ScoreMeter, Select, SkillChips, Spinner } from "../../components/ui";

const ACCEPT = ".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

function UploadZone({ onUploaded }: { onUploaded: (r: Resume) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const qc = useQueryClient();
  const upload = useMutation({
    mutationFn: api.uploadResume,
    onSuccess: ({ resume }) => {
      qc.invalidateQueries({ queryKey: ["resumes"] });
      qc.invalidateQueries({ queryKey: ["recommendations"] });
      onUploaded(resume);
    },
  });
  const pick = (files: FileList | null) => {
    const f = files?.[0];
    if (f) upload.mutate(f);
  };
  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files);
        }}
        disabled={upload.isPending}
        className={cx(
          "flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition",
          dragging ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent/50",
        )}
      >
        {upload.isPending ? (
          <>
            <Sparkles className="size-6 animate-pulse text-accent" aria-hidden />
            <span className="font-medium">Reading your resume…</span>
            <span className="text-sm text-ink-2">Extracting skills and experience with AI</span>
          </>
        ) : (
          <>
            <UploadCloud className="size-6 text-accent" aria-hidden />
            <span className="font-medium">Drop your resume here or click to upload</span>
            <span className="text-sm text-ink-2">PDF, DOCX or TXT · up to 5 MB</span>
          </>
        )}
      </button>
      <input ref={input} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => pick(e.target.files)} aria-label="Upload resume" />
      <div className="mt-2"><ErrorNote error={upload.error} /></div>
    </div>
  );
}

function ParsedView({ resume }: { resume: Resume }) {
  const p = resume.parsed;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{p.fullName ?? "Your resume"}</h2>
          <p className="text-ink-2">
            {[p.headline, p.location, p.totalYearsExperience != null ? `${p.totalYearsExperience} yrs experience` : null].filter(Boolean).join(" · ")}
          </p>
        </div>
        <AiSourceBadge source={resume.parseSource} />
      </div>
      {p.summary && <p className="leading-relaxed text-ink-2">{p.summary}</p>}
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Wrench className="size-4 text-muted" /> Skills ({resume.skills.length})</h3>
        <SkillChips skills={resume.skills} tone="accent" />
      </section>
      {p.experience.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><FileText className="size-4 text-muted" /> Experience</h3>
          <ol className="space-y-3 border-l border-line pl-4">
            {p.experience.map((e, i) => (
              <li key={i}>
                <p className="font-medium">{e.title} <span className="font-normal text-ink-2">at {e.company}</span></p>
                <p className="text-xs text-muted">{[e.startDate, e.endDate ?? "present"].filter(Boolean).join(" – ")}</p>
                {e.highlights.length > 0 && (
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-ink-2">
                    {e.highlights.map((h, k) => <li key={k}>{h}</li>)}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
      {p.education.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><GraduationCap className="size-4 text-muted" /> Education</h3>
          <ul className="space-y-1 text-sm text-ink-2">
            {p.education.map((e, i) => (
              <li key={i}>{[e.degree, e.field && `in ${e.field}`].filter(Boolean).join(" ")}{e.degree ? ", " : ""}{e.institution}{e.graduationYear ? ` (${e.graduationYear})` : ""}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

const PRIORITY_TONE = { high: "critical", medium: "warning", low: "neutral" } as const;

function FeedbackView({ record }: { record: FeedbackRecord }) {
  const f = record.feedback;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{record.jobTitle ? `Feedback for ${record.jobTitle}` : "General feedback"} · {timeAgo(record.createdAt)}</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight">{f.overallScore}<span className="text-xl text-muted">/100</span></p>
        </div>
        <AiSourceBadge source={record.source} />
      </div>
      <ScoreMeter score={f.overallScore} label="Resume score" />
      <p className="text-ink-2">{f.summary}</p>

      {f.jobFit && (
        <div className="rounded-xl bg-surface-2 p-4">
          <p className="mb-2 text-sm font-semibold">Fit for {record.jobTitle}</p>
          <ScoreMeter score={f.jobFit.score} label="Job fit" />
          <p className="mt-2 text-sm text-ink-2">{f.jobFit.verdict}</p>
        </div>
      )}

      {f.strengths.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold">Strengths</h3>
          <ul className="space-y-1.5">
            {f.strengths.map((s) => (
              <li key={s} className="flex gap-2 text-sm text-ink-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-good-text" aria-hidden />{s}</li>
            ))}
          </ul>
        </section>
      )}
      {f.improvements.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold">Improvements</h3>
          <ul className="space-y-2">
            {f.improvements.map((imp) => (
              <li key={imp.area} className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{imp.area}</p>
                  <Badge tone={PRIORITY_TONE[imp.priority]}>{imp.priority} priority</Badge>
                </div>
                <p className="mt-1 text-sm text-ink-2">{imp.suggestion}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {f.missingKeywords.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold">Keywords to add</h3>
          <SkillChips skills={f.missingKeywords} tone="warning" />
        </section>
      )}
      {f.atsTips.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold">ATS tips</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">{f.atsTips.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
      )}
    </div>
  );
}

export function ResumePage() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["resumes"], queryFn: api.listResumes });
  const [selected, setSelected] = useState<string | null>(null);
  const [targetJob, setTargetJob] = useState("");
  const resumes = list.data?.resumes ?? [];
  const currentId = selected ?? resumes.find((r) => r.isPrimary)?.id ?? resumes[0]?.id ?? null;

  const detail = useQuery({ queryKey: ["resume", currentId], queryFn: () => api.getResume(currentId!), enabled: Boolean(currentId) });
  const recs = useQuery({ queryKey: ["recommendations"], queryFn: () => api.recommendations(10) });
  const apps = useQuery({ queryKey: ["applications"], queryFn: api.myApplications });

  const jobOptions = [
    ...(apps.data?.applications.map((a) => ({ id: a.jobId, title: `${a.jobTitle} · ${a.companyName} (applied)` })) ?? []),
    ...(recs.data?.recommendations.map((r) => ({ id: r.job.id, title: `${r.job.title} · ${r.job.companyName}` })) ?? []),
  ];

  const feedback = useMutation({
    mutationFn: () => api.resumeFeedback(currentId!, targetJob || null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resume", currentId] });
      qc.invalidateQueries({ queryKey: ["resumes"] });
    },
  });
  const makePrimary = useMutation({
    mutationFn: api.setPrimaryResume,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resumes"] });
      qc.invalidateQueries({ queryKey: ["recommendations"] });
    },
  });
  const remove = useMutation({
    mutationFn: api.deleteResume,
    onSuccess: () => {
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["resumes"] });
      qc.invalidateQueries({ queryKey: ["recommendations"] });
    },
  });

  // Clear the last on-screen feedback result when switching to another resume.
  const resetFeedback = feedback.reset;
  useEffect(() => resetFeedback(), [currentId, resetFeedback]);

  const download = async (id: string) => {
    const { url } = await api.resumeDownload(id);
    window.open(absoluteUrl(url), "_blank", "noopener");
  };

  const latestFeedback = feedback.data?.feedback ?? detail.data?.feedback[0];

  return (
    <div>
      <PageHeader eyebrow="Resume" title="Your resume & AI feedback">
        Upload your resume. AI extracts your skills and experience, scores it, and suggests concrete improvements.
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <UploadZone onUploaded={(r) => setSelected(r.id)} />
          {list.isLoading && <Spinner />}
          <ul className="space-y-2">
            {resumes.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setSelected(r.id)}
                  className={cx(
                    "w-full rounded-xl border p-3 text-left transition",
                    r.id === currentId ? "border-accent bg-accent-soft" : "border-line bg-surface hover:bg-surface-2",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{r.fileName}</p>
                    {r.isPrimary && <Badge tone="accent"><Star className="size-3" aria-hidden />Primary</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {fileSize(r.sizeBytes)} · {timeAgo(r.createdAt)}
                    {r.latestFeedback ? ` · score ${r.latestFeedback.score}` : ""}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          {resumes.length === 0 && !list.isLoading ? (
            <EmptyState icon={<FileText className="size-5" />} title="No resume yet">Upload one to unlock AI feedback and job recommendations.</EmptyState>
          ) : detail.isLoading || !detail.data ? (
            <Spinner />
          ) : (
            <>
              <Card>
                <ParsedView resume={detail.data.resume} />
                <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
                  <Button variant="secondary" size="sm" onClick={() => download(detail.data.resume.id)}><Download className="size-4" /> Download</Button>
                  {!detail.data.resume.isPrimary && (
                    <Button variant="secondary" size="sm" onClick={() => makePrimary.mutate(detail.data.resume.id)} loading={makePrimary.isPending}>
                      <Star className="size-4" /> Make primary
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => confirm("Delete this resume? Applications keep their match scores.") && remove.mutate(detail.data.resume.id)}
                    loading={remove.isPending}
                  >
                    <Trash2 className="size-4" /> Delete
                  </Button>
                </div>
              </Card>

              <Card>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label htmlFor="target-job" className="mb-1.5 block text-sm font-medium">Tailor feedback to a job (optional)</label>
                    <Select id="target-job" value={targetJob} onChange={(e) => setTargetJob(e.target.value)}>
                      <option value="">General feedback</option>
                      {jobOptions.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
                    </Select>
                  </div>
                  <Button onClick={() => feedback.mutate()} loading={feedback.isPending}>
                    <Sparkles className="size-4" /> Get AI feedback
                  </Button>
                </div>
                <div className="mt-3"><ErrorNote error={feedback.error} /></div>
                {latestFeedback && (
                  <div className="mt-6 border-t border-line pt-6">
                    <FeedbackView record={latestFeedback} />
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
