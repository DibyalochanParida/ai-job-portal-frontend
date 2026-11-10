import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, Sparkles, X } from "lucide-react";
import { titleCaseSkill } from "../lib/format";
import type { AiSource } from "../lib/types";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md"; loading?: boolean }) {
  const styles: Record<ButtonVariant, string> = {
    primary: "bg-accent text-white hover:bg-accent-hover shadow-sm",
    secondary: "border border-line bg-surface text-ink hover:bg-surface-2",
    ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
    danger: "border border-line bg-surface text-critical-text hover:bg-critical-soft",
  };
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-sm",
        styles[variant],
        className,
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]", className)} {...rest}>
      {children}
    </div>
  );
}

export function IconTile({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent", className)}>{children}</div>;
}

/** Fields fill their container unless the caller sets an explicit width (w-*). */
const widthFor = (className?: string) => (/(^|\s)w-/.test(className ?? "") ? "" : "w-full");

const fieldBase =
  "rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-critical-text">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(fieldBase, widthFor(props.className), "h-10", props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(fieldBase, widthFor(props.className), "py-2", props.className)} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cx(fieldBase, widthFor(className), "h-10 pr-8", className)}>
      {children}
    </select>
  );
}

export function Badge({ children, tone = "neutral", className, title }: { children: ReactNode; tone?: "neutral" | "accent" | "good" | "warning" | "critical"; className?: string; title?: string }) {
  const tones = {
    neutral: "bg-surface-2 text-ink-2 border-line",
    accent: "bg-accent-soft text-accent-ink border-transparent",
    good: "bg-good-soft text-good-text border-transparent",
    warning: "bg-warning-soft text-warning-text border-transparent",
    critical: "bg-critical-soft text-critical-text border-transparent",
  };
  return <span title={title} className={cx("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>{children}</span>;
}

export function SkillChips({ skills, tone = "neutral", max }: { skills: string[]; tone?: "neutral" | "accent" | "good" | "warning" | "critical"; max?: number }) {
  const shown = max ? skills.slice(0, max) : skills;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((s) => (
        <Badge key={s} tone={tone}>
          {titleCaseSkill(s)}
        </Badge>
      ))}
      {max && skills.length > max && <Badge>+{skills.length - max}</Badge>}
    </div>
  );
}

export function AiSourceBadge({ source }: { source: AiSource | undefined }) {
  if (!source) return null;
  return source === "claude" ? (
    <Badge tone="accent">
      <Sparkles className="size-3" aria-hidden /> Claude
    </Badge>
  ) : (
    <Badge title="No AI provider configured or it was unavailable; results come from the built-in rules engine">Rules engine</Badge>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted" role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden /> {label}…
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      {icon && <IconTile>{icon}</IconTile>}
      <div>
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-1 text-sm text-ink-2">{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : "Something went wrong";
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg bg-critical-soft px-3 py-2 text-sm text-critical-text">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {message}
    </div>
  );
}

/** Horizontal meter: fill carries severity, the track is a lighter step of the same ramp. Icon + label, never colour alone. */
export function ScoreMeter({ score, label, className }: { score: number | null; label?: string; className?: string }) {
  const band = score == null ? "none" : score >= 70 ? "good" : score >= 50 ? "warning" : "critical";
  const fill = { good: "var(--accent)", warning: "var(--warning)", critical: "var(--critical)", none: "var(--grid)" }[band];
  const track = { good: "var(--accent-track)", warning: "var(--warning-track)", critical: "var(--critical-track)", none: "var(--surface-2)" }[band];
  const Icon = band === "good" ? CheckCircle2 : band === "warning" ? AlertTriangle : AlertCircle;
  const bandLabel = { good: "Strong match", warning: "Partial match", critical: "Weak match", none: "Not scored" }[band];
  return (
    <div className={cx("flex items-center gap-2", className)} title={`${label ? `${label}: ` : ""}${score ?? "–"}% · ${bandLabel}`}>
      <div
        className="h-2 flex-1 overflow-hidden rounded-full"
        style={{ background: track }}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score ?? undefined}
        aria-label={`${label ?? "Match score"}: ${score ?? "not scored"}${score != null ? "%" : ""}, ${bandLabel}`}
      >
        <div className="h-full rounded-full" style={{ width: `${score ?? 0}%`, background: fill }} />
      </div>
      <span className="flex w-14 items-center justify-end gap-1 text-sm font-semibold text-ink tabular">
        {band !== "none" && <Icon className="size-3.5 text-muted" aria-hidden />}
        {score != null ? `${score}%` : "–"}
      </span>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal?.();
    if (!open && d.open) d.close?.();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      className={cx(
        "m-auto w-[calc(100%-2rem)] rounded-2xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/40",
        wide ? "max-w-3xl" : "max-w-lg",
      )}
    >
      {open && (
        <div className="max-h-[85vh] overflow-y-auto p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Close">
              <X className="size-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function PageHeader({ eyebrow, title, actions, children }: { eyebrow?: string; title: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-sm text-muted">{eyebrow}</p>}
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {children && <div className="mt-1 text-sm text-ink-2">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
