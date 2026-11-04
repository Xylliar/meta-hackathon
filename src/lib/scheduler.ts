import { addDays, diffDays } from "./date";
import { cappedDue, cardMastery, nextInterval } from "./srs";
import type { Course, DB, Exam, ID, ISODate } from "./types";

/** Estimated time per task, in minutes. Reading time depends on the length of the section. */
export const MINUTES = { newCard: 1, review: 0.5, question: 1, recap: 0.5 };
/** Careful study reading, slower than reading for pleasure. */
const WORDS_PER_MINUTE = 130;

/** Course questions asked per session, after the flashcards. */
export const QUESTIONS_PER_DAY = 3;
/** A question answered correctly comes back after this many days at the earliest. */
const QUESTION_GAP_DAYS = 3;
/** Reading a section is always followed by a few of its cards, so a session is never only reading. */
const CARDS_AFTER_READING = 3;
/** How far ahead we plan, so a far-away exam can't make the loop run for years. */
const MAX_HORIZON_DAYS = 180;
/** Upper bound when searching how many daily minutes a late exam would need. */
const MAX_DAILY_MINUTES = 240;

/** Step 1 of a session for one course: sections to read, or just its essentials as a recap. */
export interface ReadingTask {
  courseId: ID;
  /** Sections to read in full. Empty means a quick recap of the essentials. */
  sections: number[];
}

export interface PlanDay {
  date: ISODate;
  reading: ReadingTask[];
  newCards: ID[];
  reviews: ID[];
  /** Multiple-choice questions, asked after the flashcards. */
  questions: ID[];
  minutes: number;
}

export interface ExamReport {
  examId: ID;
  /** Revision days left before the exam, starting from the plan's first day. */
  daysLeft: number;
  totalCards: number;
  studiedCards: number;
  /** 0–1, from the cards' real review history. */
  readiness: number;
  /** New cards that won't fit in the daily budget before the exam. */
  unscheduledItems: number;
  /** Extra minutes per day that would make everything fit; null when no realistic amount would. */
  extraMinutesPerDay: number | null;
  status: "ok" | "late" | "empty" | "today";
}

export interface Plan {
  /** First planned day: today, or tomorrow when today is already logged as done or skipped. */
  start: ISODate;
  days: PlanDay[];
  exams: ExamReport[];
}

/** Earliest exam date (on or after `from`) that covers each course. */
export function deadlineByCourse(db: DB, from: ISODate): Map<ID, ISODate> {
  const map = new Map<ID, ISODate>();
  for (const exam of db.exams) {
    if (diffDays(from, exam.date) < 0) continue;
    for (const courseId of exam.courseIds) {
      const current = map.get(courseId);
      if (!current || exam.date < current) map.set(courseId, exam.date);
    }
  }
  return map;
}

export function upcomingExams(db: DB, today: ISODate): Exam[] {
  return db.exams.filter((e) => diffDays(today, e.date) >= 0).sort((a, b) => a.date.localeCompare(b.date));
}

/** Older courses have a single Markdown sheet, treated as one section. */
export const sectionCount = (course: Course) => course.sections?.length || 1;
export const cardSection = (course: Course, section: number | undefined) => Math.min(Math.max(0, section ?? 0), sectionCount(course) - 1);

const countWords = (s: string) => s.split(/\s+/).filter(Boolean).length;

export function sectionMinutes(course: Course, index: number): number {
  const section = course.sections?.[index];
  const text = section
    ? [section.title, ...section.blocks.flatMap((b) => [b.title, b.text, ...b.items.flatMap((i) => [i.label, i.value])])].join(" ")
    : course.sheet;
  return Math.max(1, Math.round((countWords(text) / WORDS_PER_MINUTE) * 2) / 2);
}

/**
 * Sections read together with each section that has cards: the section itself plus the
 * card-less sections around it (an introduction before, a conclusion after the last one).
 */
function readingGroups(course: Course, sectionsWithCards: Set<number>): Map<number, number[]> {
  const groups = new Map<number, number[]>();
  let orphans: number[] = [];
  let last: number | null = null;
  for (let i = 0; i < sectionCount(course); i++) {
    if (sectionsWithCards.has(i)) {
      groups.set(i, [...orphans, i]);
      orphans = [];
      last = i;
    } else orphans.push(i);
  }
  if (last !== null && orphans.length) groups.get(last)!.push(...orphans);
  return groups;
}

interface SimCard {
  id: ID;
  courseId: ID;
  section: number;
  deadline: ISODate;
  isNew: boolean;
  /** Not known at the last review: its section is re-read before it. */
  weak: boolean;
  /** null once the card has no review day left before its exam. */
  due: ISODate | null;
  interval: number;
  lapses: number;
}

interface SimQuestion {
  id: ID;
  key: string;
  deadline: ISODate;
  lastAsked: ISODate | null;
  lastCorrect: boolean | null;
}

const sectionKey = (courseId: ID, section: number) => `${courseId}#${section}`;

/** Day-by-day simulation; returns the days and the new cards that didn't fit. */
function simulate(db: DB, start: ISODate, budget: number) {
  // Only exams with at least one revision day left take part in planning.
  const deadlines = deadlineByCourse(db, addDays(start, 1));
  const coursesById = new Map(db.courses.filter((c) => deadlines.has(c.id)).map((c) => [c.id, c]));

  const sim: SimCard[] = db.cards
    .filter((c) => coursesById.has(c.courseId))
    .map((c) => ({
      id: c.id,
      courseId: c.courseId,
      section: cardSection(coursesById.get(c.courseId)!, c.section),
      deadline: deadlines.get(c.courseId)!,
      isNew: c.due === null,
      weak: c.lastGrade === "unknown",
      due: c.due,
      interval: c.intervalDays,
      lapses: c.lapses,
    }));

  const groupsByCourse = new Map(
    [...coursesById.values()].map((course) => [
      course.id,
      readingGroups(course, new Set(sim.filter((c) => c.courseId === course.id).map((c) => c.section))),
    ]),
  );
  const readingMinutes = (courseId: ID, section: number) =>
    (groupsByCourse.get(courseId)?.get(section) ?? [section]).reduce((sum, i) => sum + sectionMinutes(coursesById.get(courseId)!, i), 0);

  // Questions come once their part of the course has been studied, from the next day on.
  const startedOn = new Map<string, ISODate>();
  const markStarted = (key: string, d: ISODate) => {
    if (!startedOn.has(key) || startedOn.get(key)! > d) startedOn.set(key, d);
  };
  for (const c of db.cards) {
    const course = coursesById.get(c.courseId);
    if (course && c.lastReviewed) markStarted(sectionKey(c.courseId, cardSection(course, c.section)), c.lastReviewed);
  }
  for (const c of coursesById.values()) if (c.sheetReadOn && !c.sections?.length) markStarted(sectionKey(c.id, 0), c.sheetReadOn);

  const simQuestions: SimQuestion[] = db.questions
    .filter((q) => coursesById.has(q.courseId))
    .map((q) => ({
      id: q.id,
      key: sectionKey(q.courseId, cardSection(coursesById.get(q.courseId)!, q.section)),
      deadline: deadlines.get(q.courseId)!,
      lastAsked: q.lastAnswered ?? null,
      lastCorrect: q.lastCorrect ?? null,
    }));
  const questionsFor = (d: ISODate) =>
    simQuestions
      .filter(
        (q) =>
          (startedOn.get(q.key) ?? "9999") < d &&
          d < q.deadline &&
          (q.lastAsked === null || (q.lastAsked < d && (q.lastCorrect === false || diffDays(q.lastAsked, d) >= QUESTION_GAP_DAYS))),
      )
      .sort(
        (a, b) =>
          Number(a.lastCorrect === true) - Number(b.lastCorrect === true) ||
          (a.lastAsked ?? "").localeCompare(b.lastAsked ?? "") ||
          a.deadline.localeCompare(b.deadline),
      );

  // New cards grouped by deadline, in lesson order and then section order.
  const pending = new Map<ISODate, SimCard[]>();
  const orderedCourses = [...coursesById.values()].sort((a, b) => a.date.localeCompare(b.date));
  for (const course of orderedCourses) {
    const deadline = deadlines.get(course.id)!;
    const items = pending.get(deadline) ?? [];
    items.push(...sim.filter((c) => c.courseId === course.id && c.isNew).sort((a, b) => a.section - b.section));
    pending.set(deadline, items);
  }

  const lastDeadline = [...deadlines.values()].sort().at(-1);
  const lastDay = lastDeadline ? addDays(lastDeadline, -1) : null;
  const days: PlanDay[] = [];

  for (let d = start; lastDay && d <= lastDay && days.length < MAX_HORIZON_DAYS; d = addDays(d, 1)) {
    const day: PlanDay = { date: d, reading: [], newCards: [], reviews: [], questions: [], minutes: 0 };
    let left = budget;

    // What has already been read today (the student may have stopped half-way).
    const readToday = new Map<ID, Set<number>>();
    const recapToday = new Set<ID>();
    /** Recaps counted in today's time; a full reading of the same course makes them unnecessary. */
    const recapCharged = new Set<ID>();
    const learnedToday = new Map<string, number>();
    for (const c of coursesById.values()) {
      if (c.lastRead?.date !== d) continue;
      readToday.set(c.id, new Set(c.lastRead.sections.flatMap((s) => groupsByCourse.get(c.id)?.get(s) ?? [s])));
      recapToday.add(c.id);
    }
    const taskFor = (courseId: ID) => {
      let task = day.reading.find((t) => t.courseId === courseId);
      if (!task) day.reading.push((task = { courseId, sections: [] }));
      return task;
    };

    /** Minutes of reading a card needs before it today: its section, a recap, or nothing. */
    const readingCost = (card: SimCard, fullSection: boolean) => {
      if (fullSection) {
        if (readToday.get(card.courseId)?.has(card.section)) return 0;
        return readingMinutes(card.courseId, card.section) - (recapCharged.has(card.courseId) ? MINUTES.recap : 0);
      }
      const course = coursesById.get(card.courseId)!;
      const hasRecap = Boolean(course.essentials?.length);
      return !hasRecap || recapToday.has(card.courseId) || readToday.has(card.courseId) ? 0 : MINUTES.recap;
    };
    const commitReading = (card: SimCard, fullSection: boolean) => {
      const cost = readingCost(card, fullSection);
      if (cost === 0) return 0;
      if (fullSection) {
        const sections = groupsByCourse.get(card.courseId)?.get(card.section) ?? [card.section];
        const read = readToday.get(card.courseId) ?? new Set<number>();
        sections.forEach((s) => read.add(s));
        readToday.set(card.courseId, read);
        const task = taskFor(card.courseId);
        task.sections = [...new Set([...task.sections, ...sections])].sort((a, b) => a - b);
        recapCharged.delete(card.courseId);
      } else {
        recapToday.add(card.courseId);
        recapCharged.add(card.courseId);
        taskFor(card.courseId);
      }
      return cost;
    };

    // 1. Reviews that are due, most urgent exam first. Cards not known last time
    //    come with their section to re-read; the others with a quick recap.
    const due = sim
      .filter((c) => !c.isNew && c.due !== null && c.due <= d && d < c.deadline)
      .sort((a, b) => a.deadline.localeCompare(b.deadline) || Number(b.weak) - Number(a.weak) || a.due!.localeCompare(b.due!));
    for (const card of due) {
      if (left < MINUTES.review) break;
      if (MINUTES.review + readingCost(card, card.weak) > left) continue;
      left -= MINUTES.review + commitReading(card, card.weak);
      day.reviews.push(card.id);
      markStarted(sectionKey(card.courseId, card.section), d);
      card.interval = nextInterval(card.interval, card.lapses);
      card.weak = false;
      card.due = cappedDue(d, card.interval, card.deadline);
    }

    // Keep a few minutes for course questions so new material can't crowd them out.
    const reserve = Math.min(left, Math.min(QUESTIONS_PER_DAY, questionsFor(d).length) * MINUTES.question);
    left -= reserve;

    // 2. New cards, spread evenly: each exam gets its fair share of what's left over
    //    the days before it, keeping the eve of the exam for a final review. The exam
    //    under the most pressure is served first. Each card's section is read first.
    const groups = [...pending]
      .filter(([deadline, items]) => items.length > 0 && diffDays(d, deadline) > 0)
      .map(([deadline, items]) => {
        const sections = new Set(items.map((c) => sectionKey(c.courseId, c.section)));
        const readingLeft = [...sections].reduce((sum, key) => {
          const card = items.find((c) => sectionKey(c.courseId, c.section) === key)!;
          return sum + readingMinutes(card.courseId, card.section);
        }, 0);
        const remaining = items.length * MINUTES.newCard + readingLeft;
        const daysLeft = diffDays(d, deadline);
        return { deadline, items, quota: remaining / Math.max(1, daysLeft - 1), pressure: remaining / daysLeft };
      })
      .sort((a, b) => b.pressure - a.pressure || a.deadline.localeCompare(b.deadline));

    for (const group of groups) {
      let spent = 0;
      while (group.items.length > 0) {
        const card = group.items[0];
        const key = sectionKey(card.courseId, card.section);
        // Once a section has been read today, a few of its cards always follow.
        const followsReading = Boolean(readToday.get(card.courseId)?.has(card.section)) && (learnedToday.get(key) ?? 0) < CARDS_AFTER_READING;
        if (spent >= group.quota && !followsReading) break;

        const reading = readingCost(card, true);
        const sameSection = group.items.slice(0, CARDS_AFTER_READING).filter((c) => c.courseId === card.courseId && c.section === card.section).length;
        const needed = reading > 0 ? reading + sameSection * MINUTES.newCard : MINUTES.newCard;
        if (needed > left) break;
        group.items.shift();
        const cost = MINUTES.newCard + commitReading(card, true);
        left -= cost;
        spent += cost;
        learnedToday.set(key, (learnedToday.get(key) ?? 0) + 1);

        day.newCards.push(card.id);
        markStarted(sectionKey(card.courseId, card.section), d);
        card.isNew = false;
        card.interval = 1;
        card.due = cappedDue(d, 1, card.deadline);
      }
    }

    // 3. Course questions, after the flashcards: unanswered and missed ones first.
    left += reserve;
    for (const q of questionsFor(d)) {
      if (day.questions.length >= QUESTIONS_PER_DAY || left < MINUTES.question) break;
      day.questions.push(q.id);
      left -= MINUTES.question;
      q.lastAsked = d;
      q.lastCorrect = true;
    }

    day.minutes = budget - left;
    days.push(day);
  }

  return { days, pending };
}

function leftoverFor(pending: Map<ISODate, SimCard[]>, courseIds: Set<ID>): SimCard[] {
  return [...pending.values()].flat().filter((c) => courseIds.has(c.courseId));
}

/** Smallest daily budget that fits all of an exam's material, or null if even the cap isn't enough. */
function minutesNeeded(db: DB, start: ISODate, courseIds: Set<ID>): number | null {
  let lo = db.settings.dailyMinutes;
  let hi = MAX_DAILY_MINUTES;
  if (leftoverFor(simulate(db, start, hi).pending, courseIds).length > 0) return null;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (leftoverFor(simulate(db, start, mid).pending, courseIds).length === 0) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

/**
 * Builds the revision plan from the current state. It is a pure function of the
 * data, so a missed day needs no special handling: the next call simply
 * spreads whatever is left over the days that remain.
 */
export function buildPlan(db: DB, today: ISODate): Plan {
  const start = db.dayLogs.some((l) => l.date === today) ? addDays(today, 1) : today;
  const budget = db.settings.dailyMinutes;
  const { days, pending } = simulate(db, start, budget);

  const exams = upcomingExams(db, today).map((exam): ExamReport => {
    const courseIds = new Set(exam.courseIds);
    const cards = db.cards.filter((c) => courseIds.has(c.courseId));
    const studied = cards.filter((c) => c.due !== null);
    const readiness = cards.length ? cards.reduce((s, c) => s + cardMastery(c), 0) / cards.length : 0;
    const leftover = leftoverFor(pending, courseIds);
    const daysLeft = Math.max(0, diffDays(start, exam.date));

    let status: ExamReport["status"] = "ok";
    if (exam.date === today) status = "today";
    else if (cards.length === 0) status = "empty";
    else if (leftover.length > 0) status = "late";

    let extraMinutesPerDay: number | null = 0;
    if (status === "late") {
      const needed = minutesNeeded(db, start, courseIds);
      extraMinutesPerDay = needed === null ? null : needed - budget;
    }

    return {
      examId: exam.id,
      daysLeft,
      totalCards: cards.length,
      studiedCards: studied.length,
      readiness,
      unscheduledItems: leftover.length,
      extraMinutesPerDay,
      status,
    };
  });

  return { start, days, exams };
}
