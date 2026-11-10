import { Fragment, type ReactNode } from "react";

/**
 * Minimal Markdown for assistant replies: paragraphs, bullet / numbered lists, **bold**,
 * *italic* and `code`. Builds React nodes (never innerHTML), so model output can't inject markup.
 */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyPrefix}-${i++}`;
    if (tok.startsWith("**")) out.push(<strong key={key} className="font-semibold">{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) out.push(<code key={key} className="rounded bg-black/10 px-1 text-[0.9em]">{tok.slice(1, -1)}</code>);
    else out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      const k = `p${blocks.length}`;
      blocks.push(<p key={k}>{inline(para.join(" "), k)}</p>);
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const k = `l${blocks.length}`;
      const items = list.items.map((it, idx) => <li key={idx}>{inline(it, `${k}-${idx}`)}</li>);
      blocks.push(
        list.ordered ? (
          <ol key={k} className="list-decimal space-y-1 pl-5">{items}</ol>
        ) : (
          <ul key={k} className="list-disc space-y-1 pl-5">{items}</ul>
        ),
      );
      list = null;
    }
  };

  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (bullet || numbered) {
      flushPara();
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]!);
    } else if (heading) {
      flushPara();
      flushList();
      const k = `h${blocks.length}`;
      blocks.push(<p key={k} className="font-semibold">{inline(heading[1]!, k)}</p>);
    } else if (!line.trim()) {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();
  return <div className={className ?? "space-y-2"}>{blocks.map((b, i) => <Fragment key={i}>{b}</Fragment>)}</div>;
}
