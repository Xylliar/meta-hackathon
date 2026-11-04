import { describe, expect, it } from "vitest";
import { applyAction } from "./actions";
import { addDays } from "./date";
import { buildPlan, MINUTES, QUESTIONS_PER_DAY, sectionMinutes, type Plan } from "./scheduler";
import { cappedDue, knownDelay, leitnerBox, reviewCard } from "./srs";
import { emptyDb, type DB, type Flashcard } from "./types";

const TODAY = "2026-11-02";
/** About 65 words: one minute of reading. */
const SECTION_TEXT = Array.from({ length: 65 }, (_, i) => `mot${i}`).join(" ");

interface ExamSpec {
  id: string;
  inDays: number;
  cards: number;
  questions?: number;
  /** Cards are spread evenly over this many sections. */
  sections?: number;
  essentials?: boolean;
}

function makeDb(exams: ExamSpec[], dailyMinutes = 15): DB {
  const db = emptyDb();
  db.settings.dailyMinutes = dailyMinutes;
  db.subjects.push({ id: "s", name: "Maths", color: "#000" });
  for (const e of exams) {
    const courseId = `c-${e.id}`;
    const sectionCount = e.sections ?? 1;
    db.courses.push({
      id: courseId,
      subjectId: "s",
      title: `Cours ${e.id}`,
      date: TODAY,
      createdAt: TODAY,
      images: [],
      sheet: "",
      essentials: e.essentials ? ["À retenir"] : undefined,
      sections: Array.from({ length: sectionCount }, (_, i) => ({
        title: `Partie ${i}`,
        blocks: [{ type: "text" as const, title: "", text: SECTION_TEXT, items: [] }],
      })),
      source: "mock",
    });
    for (let i = 0; i < e.cards; i++) {
      db.cards.push({
        id: `${e.id}-${i}`,
        courseId,
        section: Math.floor((i * sectionCount) / e.cards),
        question: "q",
        answer: "a",
        reps: 0,
        intervalDays: 0,
        due: null,
        lapses: 0,
      });
    }
    for (let i = 0; i < (e.questions ?? 0); i++) {
      db.questions.push({ id: `${e.id}-q${i}`, courseId, section: 0, question: "q", choices: ["a", "b"], answerIndex: 0, explanation: "", attempts: 0 });
    }
    db.exams.push({ id: e.id, subjectId: "s", title: e.id, date: addDays(TODAY, e.inDays), courseIds: [courseId] });
  }
  return db;
}

const allNew = (plan: Plan) => plan.days.flatMap((d) => d.newCards);
const readingOf = (plan: Plan, day: number, courseId: string) => plan.days[day].reading.find((t) => t.courseId === courseId);

describe("buildPlan", () => {
  it("fits one exam's material into daily sessions that respect the budget", () => {
    const plan = buildPlan(makeDb([{ id: "e", inDays: 10, cards: 20, sections: 2 }]), TODAY);

    expect(plan.start).toBe(TODAY);
    expect(plan.days).toHaveLength(10);
    expect(plan.days.at(-1)!.date).toBe(addDays(TODAY, 9));
    expect(new Set(allNew(plan)).size).toBe(20);
    for (const day of plan.days) expect(day.minutes).toBeLessThanOrEqual(15);
    expect(plan.exams[0]).toMatchObject({ status: "ok", unscheduledItems: 0 });
  });

  it("spreads new cards across the days instead of front-loading them all", () => {
    const plan = buildPlan(makeDb([{ id: "e", inDays: 10, cards: 20 }]), TODAY);
    const newPerDay = plan.days.map((d) => d.newCards.length);
    expect(Math.max(...newPerDay)).toBeLessThan(15);
    expect(newPerDay.filter((n) => n > 0).length).toBeGreaterThan(3);
  });

  it("schedules reviews of learned cards before the exam", () => {
    const plan = buildPlan(makeDb([{ id: "e", inDays: 10, cards: 10 }]), TODAY);
    const reviewed = new Set(plan.days.flatMap((d) => d.reviews));
    expect(reviewed.size).toBe(10);
    // The day before the exam is used as a final review.
    expect(plan.days.at(-1)!.reviews.length).toBeGreaterThan(0);
  });

  it("flags an exam that can't be prepared in time and says how much more time it needs", () => {
    const plan = buildPlan(makeDb([{ id: "e", inDays: 3, cards: 100 }]), TODAY);
    const report = plan.exams[0];
    expect(report.status).toBe("late");
    expect(report.unscheduledItems).toBeGreaterThan(0);
    expect(report.extraMinutesPerDay).toBeGreaterThan(0);

    const roomy = buildPlan(makeDb([{ id: "e", inDays: 3, cards: 100 }], 15 + report.extraMinutesPerDay!), TODAY);
    expect(roomy.exams[0].unscheduledItems).toBe(0);
  });

  it("re-plans from tomorrow when today is skipped, keeping all the material", () => {
    const db = makeDb([{ id: "e", inDays: 6, cards: 30 }]);
    const before = buildPlan(db, TODAY);
    const skipped = applyAction(db, { type: "logDay", log: { date: TODAY, status: "skipped" } });
    const after = buildPlan(skipped, TODAY);

    expect(after.start).toBe(addDays(TODAY, 1));
    expect(after.days).toHaveLength(before.days.length - 1);
    expect(new Set(allNew(after)).size).toBe(30);
    // The skipped day's work is absorbed by the remaining days.
    expect(after.days[0].newCards.length).toBeGreaterThanOrEqual(before.days[0].newCards.length);
  });

  it("finishes the nearer exam's material first when two exams compete", () => {
    const plan = buildPlan(
      makeDb([
        { id: "near", inDays: 4, cards: 20 },
        { id: "far", inDays: 20, cards: 20 },
      ]),
      TODAY,
    );
    const nearDays = plan.days.slice(0, 4);
    expect(nearDays.flatMap((d) => d.newCards).filter((id) => id.startsWith("near"))).toHaveLength(20);
    expect(plan.exams.map((e) => e.status)).toEqual(["ok", "ok"]);
  });

  it("leaves cards alone until they are due", () => {
    const db = makeDb([{ id: "e", inDays: 10, cards: 1 }]);
    db.cards[0] = { ...db.cards[0], reps: 2, intervalDays: 3, due: addDays(TODAY, 3), lastReviewed: TODAY, lastGrade: "known" };
    const plan = buildPlan(db, TODAY);
    const firstReview = plan.days.findIndex((d) => d.reviews.includes("e-0"));
    expect(firstReview).toBe(3);
    expect(plan.days.slice(0, 3).every((d) => d.minutes === 0)).toBe(true);
  });

  it("plans nothing once the exam has passed", () => {
    const plan = buildPlan(makeDb([{ id: "e", inDays: -1, cards: 5 }]), TODAY);
    expect(plan.days).toHaveLength(0);
    expect(plan.exams).toHaveLength(0);
  });

  it("estimates each day's time from its reading, cards and questions", () => {
    const db = makeDb([{ id: "e", inDays: 8, cards: 12, questions: 4, sections: 3, essentials: true }]);
    const course = db.courses[0];
    const plan = buildPlan(db, TODAY);
    for (const d of plan.days) {
      const reading = d.reading.reduce(
        (sum, t) => sum + (t.sections.length ? t.sections.reduce((s, i) => s + sectionMinutes(course, i), 0) : MINUTES.recap),
        0,
      );
      const expected = reading + d.newCards.length * MINUTES.newCard + d.reviews.length * MINUTES.review + d.questions.length * MINUTES.question;
      expect(d.minutes).toBeCloseTo(expected);
    }
  });
});

describe("reading the course", () => {
  const sectionOf = (id: string, cards: number, sections: number) => Math.floor((Number(id.split("-")[1]) * sections) / cards);

  it("reads each new card's section first, and never makes a session of reading only", () => {
    const plan = buildPlan(makeDb([{ id: "e", inDays: 10, cards: 12, sections: 3 }]), TODAY);
    for (const day of plan.days) {
      const task = day.reading.find((t) => t.courseId === "c-e");
      for (const id of day.newCards) expect(task?.sections).toContain(sectionOf(id, 12, 3));
      for (const s of task?.sections ?? []) {
        const cardsOfSection = [...day.newCards, ...day.reviews].filter((id) => sectionOf(id, 12, 3) === s);
        expect(cardsOfSection.length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("re-reads the section of a card that wasn't known, and only recaps known ones", () => {
    const db = makeDb([{ id: "e", inDays: 10, cards: 4, sections: 2, essentials: true }]);
    const yesterday = addDays(TODAY, -1);
    db.cards = db.cards.map((c) => ({ ...c, reps: 1, intervalDays: 1, due: TODAY, lastReviewed: yesterday, lastGrade: "known" as const }));
    db.cards[3] = { ...db.cards[3], reps: 0, lapses: 1, lastGrade: "unknown" };
    expect(readingOf(buildPlan(db, TODAY), 0, "c-e")?.sections).toEqual([1]);

    db.cards[3] = { ...db.cards[3], lastGrade: "known" };
    expect(readingOf(buildPlan(db, TODAY), 0, "c-e")?.sections).toEqual([]);
  });

  it("doesn't ask to read again what was already read today", () => {
    const db = makeDb([{ id: "e", inDays: 10, cards: 6, sections: 2 }]);
    const fresh = buildPlan(db, TODAY);
    expect(readingOf(fresh, 0, "c-e")?.sections).toContain(0);

    const read = applyAction(db, { type: "markCourseRead", courseId: "c-e", sections: [0], today: TODAY });
    const after = buildPlan(read, TODAY);
    expect(readingOf(after, 0, "c-e")?.sections ?? []).not.toContain(0);
    expect(after.days[0].newCards).toEqual(fresh.days[0].newCards);
  });
});

describe("course questions", () => {
  it("asks a few once their part of the course was studied, from the next day on", () => {
    const plan = buildPlan(makeDb([{ id: "e", inDays: 10, cards: 10, questions: 8 }]), TODAY);
    const firstCardDay = plan.days.findIndex((d) => d.newCards.length > 0);
    const firstQuestionDay = plan.days.findIndex((d) => d.questions.length > 0);
    expect(firstQuestionDay).toBeGreaterThan(firstCardDay);
    for (const d of plan.days) expect(d.questions.length).toBeLessThanOrEqual(QUESTIONS_PER_DAY);
    expect(new Set(plan.days.flatMap((d) => d.questions)).size).toBe(8);
  });

  it("keeps time for questions even when there is a lot of new material", () => {
    const db = makeDb([{ id: "e", inDays: 3, cards: 100, questions: 5 }]);
    db.cards[0] = { ...db.cards[0], reps: 1, intervalDays: 3, due: addDays(TODAY, 2), lastReviewed: addDays(TODAY, -1), lastGrade: "known" };
    const plan = buildPlan(db, TODAY);
    expect(plan.days[0].questions).toHaveLength(QUESTIONS_PER_DAY);
    expect(plan.days[0].minutes).toBeLessThanOrEqual(15);
  });

  it("brings a missed question back the next day and spaces out the ones answered right", () => {
    const db = makeDb([{ id: "e", inDays: 10, cards: 1, questions: 2 }]);
    db.cards[0] = { ...db.cards[0], reps: 2, intervalDays: 7, due: addDays(TODAY, 7), lastReviewed: addDays(TODAY, -2), lastGrade: "known" };
    db.questions[0] = { ...db.questions[0], attempts: 1, lastAnswered: addDays(TODAY, -1), lastCorrect: false };
    db.questions[1] = { ...db.questions[1], attempts: 1, lastAnswered: addDays(TODAY, -1), lastCorrect: true };
    const plan = buildPlan(db, TODAY);
    expect(plan.days[0].questions).toEqual(["e-q0"]);
    expect(plan.days[2].questions).toContain("e-q1");
  });
});

describe("reviewCard", () => {
  const card: Flashcard = { id: "x", courseId: "c", question: "", answer: "", reps: 0, intervalDays: 0, due: null, lapses: 0 };

  it("spaces reviews further apart after each « je connais »", () => {
    const first = reviewCard(card, "known", TODAY);
    const second = reviewCard(first, "known", first.due!);
    const third = reviewCard(second, "known", second.due!);
    expect([first.intervalDays, second.intervalDays, third.intervalDays]).toEqual([1, 3, 7]);
    expect(leitnerBox(third)).toBe(3);
  });

  it("sends a card it didn't know back to the start, for tomorrow", () => {
    const learned = { ...card, reps: 3, intervalDays: 7, due: TODAY };
    const next = reviewCard(learned, "unknown", TODAY);
    expect(next).toMatchObject({ due: addDays(TODAY, 1), intervalDays: 1, reps: 0, lapses: 1, lastGrade: "unknown" });
  });

  it("doesn't count a lapse for a card being learned for the first time", () => {
    expect(reviewCard(card, "unknown", TODAY).lapses).toBe(0);
  });

  it("brings often-forgotten cards back more often", () => {
    const leech = { ...card, reps: 1, intervalDays: 1, due: TODAY, lapses: 2 };
    const normal = { ...leech, lapses: 0 };
    expect(reviewCard(leech, "known", TODAY).intervalDays).toBe(2);
    expect(reviewCard(normal, "known", TODAY).intervalDays).toBe(3);
  });

  it("brings the next review forward so it happens before the exam", () => {
    const learned = { ...card, reps: 3, intervalDays: 14, due: TODAY };
    expect(reviewCard(learned, "known", TODAY, addDays(TODAY, 5)).due).toBe(addDays(TODAY, 4));
    expect(knownDelay(learned, TODAY, addDays(TODAY, 5))).toBe(4);
  });

  it("has no review day to offer on the eve of the exam", () => {
    expect(cappedDue(TODAY, 1, addDays(TODAY, 1))).toBeNull();
  });
});
