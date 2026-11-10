import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, BrainCircuit, Loader2, Mic, SendHorizontal, Sparkles } from "lucide-react";
import { api } from "../../lib/api";
import { Markdown } from "../../lib/markdown";
import type { ChatTurn } from "../../lib/types";
import { cx } from "../ui";

const SUGGESTIONS = ["Who are my top 3 candidates?", "Show pending interview reviews", "Find scheduling conflicts"];

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: { 0: { transcript: string } }[] }) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function AssistantPanel() {
  const location = useLocation();
  const health = useQuery({ queryKey: ["health"], queryFn: api.health, staleTime: 5 * 60_000 });
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const Speech = getSpeechRecognition();

  const ask = useMutation({
    mutationFn: (message: string) => api.assistant(message, history),
    onSuccess: (res) => setHistory((h) => [...h, { role: "assistant", content: res.answer, source: res.source }]),
    onError: (err) =>
      setHistory((h) => [...h, { role: "assistant", content: `Sorry, I couldn't answer that: ${err instanceof Error ? err.message : "unknown error"}` }]),
  });

  useEffect(() => {
    if (location.hash === "#assistant") inputRef.current?.focus();
  }, [location.hash]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history, ask.isPending]);

  function send(text: string) {
    const message = text.trim();
    if (!message || ask.isPending) return;
    setHistory((h) => [...h, { role: "user", content: message }]);
    setDraft("");
    ask.mutate(message);
  }

  function toggleVoice() {
    if (!Speech) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new Speech();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (e) => setDraft(e.results[0]?.[0].transcript ?? "");
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

  const usingClaude = health.data?.ai === "anthropic";

  return (
    <section
      id="assistant"
      aria-label="AI Assistant"
      className="flex min-h-[520px] flex-col rounded-2xl p-5 text-white shadow-[0_8px_24px_rgba(28,92,171,0.25)]"
      style={{ background: "linear-gradient(160deg, var(--assistant-from), var(--assistant-to))" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-white/15">
            <BrainCircuit className="size-5" aria-hidden />
          </div>
          <div>
            <h2 className="font-semibold">AI Assistant</h2>
            <p className="text-xs text-white/75">{usingClaude ? "Powered by Claude" : "Built-in rules engine"}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">
          <span className={cx("size-1.5 rounded-full", health.isError ? "bg-white/50" : "bg-[#4ade80]")} aria-hidden />
          {health.isError ? "Offline" : "Online"}
        </span>
      </div>

      <div ref={scrollRef} className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: 360 }} aria-live="polite">
        {history.length === 0 ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Try asking</p>
            <ul className="space-y-2">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    onClick={() => send(s)}
                    className="flex w-full items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-3 text-left text-sm transition hover:bg-white/20"
                  >
                    <Sparkles className="size-4 shrink-0 text-white/80" aria-hidden />
                    <span className="flex-1">{s}</span>
                    <ArrowRight className="size-4 text-white/60" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          history.map((turn, i) =>
            turn.role === "user" ? (
              <div key={i} className="ml-8 rounded-2xl rounded-br-md bg-white px-3 py-2 text-sm text-[#0b0b0b]">
                {turn.content}
              </div>
            ) : (
              <div key={i} className="mr-4 rounded-2xl rounded-bl-md bg-white/12 px-3 py-2.5 text-sm leading-relaxed" style={{ background: "rgba(255,255,255,0.12)" }}>
                <Markdown text={turn.content} />
              </div>
            ),
          )
        )}
        {ask.isPending && (
          <div className="mr-4 inline-flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-sm text-white/80">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Thinking…
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} disabled={ask.isPending} className="rounded-full bg-white/10 px-2.5 py-1 text-xs hover:bg-white/20 disabled:opacity-50">
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          send(draft);
        }}
        className="mt-4 flex items-center gap-1 rounded-xl bg-white p-1.5 pl-3"
      >
        <label htmlFor="assistant-input" className="sr-only">Ask the assistant</label>
        <input
          ref={inputRef}
          id="assistant-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask me anything…"
          maxLength={2000}
          className="h-9 min-w-0 flex-1 bg-transparent text-sm text-[#0b0b0b] outline-none placeholder:text-[#7b7a75]"
        />
        {Speech && (
          <button
            type="button"
            onClick={toggleVoice}
            className={cx("rounded-lg p-2", listening ? "bg-[#fdeaea] text-[#b42f2f]" : "text-[#52514e] hover:bg-[#f4f6f9]")}
            aria-label={listening ? "Stop voice input" : "Voice input"}
            aria-pressed={listening}
          >
            <Mic className="size-4" />
          </button>
        )}
        <button
          type="submit"
          disabled={!draft.trim() || ask.isPending}
          className="grid size-9 place-items-center rounded-full bg-[#2a78d6] text-white hover:bg-[#256abf] disabled:opacity-50"
          aria-label="Send"
        >
          <SendHorizontal className="size-4" />
        </button>
      </form>
    </section>
  );
}
