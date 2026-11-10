import type { ApplicationStatus, EmploymentType, ExperienceLevel, WorkMode } from "./types";

export const APP_NAME = (import.meta.env.VITE_APP_NAME as string | undefined) ?? "HireLens";

export const WORK_MODE_LABEL: Record<WorkMode, string> = { onsite: "On-site", remote: "Remote", hybrid: "Hybrid" };
export const EMPLOYMENT_LABEL: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
};
export const LEVEL_LABEL: Record<ExperienceLevel, string> = { entry: "Entry level", mid: "Mid level", senior: "Senior", lead: "Lead" };

export const STATUS_LABEL: Record<ApplicationStatus | "dropped", string> = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  scheduled: "Scheduled",
  interviewed: "Interviewed",
  recommended: "Recommended",
  selected: "Selected",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  dropped: "Dropped",
};

export const PIPELINE: ApplicationStatus[] = ["applied", "shortlisted", "scheduled", "interviewed", "recommended", "selected"];

/** 1,284 / 12.9K / 4.2M */
export function compact(n: number): string {
  if (Math.abs(n) < 10_000) return n.toLocaleString("en-US");
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function money(n: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, notation: n >= 10_000 ? "compact" : "standard", maximumFractionDigits: n >= 10_000 ? 0 : 0 }).format(n);
}

export function salaryRange(min: number | null, max: number | null, currency = "USD"): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${money(min, currency)} – ${money(max, currency)}`;
  return min != null ? `From ${money(min, currency)}` : `Up to ${money(max!, currency)}`;
}

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)}m ago`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)}h ago`;
  const d = h / 24;
  if (d < 30) return `${Math.floor(d)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

export function titleCaseSkill(s: string): string {
  const special: Record<string, string> = {
    "node.js": "Node.js", "next.js": "Next.js", aws: "AWS", sql: "SQL", "ci/cd": "CI/CD", css: "CSS", html: "HTML",
    graphql: "GraphQL", typescript: "TypeScript", javascript: "JavaScript", postgresql: "PostgreSQL", mongodb: "MongoDB",
    llms: "LLMs", rag: "RAG", ux: "UX", ui: "UI", "a/b testing": "A/B testing", dbt: "dbt", pytorch: "PyTorch",
    "scikit-learn": "scikit-learn", rest: "REST", grpc: "gRPC", "c#": "C#", "c++": "C++", ".net": ".NET", "github actions": "GitHub Actions", nestjs: "NestJS",
  };
  return special[s] ?? s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Match-score band: drives meter colour (with an icon + label, never colour alone). */
export function scoreBand(score: number | null | undefined): "good" | "warning" | "critical" | "none" {
  if (score == null) return "none";
  if (score >= 70) return "good";
  if (score >= 50) return "warning";
  return "critical";
}
