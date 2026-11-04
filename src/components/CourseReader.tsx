"use client";

import { BookOpenText, Check, Pin, Star, TriangleAlert, Zap, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Visual } from "./Flashcard";
import { RichText } from "./RichText";
import { Markdown } from "./ui";
import type { Course, CourseBlock } from "@/lib/types";

function Box({ Icon, label, tone, children }: { Icon: LucideIcon; label: string; tone: string; children: ReactNode }) {
  return (
    <div className={`rounded-lg px-4 py-3 ${tone}`}>
      <p className="mb-1 flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase opacity-80">
        <Icon size={14} strokeWidth={2.4} /> {label}
      </p>
      {children}
    </div>
  );
}

function Block({ block, color }: { block: CourseBlock; color: string }) {
  const text = block.text && <RichText text={block.text} color={color} />;
  switch (block.type) {
    case "definition":
      return (
        <div className="rounded-r-lg border-l-4 py-1 pl-4" style={{ borderColor: color }}>
          <p className="flex items-center gap-1.5 font-semibold" style={{ color }}>
            <BookOpenText size={16} className="shrink-0" /> {block.title}
          </p>
          <p className="mt-0.5">{text}</p>
        </div>
      );
    case "formula":
      return (
        <div className="rounded-lg px-4 py-3" style={{ background: `color-mix(in srgb, ${color} 10%, var(--surface))` }}>
          <p className="text-center font-mono text-lg font-semibold [overflow-wrap:anywhere]">{block.title}</p>
          {block.text && <p className="mt-2 text-sm">{text}</p>}
          {block.items.length > 0 && (
            <ul className="mt-2 flex flex-col gap-0.5 text-sm text-muted">
              {block.items.map((i, k) => (
                <li key={k}>
                  <span className="font-mono font-semibold text-ink">{i.label}</span> : {i.value}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    case "keypoint":
      return (
        <Box Icon={Star} label={block.title || "À retenir"} tone="bg-amber-50 text-amber-950">
          <p>{text}</p>
        </Box>
      );
    case "example":
      return (
        <Box Icon={Pin} label={block.title || "Exemple"} tone="bg-accent-soft text-accent-ink">
          <p>{text}</p>
        </Box>
      );
    case "warning":
      return (
        <Box Icon={TriangleAlert} label={block.title || "Piège à éviter"} tone="bg-red-50 text-red-950">
          <p>{text}</p>
        </Box>
      );
    case "quote":
      return (
        <blockquote className="border-l-4 border-line pl-4 italic">
          <p>{text}</p>
          {block.title && <footer className="mt-1 text-sm text-muted not-italic">— {block.title}</footer>}
        </blockquote>
      );
    case "list":
      return (
        <div>
          {block.title && <p className="mb-1.5 font-semibold">{block.title}</p>}
          {block.text && <p className="mb-1.5">{text}</p>}
          <ul className="flex flex-col gap-1">
            {block.items.map((i, k) => (
              <li key={k} className="flex gap-2">
                <span style={{ color }}>•</span>
                <span>
                  <span className="font-semibold">{i.label}</span>
                  {i.value && <span> — <RichText text={i.value} color={color} /></span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "steps":
    case "timeline":
    case "compare":
      return (
        <div>
          {block.title && <p className="mb-2 font-semibold">{block.title}</p>}
          {block.text && <p className="mb-2">{text}</p>}
          {block.type === "steps" && block.items.some((i) => i.value) ? (
            <ol className="flex flex-col gap-1.5">
              {block.items.map((i, k) => (
                <li key={k} className="flex gap-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ background: color }}>
                    {k + 1}
                  </span>
                  <span>
                    <span className="font-semibold">{i.label}</span>
                    {i.value && <span className="text-muted"> — {i.value}</span>}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <Visual visual={{ kind: block.type, title: "", items: block.items }} color={color} />
          )}
        </div>
      );
    default:
      return <p>{text}</p>;
  }
}

/** The 30-second summary of a course. */
export function Essentials({ course, color }: { course: Course; color: string }) {
  if (!course.essentials?.length) return null;
  return (
    <div className="rounded-lg border-2 px-4 py-3" style={{ borderColor: `color-mix(in srgb, ${color} 35%, var(--surface))` }}>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase" style={{ color }}>
        <Zap size={14} strokeWidth={2.4} fill="currentColor" /> L&apos;essentiel en 30 secondes
      </p>
      <ul className="flex flex-col gap-1.5">
        {course.essentials.map((e, i) => (
          <li key={i} className="flex gap-2">
            <Check size={16} strokeWidth={2.6} className="mt-1 shrink-0" style={{ color }} />
            <span>
              <RichText text={e} color={color} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The course as the student reads it: its summary, then its sections (all of them, or
 * only the ones to read today). Courses from before sections existed show their sheet.
 */
export function CourseReader({ course, color, sections }: { course: Course; color: string; sections?: number[] }) {
  if (!course.sections?.length) {
    return course.sheet ? <Markdown>{course.sheet}</Markdown> : <p className="text-sm text-muted">Pas de contenu pour ce cours.</p>;
  }
  const shown = course.sections.map((s, i) => ({ ...s, index: i })).filter((s) => !sections || sections.includes(s.index));

  return (
    <div className="flex flex-col gap-6 leading-relaxed">
      {shown.map((section) => (
        <section key={section.index}>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ background: color }}>
              {section.index + 1}
            </span>
            {section.title}
          </h3>
          <div className="flex flex-col gap-3">
            {section.blocks.map((b, i) => (
              <Block key={i} block={b} color={color} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
