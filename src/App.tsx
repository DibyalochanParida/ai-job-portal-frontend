import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { Layout } from "./components/Layout";
import { Spinner } from "./components/ui";
import { homeFor, useAuth } from "./lib/auth";
import type { Role } from "./lib/types";
import { LoginPage, RegisterPage } from "./pages/Auth";
import { JobsPage } from "./pages/Jobs";
import { JobDetailPage } from "./pages/JobDetail";
import { NotFoundPage } from "./pages/NotFound";
import { ForYouPage } from "./pages/seeker/ForYou";
import { ResumePage } from "./pages/seeker/Resume";
import { ApplicationsPage } from "./pages/seeker/Applications";
import { DashboardPage } from "./pages/employer/Dashboard";
import { EmployerJobsPage } from "./pages/employer/EmployerJobs";
import { JobFormPage } from "./pages/employer/JobForm";
import { CandidatesPage } from "./pages/employer/Candidates";
import { InterviewsPage } from "./pages/employer/Interviews";

function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (user.role !== role) return <Navigate to={homeFor(user)} replace />;
  return <>{children}</>;
}

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return <Navigate to={homeFor(user)} replace />;
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="jobs/:id" element={<JobDetailPage />} />

        <Route path="for-you" element={<RequireRole role="seeker"><ForYouPage /></RequireRole>} />
        <Route path="resume" element={<RequireRole role="seeker"><ResumePage /></RequireRole>} />
        <Route path="applications" element={<RequireRole role="seeker"><ApplicationsPage /></RequireRole>} />

        <Route path="employer" element={<RequireRole role="employer"><DashboardPage /></RequireRole>} />
        <Route path="employer/jobs" element={<RequireRole role="employer"><EmployerJobsPage /></RequireRole>} />
        <Route path="employer/jobs/new" element={<RequireRole role="employer"><JobFormPage /></RequireRole>} />
        <Route path="employer/jobs/:id/edit" element={<RequireRole role="employer"><JobFormPage /></RequireRole>} />
        <Route path="employer/candidates" element={<RequireRole role="employer"><CandidatesPage /></RequireRole>} />
        <Route path="employer/interviews" element={<RequireRole role="employer"><InterviewsPage /></RequireRole>} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
