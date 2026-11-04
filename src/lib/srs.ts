import { addDays, diffDays } from "./date";
import type { Flashcard, Grade, ISODate } from "./types";

/**
 * Days until the next review after an "I know it". The ladder is 1, 3, 7, then ×2.5;
 * a card that has already been forgotten twice climbs more gently (1, 2, 4, then ×2)
 * so it keeps coming back until it really sticks.
 */
export function nextInterval(current: number, lapses = 0): number {
  if (lapses >= 2) {
    if (current < 1) return 1;
    if (current < 2) return 2;
    if (current < 4) return 4;
    return Math.round(current * 2);
  }
  if (current < 1) return 1;
  if (current < 3) return 3;
  if (current < 7) return 7;
  return Math.round(current * 2.5);
}

/**
 * Next review date, pulled in so the card is seen again before the exam.
 * Returns null when there is no useful review day left before the deadline.
 */
export function cappedDue(today: ISODate, interval: number, deadline?: ISODate): ISODate | null {
  const due = addDays(today, interval);
  if (!deadline) return due;
  const lastUsefulDay = addDays(deadline, -1);
  if (diffDays(today, lastUsefulDay) <= 0) return null;
  return diffDays(due, lastUsefulDay) < 0 ? lastUsefulDay : due;
}

/**
 * "I know it" moves the card up the ladder; "I don't know" sends it back to the
 * bottom: it is shown again in the same session and comes back tomorrow.
 */
export function reviewCard(card: Flashcard, grade: Grade, today: ISODate, deadline?: ISODate): Flashcard {
  const known = grade === "known";
  const wasLearned = card.due !== null;
  const lapses = !known && wasLearned ? card.lapses + 1 : card.lapses;
  const interval = known ? nextInterval(card.intervalDays, lapses) : 1;
  const reps = known ? card.reps + 1 : 0;

  // A card with no review day left before the exam still needs a due date so it
  // stays "studied"; tomorrow is harmless because the planner ignores it past the deadline.
  const due = cappedDue(today, interval, deadline) ?? addDays(today, 1);
  return { ...card, reps, lapses, intervalDays: interval, due, lastReviewed: today, lastGrade: grade };
}

/** Days until a card comes back if answered "I know it" now, for the button hint. */
export function knownDelay(card: Flashcard, today: ISODate, deadline?: ISODate): number {
  return diffDays(today, reviewCard(card, "known", today, deadline).due!);
}

/** 0–1 confidence that a card is known, from consecutive successful reviews. */
export function cardMastery(card: Flashcard): number {
  return Math.min(card.reps, 3) / 3;
}

/** Leitner box shown on the card, 0 (new or forgotten) to 5. */
export const leitnerBox = (card: Flashcard) => Math.min(card.reps, 5);
