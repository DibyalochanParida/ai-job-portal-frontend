import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, SearchX, Sparkles, X } from "lucide-react";
import { api } from "../lib/api";
import { EMPLOYMENT_LABEL, LEVEL_LABEL, money, titleCaseSkill, WORK_MODE_LABEL } from "../lib/format";
import type { EmploymentType, ExperienceLevel, SearchIntent, WorkMode } from "../lib/types";
import { JobCard } from "../components/JobCard";
import { AiSourceBadge, Badge, Button, EmptyState, ErrorNote, PageHeader, Select, Spinner } from "../components/ui";

const EXAMPLES = [
  "Remote senior React roles paying over $150k",
  "Machine learning jobs in Boston",
  "Entry level QA automation, remote",
  "Contract full stack work with Next.js",
];

function IntentChips({ intent }: { intent: SearchIntent }) {
  const chips: string[] = [];
  if (intent.semanticQuery) chips.push(`“${intent.semanticQuery}”`);
  if (intent.workMode) chips.push(WORK_MODE_LABEL[intent.workMode]);
  if (intent.location) chips.push(intent.location);
  if (intent.experienceLevel) chips.push(LEVEL_LABEL[intent.experienceLevel]);
  if (intent.employmentType) chips.push(EMPLOYMENT_LABEL[intent.employmentType]);
  if (intent.salaryMin) chips.push(`≥ ${money(intent.salaryMin)}`);
  for (const s of intent.skills) chips.push(titleCaseSkill(s));
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <Badge key={c} tone="accent">
          {c}
        </Badge>
      ))}
    </div>
  );
}

export function JobsPage() {
  const [params, setParams] = useSearchParams();
  const nl = params.get("ask") ?? "";
  const [draft, setDraft] = useState(nl);
  const filters = {
    workMode: (params.get("workMode") ?? "") as WorkMode | "",
    employmentType: (params.get("employmentType") ?? "") as EmploymentType | "",
    experienceLevel: (params.get("experienceLevel") ?? "") as ExperienceLevel | "",
  };

  const nlQuery = useQuery({
    queryKey: ["jobs", "nl", nl],
    queryFn: () => api.searchJobs(nl),
    enabled: nl.length > 1,
  });
  const listQuery = useQuery({
    queryKey: ["jobs", "list", filters],
    queryFn: () => api.listJobs({ ...filters, limit: 30 }),
    enabled: nl.length <= 1,
  });
  const active = nl.length > 1 ? nlQuery : listQuery;

  function submit(e?: FormEvent, value = draft) {
    e?.preventDefault();
    const next = new URLSearchParams();
    if (value.trim()) next.set("ask", value.trim());
    setParams(next);
  }
  function setFilter(key: keyof typeof filters, value: string) {
    const next = new URLSearchParams(params);
    next.delete("ask");
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
    setDraft("");
  }

  return (
    <div>
      <PageHeader eyebrow="Find your next role" title="Jobs">
        Describe what you want in plain English. AI turns it into filters and ranks jobs by meaning, not just keywords.
      </PageHeader>

      <form onSubmit={submit} className="rounded-2xl border border-line bg-surface p-2 shadow-sm focus-within:border-accent">
        <div className="flex items-center gap-2">
          <Sparkles className="ml-2 size-5 shrink-0 text-accent" aria-hidden />
          <label htmlFor="nl-search" className="sr-only">
            Search jobs in natural language
          </label>
          <input
            id="nl-search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. remote senior React roles paying over $150k"
            className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
            maxLength={500}
          />
          {nl && (
            <button
              type="button"
              onClick={() => {
                setDraft("");
                setParams(new URLSearchParams());
              }}
              className="rounded-lg p-2 text-muted hover:text-ink"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
          <Button type="submit" loading={nlQuery.isFetching}>
            <Search className="size-4" aria-hidden /> Search
          </Button>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              setDraft(ex);
              submit(undefined, ex);
            }}
            className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-2 hover:border-accent/40 hover:text-ink"
          >
            {ex}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {nl && nlQuery.data?.interpretation ? (
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
            <span>Understood as</span>
            <IntentChips intent={nlQuery.data.interpretation} />
            <AiSourceBadge source={nlQuery.data.source} />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filters">
            <Select aria-label="Work mode" value={filters.workMode} onChange={(e) => setFilter("workMode", e.target.value)} className="w-auto">
              <option value="">Any work mode</option>
              {Object.entries(WORK_MODE_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
            <Select aria-label="Employment type" value={filters.employmentType} onChange={(e) => setFilter("employmentType", e.target.value)} className="w-auto">
              <option value="">Any type</option>
              {Object.entries(EMPLOYMENT_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
            <Select aria-label="Experience level" value={filters.experienceLevel} onChange={(e) => setFilter("experienceLevel", e.target.value)} className="w-auto">
              <option value="">Any level</option>
              {Object.entries(LEVEL_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
          </div>
        )}
        {active.data && <p className="text-sm text-muted">{active.data.total} job{active.data.total === 1 ? "" : "s"}</p>}
      </div>

      <div className="mt-4 space-y-3">
        {active.isLoading && <Spinner label={nl ? "Searching" : "Loading jobs"} />}
        <ErrorNote error={active.error} />
        {active.data?.results.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            aside={
              job.relevance != null ? (
                <div className="text-right text-xs text-muted">
                  Relevance <span className="font-semibold text-ink tabular">{Math.round(job.relevance * 100)}%</span>
                </div>
              ) : undefined
            }
          />
        ))}
        {active.data && active.data.results.length === 0 && (
          <EmptyState icon={<SearchX className="size-5" />} title="No matching jobs">
            Try fewer filters or describe the role differently.
          </EmptyState>
        )}
      </div>
    </div>
  );
}
