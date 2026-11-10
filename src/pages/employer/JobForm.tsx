import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { ApiError, api } from "../../lib/api";
import { EMPLOYMENT_LABEL, LEVEL_LABEL, titleCaseSkill, WORK_MODE_LABEL } from "../../lib/format";
import type { JobInput } from "../../lib/types";
import { Button, Card, ErrorNote, Field, Input, PageHeader, Select, Spinner, Textarea } from "../../components/ui";

const EMPTY: JobInput = {
  title: "",
  description: "",
  requirements: "",
  skills: [],
  location: "",
  workMode: "hybrid",
  employmentType: "full_time",
  experienceLevel: "mid",
  salaryMin: null,
  salaryMax: null,
  currency: "USD",
  status: "open",
};

function SkillInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const parts = draft.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (parts.length) onChange([...new Set([...value, ...parts])].slice(0, 40));
    setDraft("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
  };
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
      {value.map((s) => (
        <span key={s} className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-ink">
          {titleCaseSkill(s)}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== s))} aria-label={`Remove ${s}`}>
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id="skills"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={add}
        placeholder={value.length ? "" : "react, typescript, graphql"}
        className="h-7 min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
      />
    </div>
  );
}

export function JobFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const existing = useQuery({ queryKey: ["job", id], queryFn: () => api.getJob(id!), enabled: editing });
  const [form, setForm] = useState<JobInput>(EMPTY);

  useEffect(() => {
    const j = existing.data?.job;
    if (j) {
      setForm({
        title: j.title, description: j.description, requirements: j.requirements, skills: j.skills, location: j.location,
        workMode: j.workMode, employmentType: j.employmentType, experienceLevel: j.experienceLevel,
        salaryMin: j.salaryMin, salaryMax: j.salaryMax, currency: j.currency, status: j.status,
      });
    }
  }, [existing.data]);

  const save = useMutation({
    mutationFn: () => (editing ? api.updateJob(id!, form) : api.createJob(form)),
    onSuccess: ({ job }) => {
      qc.invalidateQueries({ queryKey: ["employer-jobs"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
      qc.invalidateQueries({ queryKey: ["job", job.id] });
      navigate("/employer/jobs");
    },
  });
  const remove = useMutation({
    mutationFn: () => api.deleteJob(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employer-jobs"] });
      navigate("/employer/jobs");
    },
  });

  const errors = save.error instanceof ApiError && save.error.details ? Object.fromEntries(save.error.details.map((d) => [d.path, d.message])) : {};
  const set = <K extends keyof JobInput>(k: K, v: JobInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const num = (v: string) => (v === "" ? null : Math.max(0, Math.round(Number(v))));

  if (editing && existing.isLoading) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={editing ? "Edit posting" : "New posting"} title={editing ? form.title || "Edit job" : "Post a job"}>
        Skills and description are embedded for semantic matching, so be specific about the stack and responsibilities.
      </PageHeader>
      <Card>
        <form
          className="space-y-5"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <Field label="Job title" htmlFor="title" error={errors.title}>
            <Input id="title" required minLength={3} maxLength={140} value={form.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label="Description" htmlFor="description" error={errors.description} hint="What the person will do and why it matters">
            <Textarea id="description" required minLength={20} rows={6} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <Field label="Requirements" htmlFor="requirements" error={errors.requirements}>
            <Textarea id="requirements" rows={4} value={form.requirements} onChange={(e) => set("requirements", e.target.value)} />
          </Field>
          <Field label="Required skills" htmlFor="skills" hint="Press Enter or comma to add" error={errors.skills}>
            <SkillInput value={form.skills} onChange={(v) => set("skills", v)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Work mode" htmlFor="workMode">
              <Select id="workMode" value={form.workMode} onChange={(e) => set("workMode", e.target.value as JobInput["workMode"])}>
                {Object.entries(WORK_MODE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Employment type" htmlFor="employmentType">
              <Select id="employmentType" value={form.employmentType} onChange={(e) => set("employmentType", e.target.value as JobInput["employmentType"])}>
                {Object.entries(EMPLOYMENT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Experience level" htmlFor="experienceLevel">
              <Select id="experienceLevel" value={form.experienceLevel} onChange={(e) => set("experienceLevel", e.target.value as JobInput["experienceLevel"])}>
                {Object.entries(LEVEL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Field label="Location" htmlFor="location" error={errors.location}>
                <Input id="location" placeholder="City, Country or Remote" value={form.location} onChange={(e) => set("location", e.target.value)} />
              </Field>
            </div>
            <Field label="Salary min" htmlFor="salaryMin" error={errors.salaryMin}>
              <Input id="salaryMin" type="number" min={0} step={1000} value={form.salaryMin ?? ""} onChange={(e) => set("salaryMin", num(e.target.value))} />
            </Field>
            <Field label="Salary max" htmlFor="salaryMax" error={errors.salaryMax}>
              <Input id="salaryMax" type="number" min={0} step={1000} value={form.salaryMax ?? ""} onChange={(e) => set("salaryMax", num(e.target.value))} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Currency" htmlFor="currency">
              <Select id="currency" value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                {["USD", "EUR", "GBP", "INR", "CAD", "AUD"].map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Status" htmlFor="status">
              <Select id="status" value={form.status} onChange={(e) => set("status", e.target.value as JobInput["status"])}>
                <option value="open">Open</option>
                <option value="draft">Draft</option>
                <option value="closed">Closed</option>
              </Select>
            </Field>
          </div>
          {!Object.keys(errors).length && <ErrorNote error={save.error ?? remove.error} />}
          <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-5">
            {editing ? (
              <Button type="button" variant="danger" onClick={() => confirm("Delete this job and all its applications? This cannot be undone.") && remove.mutate()} loading={remove.isPending}>
                Delete job
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" loading={save.isPending}>{editing ? "Save changes" : "Publish job"}</Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
