import { addDays } from "./date";
import type { Plan } from "./scheduler";
import type { DB, ISODate } from "./types";

/** Today's session: what's already done (even if interrupted) and what's left. */
export function todayProgress(db: DB, plan: Plan, today: ISODate) {
  const log = db.dayLogs.find((l) => l.date === today);
  const done =
    db.cards.filter((c) => c.lastReviewed === today).length +
    db.questions.filter((q) => q.lastAnswered === today).length +
    db.courses.filter((c) => c.lastRead?.date === today).length;
  const day = plan.days[0]?.date === today ? plan.days[0] : null;
  const left = day ? day.reading.length + day.newCards.length + day.reviews.length + day.questions.length : 0;
  const total = done + left;
  return {
    status: log?.status ?? (left === 0 ? (done > 0 ? "done" : "empty") : done > 0 ? "started" : "todo"),
    done,
    total,
    ratio: log?.status === "done" ? 1 : total ? done / total : 0,
    day,
  } as const;
}

/** Consecutive days with a finished session, ending today or yesterday. */
export function streak(db: DB, today: ISODate): number {
  const done = new Set(db.dayLogs.filter((l) => l.status === "done").map((l) => l.date));
  let d = done.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (done.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export const isMastered = (reps: number) => reps >= 3;
