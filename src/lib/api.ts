import type {
  Application,
  ApplicationStatus,
  ChatTurn,
  EmployerAnalytics,
  EmployerJobSummary,
  FeedbackRecord,
  Health,
  Interview,
  Job,
  JobInput,
  JobSearchResponse,
  Recommendation,
  Resume,
  User,
} from "./types";

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const TOKEN_KEY = "jobportal.token";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string | null) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      // storage unavailable (private mode): session-only login
    }
  },
};

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

type Query = Record<string, string | number | boolean | null | undefined>;

function buildUrl(path: string, query?: Query) {
  const url = `${BASE}/api${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function request<T>(
  path: string,
  opts: { method?: string; body?: unknown; query?: Query; form?: FormData; signal?: AbortSignal } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(buildUrl(path, opts.query), { method: opts.method ?? "GET", headers, body, signal: opts.signal });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    const err = data?.error;
    throw new ApiError(res.status, err?.message ?? `Request failed (${res.status})`, err?.details);
  }
  return data as T;
}

export const api = {
  health: () => request<Health>("/health"),

  // auth
  login: (email: string, password: string) => request<{ token: string; user: User }>("/auth/login", { method: "POST", body: { email, password } }),
  register: (input: Record<string, unknown>) => request<{ token: string; user: User }>("/auth/register", { method: "POST", body: input }),
  me: () => request<{ user: User }>("/auth/me"),

  // jobs
  listJobs: (query: Query) => request<JobSearchResponse>("/jobs", { query }),
  searchJobs: (q: string, page = 1) => request<JobSearchResponse>("/jobs/search", { method: "POST", body: { query: q, page } }),
  getJob: (id: string) =>
    request<{ job: Job; application: { id: string; status: ApplicationStatus; matchScore: number | null } | null }>(`/jobs/${id}`),
  createJob: (input: JobInput) => request<{ job: Job }>("/jobs", { method: "POST", body: input }),
  updateJob: (id: string, input: JobInput) => request<{ job: Job }>(`/jobs/${id}`, { method: "PUT", body: input }),
  setJobStatus: (id: string, status: Job["status"]) => request<{ job: Job }>(`/jobs/${id}/status`, { method: "PATCH", body: { status } }),
  deleteJob: (id: string) => request<void>(`/jobs/${id}`, { method: "DELETE" }),
  apply: (jobId: string, input: { resumeId?: string | null; coverLetter?: string | null }) =>
    request<{ application: { id: string; matchScore: number; matchedSkills: string[]; missingSkills: string[] } }>(`/jobs/${jobId}/apply`, {
      method: "POST",
      body: input,
    }),

  // seeker
  uploadResume: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ resume: Resume }>("/resumes", { method: "POST", form });
  },
  listResumes: () => request<{ resumes: Resume[] }>("/resumes"),
  getResume: (id: string) => request<{ resume: Resume; feedback: FeedbackRecord[] }>(`/resumes/${id}`),
  resumeDownload: (id: string) => request<{ url: string }>(`/resumes/${id}/download`),
  setPrimaryResume: (id: string) => request<{ ok: true }>(`/resumes/${id}/primary`, { method: "POST" }),
  deleteResume: (id: string) => request<void>(`/resumes/${id}`, { method: "DELETE" }),
  resumeFeedback: (id: string, jobId?: string | null) =>
    request<{ feedback: FeedbackRecord }>(`/resumes/${id}/feedback`, { method: "POST", body: { jobId: jobId ?? null } }),
  recommendations: (limit = 10) =>
    request<{ resumeId: string | null; recommendations: Recommendation[]; message?: string }>("/me/recommendations", { query: { limit } }),
  myApplications: () => request<{ applications: Application[] }>("/me/applications"),
  withdraw: (id: string) => request<{ status: ApplicationStatus }>(`/me/applications/${id}/withdraw`, { method: "POST" }),

  // employer
  employerJobs: () => request<{ jobs: EmployerJobSummary[] }>("/employer/jobs"),
  candidates: (query: Query) => request<{ total: number; candidates: Application[] }>("/employer/candidates", { query }),
  application: (id: string) =>
    request<{
      application: Application & { resumeParsed: import("./types").ParsedResume | null; jobSkills: string[] };
      events: { fromStatus: string | null; toStatus: string; note: string | null; createdAt: string; changedBy: string | null }[];
      interviews: Interview[];
    }>(`/employer/applications/${id}`),
  setApplicationStatus: (id: string, status: ApplicationStatus, note?: string) =>
    request<{ status: ApplicationStatus }>(`/employer/applications/${id}/status`, { method: "PATCH", body: { status, note } }),
  applicantResume: (id: string) => request<{ url: string }>(`/employer/applications/${id}/resume`),
  scheduleInterview: (id: string, input: { scheduledAt: string; durationMinutes: number; mode: string; interviewer?: string | null }) =>
    request<{ interview: Interview }>(`/employer/applications/${id}/interviews`, { method: "POST", body: input }),
  interviews: (scope: "upcoming" | "past" | "all") => request<{ interviews: Interview[] }>("/employer/interviews", { query: { scope } }),
  updateInterview: (id: string, input: Partial<Pick<Interview, "status" | "rating" | "feedback" | "durationMinutes">>) =>
    request<{ interview: Interview }>(`/employer/interviews/${id}`, { method: "PATCH", body: input }),
  analytics: (days: number) => request<EmployerAnalytics>("/employer/analytics", { query: { days } }),
  assistant: (message: string, history: ChatTurn[]) =>
    request<{ answer: string; source: "claude" | "heuristic" }>("/employer/assistant", {
      method: "POST",
      body: { message, history: history.map(({ role, content }) => ({ role, content })) },
    }),
};

/** Resolve a download URL from the API (relative for local storage, absolute for S3). */
export function absoluteUrl(url: string) {
  return /^https?:\/\//.test(url) ? url : `${BASE}${url}`;
}
