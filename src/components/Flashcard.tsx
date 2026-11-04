"use client";

import {
  BookOpen,
  BookOpenText,
  CalendarDays,
  Languages,
  Lightbulb,
  ListOrdered,
  ListTree,
  Pin,
  Quote,
  RotateCcw,
  Scale,
  SearchCheck,
  Sigma,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { leitnerBox } from "@/lib/srs";
import type { CardKind, CardVisual, Flashcard } from "@/lib/types";
import { RichText } from "./RichText";

/** Badge of each card type. The big emoji on the front is the card's own (chosen by Muse). */
export const KIND_META: Record<CardKind, { label: string; Icon: LucideIcon; emoji: string }> = {
  definition: { label: "Définition", Icon: BookOpenText, emoji: "📘" },
  formule: { label: "Formule", Icon: Sigma, emoji: "🧮" },
  date: { label: "Date", Icon: CalendarDays, emoji: "🗓️" },
  schema: { label: "Schéma", Icon: ListOrdered, emoji: "🔁" },
  comparaison: { label: "Comparaison", Icon: Scale, emoji: "⚖️" },
  oeuvre: { label: "Auteur & œuvre", Icon: BookOpen, emoji: "📚" },
  citation: { label: "Citation", Icon: Quote, emoji: "💬" },
  vocabulaire: { label: "Vocabulaire", Icon: Languages, emoji: "🔤" },
  plan: { label: "Plan", Icon: ListTree, emoji: "🗂️" },
  erreur: { label: "Erreur à éviter", Icon: TriangleAlert, emoji: "⚠️" },
};

export function Visual({ visual, color }: { visual: CardVisual; color: string }) {
  const tint = `color-mix(in srgb, ${color} 12%, var(--surface))`;
  switch (visual.kind) {
    case "steps":
      return (
        <ol className="flex flex-wrap items-center justify-center gap-1.5">
          {visual.items.map((item, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium" style={{ background: tint }}>
                <span className="grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: color }}>
                  {i + 1}
                </span>
                {item.label}
              </span>
              {i < visual.items.length - 1 && <span className="text-muted">→</span>}
            </li>
          ))}
        </ol>
      );
    case "timeline":
      return (
        <ol className="relative ml-2 border-l-2 pl-4" style={{ borderColor: color }}>
          {visual.items.map((item, i) => (
            <li key={i} className="relative pb-2 last:pb-0">
              <span className="absolute top-1.5 -left-[23px] h-3 w-3 rounded-full border-2 border-white" style={{ background: color }} />
              <span className="text-sm font-semibold" style={{ color }}>
                {item.label}
              </span>
              <span className="text-sm"> — {item.value}</span>
            </li>
          ))}
        </ol>
      );
    case "compare": {
      const [head, ...rows] = visual.items;
      if (!head) return null;
      return (
        <div className="overflow-hidden rounded-lg border border-line text-sm">
          <div className="grid grid-cols-2 font-semibold text-white" style={{ background: color }}>
            <span className="px-3 py-1.5">{head.label}</span>
            <span className="border-l border-white/30 px-3 py-1.5">{head.value}</span>
          </div>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-2 border-t border-line">
              <span className="px-3 py-1.5">{r.label}</span>
              <span className="border-l border-line px-3 py-1.5">{r.value}</span>
            </div>
          ))}
        </div>
      );
    }
    case "formula":
      return (
        <div className="rounded-lg px-4 py-3 text-center" style={{ background: tint }}>
          <p className="font-mono text-lg font-semibold [overflow-wrap:anywhere]">{visual.title}</p>
          {visual.items.length > 0 && (
            <ul className="mt-2 flex flex-col gap-0.5 text-left text-xs text-muted">
              {visual.items.map((item, i) => (
                <li key={i}>
                  <span className="font-mono font-semibold text-ink">{item.label}</span> : {item.value}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    case "list":
      return (
        <div>
          {visual.title && <p className="mb-1.5 text-xs font-semibold text-muted uppercase">{visual.title}</p>}
          <ul className="flex flex-wrap gap-1.5">
            {visual.items.map((item, i) => (
              <li key={i} className="rounded-full px-2.5 py-1 text-sm" style={{ background: tint }}>
                <span className="font-medium">{item.label}</span>
                {item.value && <span className="text-muted"> · {item.value}</span>}
              </li>
            ))}
          </ul>
        </div>
      );
    default:
      return null;
  }
}

/** How well the card is known: one dot per consecutive « je connais », up to 5. */
function LeitnerDots({ card, color }: { card: Flashcard; color: string }) {
  const box = leitnerBox(card);
  const label = card.due === null ? "Nouvelle carte" : box === 0 ? "À revoir" : `Niveau ${box}/5`;
  return (
    <span className="flex items-center gap-1.5" title={label}>
      <span className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: i <= box ? color : "var(--line)" }} />
        ))}
      </span>
      {label}
    </span>
  );
}

function Note({ Icon, title, children, className }: { Icon: LucideIcon; title: string; children: ReactNode; className: string }) {
  return (
    <div className={`flex gap-2 rounded-lg px-3 py-2 text-sm ${className}`}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <p>
        <span className="font-semibold">{title} :</span> {children}
      </p>
    </div>
  );
}

/**
 * A two-sided card: question on the front, answer and visual aids on the back.
 * Both faces share one grid cell so the card takes the height of the taller one.
 */
export function FlashcardView({
  card,
  color,
  subjectName,
  flipped,
  onFlip,
  compact = false,
}: {
  card: Flashcard;
  color: string;
  subjectName?: string;
  flipped: boolean;
  onFlip?: () => void;
  compact?: boolean;
}) {
  const meta = KIND_META[card.kind ?? "definition"];
  const isError = card.kind === "erreur";
  const accent = isError ? "#e41e3f" : color;

  const badge = (
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white" style={{ background: accent }}>
        <meta.Icon size={13} strokeWidth={2.4} />
        {meta.label}
      </span>
      {subjectName && <span className="truncate text-xs font-semibold text-muted">{subjectName}</span>}
    </div>
  );
  const face =
    "rounded-lg bg-surface shadow-card [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [grid-area:1/1] overflow-hidden flex flex-col";
  // WebKit (Safari, every iPhone browser) doesn't always honor backface-visibility and then shows
  // the back face, mirrored, on top. Hiding the face that looks away, halfway through the
  // 500 ms flip (when the card is edge-on), keeps the right side up everywhere.
  const side = (visible: boolean) => ({ visibility: visible ? ("visible" as const) : ("hidden" as const), transition: "visibility 0s linear 250ms" });

  return (
    <button
      type="button"
      onClick={onFlip}
      className={`group block w-full text-left [perspective:1200px] ${onFlip ? "cursor-pointer" : "cursor-default"}`}
      aria-label={flipped ? "Voir la question" : "Voir la réponse"}
    >
      <div
        className="grid transition-transform duration-500 [transform-style:preserve-3d]"
        style={{ transform: flipped ? "rotateY(180deg)" : undefined }}
      >
        {/* Front */}
        <div className={face} style={side(!flipped)} aria-hidden={flipped}>
          <div className="h-1.5" style={{ background: accent }} />
          <div className={`flex flex-1 flex-col gap-3 ${compact ? "p-4" : "p-5"}`}>
            {badge}
            <div className={`flex flex-1 flex-col items-center justify-center gap-3 text-center ${compact ? "min-h-28" : "min-h-56"}`}>
              <span className={compact ? "text-3xl" : "text-5xl"}>{card.emoji || meta.emoji}</span>
              <p className={`font-semibold break-words ${compact ? "text-sm" : "text-xl"}`}>{card.question}</p>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted">
              <LeitnerDots card={card} color={accent} />
              {onFlip && (
                <span className="flex items-center gap-1">
                  <RotateCcw size={12} /> Retourner
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Back */}
        <div className={`${face} [transform:rotateY(180deg)]`} style={side(flipped)} aria-hidden={!flipped}>
          <div className="h-1.5" style={{ background: accent }} />
          <div className={`flex flex-1 flex-col gap-3 ${compact ? "p-4" : "p-5"}`}>
            {badge}
            <p className={`text-center font-semibold break-words ${compact ? "text-sm" : "py-2 text-lg"}`}>
              <RichText text={card.answer} keywords={card.keywords ?? []} color={accent} />
            </p>
            {card.visual && card.visual.kind !== "none" && <Visual visual={card.visual} color={accent} />}
            {card.detail && (
              <Note Icon={SearchCheck} title="Pourquoi" className="bg-red-50 text-red-900">
                {card.detail}
              </Note>
            )}
            {card.mnemonic && (
              <Note Icon={Lightbulb} title="Astuce" className="bg-amber-50 text-amber-900">
                {card.mnemonic}
              </Note>
            )}
            {card.example && (
              <Note Icon={Pin} title="Exemple" className="bg-accent-soft text-accent-ink">
                {card.example}
              </Note>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
