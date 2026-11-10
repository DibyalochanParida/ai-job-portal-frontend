import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Star } from "lucide-react";
import { api } from "../../lib/api";
import { dateTime } from "../../lib/format";
import type { Interview } from "../../lib/types";
import { Badge, Button, Card, cx, EmptyState, ErrorNote, Field, Modal, PageHeader, Spinner, Textarea } from "../../components/ui";

type Scope = "upcoming" | "past";

function CompleteForm({ interview, onDone }: { interview: Interview; onDone: () => void }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(interview.rating ?? 4);
  const [feedback, setFeedback] = useState(interview.feedback ?? "");
  const save = useMutation({
    mutationFn: () => api.updateInterview(interview.id, { status: "completed", rating, feedback: feedback || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interviews"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
      qc.invalidateQueries({ queryKey: ["candidates"] });
      onDone();
    },
  });
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-pressed={rating === n} className="p-1">
              <Star className={cx("size-6", n <= rating ? "fill-warning text-warning" : "text-line")} />
            </button>
          ))}
        </div>
      </fieldset>
      <Field label="Feedback" htmlFor="iv-feedback">
        <Textarea id="iv-feedback" rows={5} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Strengths, concerns, recommendation…" />
      </Field>
      <ErrorNote error={save.error} />
      <Button type="submit" loading={save.isPending} className="w-full">Save & mark completed</Button>
    </form>
  );
}

export function InterviewsPage() {
  const qc = useQueryClient();
  const [scope, setScope] = useState<Scope>("upcoming");
  const [reviewing, setReviewing] = useState<Interview | null>(null);
  const list = useQuery({ queryKey: ["interviews", scope], queryFn: () => api.interviews(scope) });
  const cancel = useMutation({
    mutationFn: (id: string) => api.updateInterview(id, { status: "cancelled" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["interviews"] }),
  });

  return (
    <div>
      <PageHeader eyebrow="Schedule" title="Interviews" />
      <div className="mb-4 inline-flex rounded-xl border border-line bg-surface p-1" role="tablist">
        {(["upcoming", "past"] as const).map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={scope === s}
            onClick={() => setScope(s)}
            className={cx("rounded-lg px-4 py-1.5 text-sm font-medium capitalize", scope === s ? "bg-accent text-white" : "text-ink-2 hover:text-ink")}
          >
            {s}
          </button>
        ))}
      </div>
      {list.isLoading && <Spinner />}
      <ErrorNote error={list.error ?? cancel.error} />
      {list.data?.interviews.length === 0 && <EmptyState icon={<CalendarCheck className="size-5" />} title={`No ${scope} interviews`}>Schedule interviews from a candidate's profile.</EmptyState>}
      <div className="grid gap-3 md:grid-cols-2">
        {list.data?.interviews.map((i) => {
          const past = new Date(i.scheduledAt).getTime() + i.durationMinutes * 60_000 < Date.now();
          const needsReview = (i.status === "scheduled" && past) || (i.status === "completed" && (!i.feedback || !i.rating));
          return (
            <Card key={i.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{i.candidateName}</p>
                  <p className="text-sm text-ink-2">{i.jobTitle}</p>
                </div>
                <Badge tone={i.status === "completed" ? "good" : i.status === "cancelled" ? "neutral" : needsReview ? "warning" : "accent"}>
                  {needsReview ? "Needs review" : i.status}
                </Badge>
              </div>
              <p className="mt-3 text-sm tabular text-ink-2">
                {dateTime(i.scheduledAt)} · {i.durationMinutes} min · <span className="capitalize">{i.mode}</span>
                {i.interviewer ? ` · ${i.interviewer}` : ""}
              </p>
              {i.feedback && <p className="mt-2 line-clamp-2 text-sm text-ink-2">“{i.feedback}”</p>}
              {i.status !== "cancelled" && (
                <div className="mt-4 flex gap-2">
                  {(past || i.status === "completed") && (
                    <Button size="sm" variant={needsReview ? "primary" : "secondary"} onClick={() => setReviewing(i)}>
                      {i.status === "completed" ? "Edit feedback" : "Add feedback"}
                    </Button>
                  )}
                  {i.status === "scheduled" && !past && (
                    <Button size="sm" variant="ghost" onClick={() => confirm("Cancel this interview?") && cancel.mutate(i.id)}>Cancel</Button>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
      <Modal open={Boolean(reviewing)} onClose={() => setReviewing(null)} title={`Feedback: ${reviewing?.candidateName ?? ""}`}>
        {reviewing && <CompleteForm interview={reviewing} onDone={() => setReviewing(null)} />}
      </Modal>
    </div>
  );
}
