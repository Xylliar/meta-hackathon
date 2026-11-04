"use client";

import { NotebookPen, type LucideIcon } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { useData } from "./DataProvider";
import type { DB, ID, Subject } from "@/lib/types";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-5">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Card({ children, className = "", flush = false }: { children: ReactNode; className?: string; flush?: boolean }) {
  return <section className={`rounded-lg bg-surface shadow-card ${flush ? "" : "p-4"} ${className}`}>{children}</section>;
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[17px] font-bold">{children}</h2>
      {action}
    </div>
  );
}

type Variant = "primary" | "secondary" | "soft" | "ghost" | "danger";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-strong",
  secondary: "bg-pressed text-ink hover:bg-pressed-hover",
  soft: "bg-accent-soft text-accent-text hover:bg-accent-soft-hover",
  ghost: "text-muted hover:bg-sunken hover:text-ink",
  danger: "text-[#e41e3f] hover:bg-red-50",
};

const buttonClass = (variant: Variant, className: string) =>
  `inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${className}`;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

/** A link that looks like a button (a button can't sit inside a link). */
export function ButtonLink({ href, variant = "primary", className = "", children }: { href: string; variant?: Variant; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}

export function IconBubble({ Icon, color, size = 36 }: { Icon: LucideIcon; color: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full"
      style={{ width: size, height: size, background: `color-mix(in srgb, ${color} 14%, var(--surface))`, color }}
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={2.2} />
    </span>
  );
}

/** Subject "profile picture": its initial on its color. */
export function SubjectAvatar({ subject, size = 40 }: { subject?: Subject; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: subject?.color ?? "#65676b", fontSize: size * 0.42 }}
    >
      {subject?.name.charAt(0).toUpperCase() ?? "?"}
    </span>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-muted">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "h-11 w-full min-w-0 rounded-md border border-input bg-surface px-3 text-[15px] outline-none placeholder:text-placeholder focus:border-accent focus:ring-2 focus:ring-accent/20";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputClass} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={inputClass} {...props} />;
}

export function Progress({ value, color = "var(--accent)", className = "" }: { value: number; color?: string; className?: string }) {
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-pressed ${className}`}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(value * 100)}%`, background: color }} />
    </div>
  );
}

export function SubjectChip({ subjectId, db }: { subjectId: ID; db: DB }) {
  const s = db.subjects.find((x) => x.id === subjectId);
  if (!s) return null;
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-sunken px-2.5 py-0.5 text-xs font-semibold">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
      {s.name}
    </span>
  );
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-surface p-6 text-center text-[15px] text-muted shadow-card">{children}</p>;
}

export function Spinner() {
  return <span className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-pressed border-t-accent" aria-label="Chargement" />;
}

/** Renders children once data is loaded; shows a loader or error before that. */
export function Loaded({ children }: { children: (db: DB) => ReactNode }) {
  const { db, today, error, status } = useData();
  // Not logged in: AuthGate is already sending the visitor to /connexion.
  if (status === "anonymous") return null;
  if (error && !db) return <Empty>{error}</Empty>;
  if (!db || !today) {
    return (
      <div className="grid place-items-center py-24">
        <Spinner />
      </div>
    );
  }
  return <>{children(db)}</>;
}

export function ErrorBanner() {
  const { error, db } = useData();
  if (!error || !db) return null;
  return <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
}

/** Reminder shown wherever the app could look like a complete study method. */
export function ExercisesNote({ className = "" }: { className?: string }) {
  return (
    <aside className={`flex gap-3 rounded-lg bg-surface p-4 text-sm shadow-card ${className}`}>
      <IconBubble Icon={NotebookPen} color="#0866ff" />
      <p className="leading-relaxed">
        <span className="font-semibold">Tempo ne remplace pas les exercices.</span>{" "}
        <span className="text-muted">
          Les flashcards et le quiz t&apos;aident à mémoriser, mais refaire des exercices reste la meilleure façon de vraiment comprendre ton
          cours.
        </span>
      </p>
    </aside>
  );
}
