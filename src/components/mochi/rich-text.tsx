import { Fragment, type ReactNode } from "react";

/** Renders a small, safe subset of Markdown (paragraphs, lists, **bold**, [S1] citations) without HTML injection. */
function inline(text: string, keyBase: string, onCite?: (n: number) => ReactNode): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\[S\d+\])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) out.push(<strong key={`${keyBase}-b${i}`}>{token.slice(2, -2)}</strong>);
    else out.push(<Fragment key={`${keyBase}-c${i}`}>{onCite ? onCite(Number(token.slice(2, -1))) : token}</Fragment>);
    last = m.index + token.length;
    i++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function RichText({ text, onCite }: { text: string; onCite?: (n: number) => ReactNode }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-2">
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.trim());
        const bullets = lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l));
        if (bullets && lines.length > 0) {
          const ordered = /^\s*\d+\./.test(lines[0]);
          const Tag = ordered ? "ol" : "ul";
          return (
            <Tag key={bi} className={ordered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}>
              {lines.map((l, li) => (
                <li key={li}>{inline(l.replace(/^\s*([-*•]|\d+\.)\s+/, ""), `${bi}-${li}`, onCite)}</li>
              ))}
            </Tag>
          );
        }
        return <p key={bi}>{inline(lines.join(" "), `${bi}`, onCite)}</p>;
      })}
    </div>
  );
}
