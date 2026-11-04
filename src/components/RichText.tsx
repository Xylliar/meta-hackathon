import { Fragment } from "react";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Text with **bold** key terms and ==highlighted== must-know parts, in the subject's
 * color. Extra keywords (from a flashcard) are highlighted wherever they appear.
 */
export function RichText({ text, color, keywords = [] }: { text: string; color: string; keywords?: string[] }) {
  const tint = (pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
  const keywordPattern = keywords.filter(Boolean).length
    ? new RegExp(`(${[...keywords].filter(Boolean).sort((a, b) => b.length - a.length).map(escape).join("|")})`, "gi")
    : null;

  const plain = (s: string, key: string) =>
    keywordPattern ? (
      <Fragment key={key}>
        {s.split(keywordPattern).map((part, i) =>
          i % 2 === 1 ? (
            <mark key={i} className="rounded px-1 font-semibold text-ink" style={{ background: tint(22) }}>
              {part}
            </mark>
          ) : (
            part
          ),
        )}
      </Fragment>
    ) : (
      <Fragment key={key}>{s}</Fragment>
    );

  return (
    <>
      {/* Non-greedy, so a highlighted formula may itself contain "=" or "*". */}
      {text.split(/(\*\*.+?\*\*|==.+?==)/).map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return (
            <strong key={i} className="font-semibold" style={{ color: `color-mix(in srgb, ${color} 70%, var(--ink))` }}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("==") && part.endsWith("==") && part.length > 4) {
          return (
            <mark key={i} className="rounded px-1 font-medium text-ink [box-decoration-break:clone]" style={{ background: tint(25) }}>
              {part.slice(2, -2)}
            </mark>
          );
        }
        return plain(part, String(i));
      })}
    </>
  );
}
