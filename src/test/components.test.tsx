import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../lib/auth";
import { LoginPage } from "../pages/Auth";
import { DeltaBadge } from "../components/dashboard/StatTile";
import { PipelineHealth } from "../components/dashboard/PipelineHealth";
import { ScoreMeter } from "../components/ui";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function renderWithProviders(ui: React.ReactNode, path = "/login") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={ui} />
            <Route path="/employer" element={<p>Employer home</p>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("LoginPage", () => {
  it("shows the API error for bad credentials", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401, { error: { message: "Invalid email or password" } })));
    renderWithProviders(<LoginPage />);
    await userEvent.type(screen.getByLabelText("Email"), "someone@test.example");
    await userEvent.type(screen.getByLabelText("Password"), "wrong-pass-1");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
    expect(localStorage.getItem("jobportal.token")).toBeNull();
  });

  it("stores the token and redirects employers to their dashboard", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        token: "jwt-token",
        user: { id: "u1", email: "e@test.example", fullName: "Erin Employer", role: "employer", createdAt: "", company: null },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderWithProviders(<LoginPage />);
    await userEvent.type(screen.getByLabelText("Email"), "e@test.example");
    await userEvent.type(screen.getByLabelText("Password"), "Passw0rd!");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Employer home")).toBeInTheDocument();
    expect(localStorage.getItem("jobportal.token")).toBe("jwt-token");
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", expect.objectContaining({ method: "POST" }));
  });
});

describe("dashboard pieces", () => {
  it("labels deltas with direction and period, not colour alone", () => {
    render(<DeltaBadge kpi={{ value: 10, delta: -8, deltaUnit: "percent", series: [] }} periodLabel="previous 30 days" />);
    expect(screen.getByText(/−8%/)).toBeInTheDocument();
    expect(screen.getByText(/vs previous 30 days/)).toBeInTheDocument();
  });

  it("exposes meters with accessible values", () => {
    render(<ScoreMeter score={58} label="Data Scientist" />);
    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-valuenow", "58");
    expect(meter).toHaveAccessibleName("Data Scientist: 58%, Partial match");
  });

  it("renders the pipeline with every stage count as text", async () => {
    render(
      <MemoryRouter>
        <PipelineHealth
          periodLabel="the last 30 days"
          data={{
            total: 20,
            stages: [
              { key: "applied", count: 4 },
              { key: "shortlisted", count: 5 },
              { key: "scheduled", count: 3 },
              { key: "interviewed", count: 3 },
              { key: "recommended", count: 2 },
              { key: "selected", count: 1 },
              { key: "dropped", count: 2 },
            ],
            conversions: [{ from: "shortlisted", to: "scheduled", rate: 73, previousRate: 70 }],
          }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole("img", { name: /Shortlisted 5 \(25%\)/ })).toBeInTheDocument();
    expect(screen.getByText("Dropped")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("73%")).toBeInTheDocument());
    expect(screen.getByText("+3 pts vs previous period")).toBeInTheDocument();
  });
});
