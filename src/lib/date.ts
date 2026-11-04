import type { ISODate } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

/** Parses at local noon so DST shifts never move the day. */
export function parseISODate(s: ISODate): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(s: ISODate, days: number): ISODate {
  const d = parseISODate(s);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Whole days from a to b (positive when b is later). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86_400_000);
}

/** 1 = Monday … 7 = Sunday */
export function weekdayOf(s: ISODate): number {
  return ((parseISODate(s).getDay() + 6) % 7) + 1;
}

export const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export function formatLong(s: ISODate): string {
  return parseISODate(s).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export function formatShort(s: ISODate): string {
  return parseISODate(s).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

export function relativeDays(from: ISODate, to: ISODate): string {
  const n = diffDays(from, to);
  if (n === 0) return "aujourd'hui";
  if (n === 1) return "demain";
  if (n === -1) return "hier";
  return n > 0 ? `dans ${n} jours` : `il y a ${-n} jours`;
}
