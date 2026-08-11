import type { ReactNode } from "react";

/**
 * Minimal markdown renderer for agent prose.
 *
 * ResearchReportSchema describes section content as "markdown-friendly prose",
 * and the model duly emits `**bold**` sub-headings and `-` bullets. Rendering
 * that as plain text leaks the asterisks into the page. This covers the subset
 * the model actually produces — bold, italic, inline code, bullet and numbered
 * lists, ATX headings — and falls back to plain text for anything else.
 *
 * Builds React nodes rather than HTML strings, so model output can never inject
 * markup.
 */

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "h"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] };

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;
/** A whole line that is nothing but bold text — the model's sub-heading style. */
const BOLD_LINE = /^\s*\*\*(.+?)\*\*:?\s*$/;

function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trimEnd();
    const last = blocks[blocks.length - 1];

    if (!line.trim()) {
      // Blank line ends the current block.
      if (last?.kind === "p") blocks.push({ kind: "p", lines: [] });
      continue;
    }

    const heading = HEADING.exec(line) ?? BOLD_LINE.exec(line);
    if (heading) {
      blocks.push({ kind: "h", text: heading[1] });
      continue;
    }

    const bullet = BULLET.exec(line);
    if (bullet) {
      if (last?.kind === "ul") last.items.push(bullet[1]);
      else blocks.push({ kind: "ul", items: [bullet[1]] });
      continue;
    }

    const numbered = NUMBERED.exec(line);
    if (numbered) {
      if (last?.kind === "ol") last.items.push(numbered[1]);
      else blocks.push({ kind: "ol", items: [numbered[1]] });
      continue;
    }

    if (last?.kind === "p") last.lines.push(line);
    else blocks.push({ kind: "p", lines: [line] });
  }

  return blocks.filter((b) => b.kind !== "p" || b.lines.length > 0);
}

/**
 * Split on the inline markers, keeping the delimiters so they can be styled.
 * `**bold**` is listed first so it wins over `*italic*`. The italic arm refuses
 * a delimiter padded with whitespace, so prose like "5 * 3 * 2" stays literal.
 * Deliberately no lookbehind (older Safari throws on it at parse time, taking
 * the whole bundle with it) and no `_italic_` — snake_case field ids appear in
 * this prose.
 */
const INLINE = /(\*\*[^*]+\*\*|`[^`\n]+`|\*(?!\s)[^*\n]*[^\s*]\*)/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).filter(Boolean).map((token, i) => {
    const key = `${keyPrefix}-${i}`;

    if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
      return (
        <strong key={key} className="font-semibold text-zinc-900 dark:text-zinc-100">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
      return (
        <code
          key={key}
          className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.9em] dark:bg-zinc-800"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
      return (
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    }
    return <span key={key}>{token}</span>;
  });
}

export function Prose({ text, className }: { text: string; className?: string }) {
  const blocks = toBlocks(text);

  return (
    <div
      className={
        className ??
        "flex flex-col gap-3 text-[15px] leading-7 text-zinc-700 dark:text-zinc-300"
      }
    >
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "h":
            return (
              <h3
                key={i}
                className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
              >
                {renderInline(block.text, `h${i}`)}
              </h3>
            );
          case "ul":
          case "ol":
            return (
              <ul key={i} className="flex flex-col gap-1.5 pl-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex gap-2.5">
                    <span
                      aria-hidden
                      className="shrink-0 text-zinc-400 dark:text-zinc-500"
                    >
                      {block.kind === "ol" ? `${j + 1}.` : "—"}
                    </span>
                    <span>{renderInline(item, `l${i}-${j}`)}</span>
                  </li>
                ))}
              </ul>
            );
          default:
            return <p key={i}>{renderInline(block.lines.join(" "), `p${i}`)}</p>;
        }
      })}
    </div>
  );
}
