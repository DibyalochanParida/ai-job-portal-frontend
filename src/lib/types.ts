export type Role = "seeker" | "employer";
export type WorkMode = "onsite" | "remote" | "hybrid";
export type EmploymentType = "full_time" | "part_time" | "contract" | "internship";
export type ExperienceLevel = "entry" | "mid" | "senior" | "lead";
export type JobStatus = "draft" | "open" | "closed";
export type ApplicationStatus =
  | "applied"
  | "shortlisted"
  | "scheduled"
  | "interviewed"
  | "recommended"
  | "selected"
  | "rejected"
  | "withdrawn";
export type AiSource = "claude" | "heuristic";

export interface Company {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  size: string | null;
  description: string | null;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  createdAt: string;
  company: Company | null;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string;
  skills: string[];
  location: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  status: JobStatus;
  companyId: string;
  companyName: string;
  companyIndustry?: string | null;
  createdAt: string;
  updatedAt: string;
  relevance?: number | null;
  similarity?: number | null;
}

export interface JobInput {
  title: string;
  description: string;
  requirements: string;
  skills: string[];
  location: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  status: JobStatus;
}

export interface SearchIntent {
  semanticQuery: string;
  skills: string[];
  location: string | null;
  workMode: WorkMode | null;
  employmentType: EmploymentType | null;
  experienceLevel: ExperienceLevel | null;
  salaryMin: number | null;
}

export interface JobSearchResponse {
  total: number;
  page: number;
  limit: number;
  results: Job[];
  interpretation?: SearchIntent;
  source?: AiSource;
}

export interface ParsedResume {
  fullName: string | null;
  headline: string | null;
  location: string | null;
  summary: string | null;
  totalYearsExperience: number | null;
  skills: string[];
  experience: { title: string; company: string; startDate: string | null; endDate: string | null; highlights: string[] }[];
  education: { institution: string; degree: string | null; field: string | null; graduationYear: number | null }[];
  certifications: string[];
}

export interface Resume {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  parsed: ParsedResume;
  skills: string[];
  parseSource: AiSource;
  isPrimary: boolean;
  createdAt: string;
  latestFeedback?: { score: number; createdAt: string } | null;
}

export interface ResumeFeedback {
  overallScore: number;
  summary: string;
  strengths: string[];
  improvements: { area: string; suggestion: string; priority: "high" | "medium" | "low" }[];
  missingKeywords: string[];
  atsTips: string[];
  jobFit: { score: number; matchedSkills: string[]; missingSkills: string[]; verdict: string } | null;
}

export interface FeedbackRecord {
  id: string;
  score: number;
  feedback: ResumeFeedback;
  source: AiSource;
  createdAt: string;
  jobId: string | null;
  jobTitle: string | null;
}

export interface Recommendation {
  job: Job;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
}

export interface Application {
  id: string;
  status: ApplicationStatus;
  matchScore: number | null;
  matchedSkills: string[];
  missingSkills: string[];
  coverLetter: string | null;
  createdAt: string;
  updatedAt: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  seekerId: string;
  candidateName: string;
  candidateEmail: string;
  resumeId: string | null;
  candidateHeadline: string | null;
  candidateYears: number | null;
  jobLocation?: string;
  jobWorkMode?: WorkMode;
  interviews?: { scheduledAt: string; mode: string; status: string; durationMinutes: number }[] | null;
}

export interface Interview {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  mode: "video" | "phone" | "onsite";
  interviewer: string | null;
  status: "scheduled" | "completed" | "cancelled";
  rating: number | null;
  feedback: string | null;
  applicationId?: string;
  applicationStatus?: ApplicationStatus;
  candidateName?: string;
  jobTitle?: string;
  matchScore?: number | null;
}

export interface Kpi {
  value: number;
  delta: number | null;
  deltaUnit: "percent" | "points" | "count";
  series: number[];
}

export interface EmployerAnalytics {
  period: { days: number; from: string; to: string };
  kpis: Record<"totalCandidates" | "interviewTime" | "hireRate" | "activeJobs", Kpi>;
  pipeline: {
    total: number;
    stages: { key: ApplicationStatus | "dropped"; count: number }[];
    conversions: { from: ApplicationStatus; to: ApplicationStatus; rate: number | null; previousRate: number | null }[];
  };
  matchQuality: {
    overall: number | null;
    delta: number | null;
    jobs: { jobId: string; title: string; applicants: number; score: number | null }[];
    topMissingSkills: { skill: string; percent: number; count: number }[];
  };
  upcomingInterviews: {
    id: string;
    scheduledAt: string;
    durationMinutes: number;
    candidateName: string;
    jobTitle: string;
    mode: string;
    interviewer: string | null;
  }[];
}

export interface EmployerJobSummary {
  jobId: string;
  title: string;
  status: JobStatus;
  applicants: number;
  avgMatch: number | null;
  createdAt: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  source?: AiSource;
}

export interface Health {
  status: string;
  ai: "anthropic" | "local";
  model: string | null;
  embeddings: "voyage" | "local";
  storage: "local" | "s3";
}
