import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Briefcase, Building2, UserRound } from "lucide-react";
import { ApiError } from "../lib/api";
import { homeFor, useAuth } from "../lib/auth";
import { APP_NAME } from "../lib/format";
import type { Role } from "../lib/types";
import { Button, Card, cx, ErrorNote, Field, Input } from "../components/ui";

function fieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError) || !err.details) return {};
  return Object.fromEntries(err.details.map((d) => [d.path, d.message]));
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md py-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-ink-2">{subtitle}</p>
      </div>
      <Card className="p-6">{children}</Card>
    </div>
  );
}

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const from = (location.state as { from?: string } | null)?.from;

  if (user) return <Navigate to={from ?? homeFor(user)} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = await login(email, password);
      navigate(from ?? homeFor(u), { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title={`Sign in to ${APP_NAME}`}
      subtitle={
        <>
          New here?{" "}
          <Link to="/register" className="font-medium text-accent hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <ErrorNote error={error} />
        <Button type="submit" className="w-full" loading={busy}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("seeker");
  const [form, setForm] = useState({ fullName: "", email: "", password: "", companyName: "", companyIndustry: "" });
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const errors = fieldErrors(error);

  if (user) return <Navigate to={homeFor(user)} replace />;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload =
        role === "employer"
          ? { role, fullName: form.fullName, email: form.email, password: form.password, companyName: form.companyName, companyIndustry: form.companyIndustry || undefined }
          : { role, fullName: form.fullName, email: form.email, password: form.password };
      const u = await register(payload);
      navigate(u.role === "employer" ? "/employer" : "/resume", { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle={
        <>
          Already have one?{" "}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">I am…</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "seeker", label: "Looking for a job", icon: UserRound },
                { value: "employer", label: "Hiring", icon: Building2 },
              ] as const
            ).map((opt) => (
              <label
                key={opt.value}
                className={cx(
                  "flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border p-3 text-sm transition",
                  role === opt.value ? "border-accent bg-accent-soft text-accent-ink" : "border-line text-ink-2 hover:bg-surface-2",
                )}
              >
                <input type="radio" name="role" value={opt.value} checked={role === opt.value} onChange={() => setRole(opt.value)} className="sr-only" />
                <opt.icon className="size-5" aria-hidden />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Full name" htmlFor="fullName" error={errors.fullName}>
          <Input id="fullName" autoComplete="name" required value={form.fullName} onChange={set("fullName")} />
        </Field>
        <Field label="Email" htmlFor="reg-email" error={errors.email}>
          <Input id="reg-email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Password" htmlFor="reg-password" hint="At least 8 characters, with a letter and a number" error={errors.password}>
          <Input id="reg-password" type="password" autoComplete="new-password" required value={form.password} onChange={set("password")} />
        </Field>
        {role === "employer" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name" htmlFor="companyName" error={errors.companyName}>
              <Input id="companyName" required value={form.companyName} onChange={set("companyName")} />
            </Field>
            <Field label="Industry" htmlFor="companyIndustry">
              <Input id="companyIndustry" placeholder="Optional" value={form.companyIndustry} onChange={set("companyIndustry")} />
            </Field>
          </div>
        )}
        {error && !Object.keys(errors).length ? <ErrorNote error={error} /> : null}
        <Button type="submit" className="w-full" loading={busy}>
          <Briefcase className="size-4" aria-hidden /> Create account
        </Button>
      </form>
    </AuthShell>
  );
}
