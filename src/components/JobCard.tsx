import { Link } from "react-router-dom";
import { Banknote, Clock, MapPin } from "lucide-react";
import { EMPLOYMENT_LABEL, LEVEL_LABEL, salaryRange, timeAgo, WORK_MODE_LABEL } from "../lib/format";
import type { Job } from "../lib/types";
import { Badge, SkillChips } from "./ui";

export function JobCard({ job, aside }: { job: Job; aside?: React.ReactNode }) {
  const salary = salaryRange(job.salaryMin, job.salaryMax, job.currency);
  return (
    <article className="group rounded-2xl border border-line bg-surface p-5 transition hover:border-accent/40 hover:shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-sm text-ink-2">{job.companyName}</p>
            <h3 className="text-lg font-semibold leading-snug">
              <Link to={`/jobs/${job.id}`} className="hover:text-accent focus-visible:underline">
                {job.title}
              </Link>
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-2">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-4 text-muted" aria-hidden />
              {job.location || "Anywhere"} · {WORK_MODE_LABEL[job.workMode]}
            </span>
            {salary && (
              <span className="inline-flex items-center gap-1">
                <Banknote className="size-4 text-muted" aria-hidden />
                {salary}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock className="size-4 text-muted" aria-hidden />
              {timeAgo(job.createdAt)}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="accent">{LEVEL_LABEL[job.experienceLevel]}</Badge>
            <Badge>{EMPLOYMENT_LABEL[job.employmentType]}</Badge>
            {job.status !== "open" && <Badge tone="warning">{job.status === "closed" ? "Closed" : "Draft"}</Badge>}
          </div>
          <SkillChips skills={job.skills} max={6} />
        </div>
        {aside && <div className="sm:w-56 sm:shrink-0">{aside}</div>}
      </div>
    </article>
  );
}
