# ai-job-portal-frontend

React + TypeScript web app for the AI-powered job portal. The API lives in
[ai-job-portal-backend](https://github.com/DibyalochanParida/ai-job-portal-backend).

**Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query, lucide icons,
Vitest + Testing Library. Served by unprivileged nginx in Docker.

## What's inside

**Job seekers**
- *Find jobs*: natural-language search ("remote senior React roles over $150k") shows how the AI
  interpreted the query as filter chips, ranks results by relevance, and offers classic filters too.
- *For you*: AI recommendations from your resume with a match score and reasons.
- *Resume*: drag-and-drop upload (PDF/DOCX/TXT), the parsed profile, and AI feedback (score,
  strengths, prioritised improvements, keywords, ATS tips), optionally tailored to a job.
- *Job detail*: apply with a chosen resume and a cover letter; "Check my fit" analyses your resume against the job.
- *Applications*: stage progress, upcoming interviews, withdraw.

**Employers**
- *Overview dashboard*: KPI tiles with deltas and sparklines, pipeline health (segmented bar,
  stage counts, conversion flow), AI match quality per job with top missing skills, an AI assistant
  chat (with voice input where the browser supports it), upcoming interviews, period switcher and CSV export.
- *Jobs*: create, edit, open/close/draft, delete postings.
- *Candidates*: applicants ranked by AI match with skill gaps; detail view with stage changes,
  history, resume download and interview scheduling.
- *Interviews*: upcoming/past, feedback with rating, cancel.

Charts follow a validated palette: an ordinal blue ramp for pipeline stages (checked for
colour-vision deficiency in light and dark mode), status colours always paired with an icon and
label, and every value available as text. Light/dark themes follow the OS, with a manual toggle.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173, proxies /api to http://localhost:4000
```

Start the backend first (`npm run seed && npm run dev` in the backend repo) and sign in with the demo
accounts described in its README.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server with API proxy |
| `npm run build` | Typecheck + production bundle in `dist/` |
| `npm run typecheck` | TypeScript only |
| `npm test` | Vitest component and unit tests |

Configuration (see [.env.example](.env.example)): `VITE_API_URL` (empty = same-origin `/api`),
`VITE_APP_NAME`, `VITE_API_PROXY` (dev proxy target).

## Docker

```bash
docker build -t ai-job-portal-frontend .
docker run -p 8080:8080 -e API_UPSTREAM=http://host.docker.internal:4000 ai-job-portal-frontend
```

nginx serves the SPA with security headers (CSP, frame denial, nosniff), long-cached hashed
assets, `index.html` revalidated on every load, and an optional `/api` reverse proxy
(`API_UPSTREAM`, `NGINX_RESOLVER`). The backend's `docker-compose.yml` can build this repo too
(`docker compose --profile web up`).

## CI/CD

- `.github/workflows/ci.yml`: typecheck, tests, build and Docker build on pull requests.
- `.github/workflows/deploy.yml`: on `main`, builds the image, pushes to Amazon ECR and deploys the
  ECS Fargate service (GitHub OIDC; no stored AWS keys). Setup is described in the backend repo's
  `docs/aws-deployment.md`.
