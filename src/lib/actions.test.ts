import { describe, expect, it } from "vitest";
import { applyAction, ensureSubject } from "./actions";
import { emptyDb, type DB } from "./types";

const TODAY = "2026-11-02";

function dbWithQuestion(): DB {
  const db = emptyDb();
  db.questions.push({
    id: "q",
    courseId: "c",
    question: "Combien font 2 + 2 ?",
    choices: ["3", "4"],
    answerIndex: 1,
    explanation: "On ajoute deux unités à deux.",
    attempts: 0,
  });
  return db;
}

describe("answerQuestion", () => {
  it("records a right answer without creating a card", () => {
    const db = applyAction(dbWithQuestion(), { type: "answerQuestion", id: "q", choiceIndex: 1, today: TODAY });
    expect(db.questions[0]).toMatchObject({ attempts: 1, lastAnswered: TODAY, lastCorrect: true });
    expect(db.cards).toHaveLength(0);
  });

  it("turns a missed question into an error flashcard, only once", () => {
    let db = applyAction(dbWithQuestion(), { type: "answerQuestion", id: "q", choiceIndex: 0, today: TODAY });
    db = applyAction(db, { type: "answerQuestion", id: "q", choiceIndex: 0, today: TODAY });
    expect(db.questions[0]).toMatchObject({ attempts: 2, lastCorrect: false });
    expect(db.cards).toHaveLength(1);
    expect(db.cards[0]).toMatchObject({
      kind: "erreur",
      courseId: "c",
      question: "Combien font 2 + 2 ?",
      answer: "4",
      detail: "On ajoute deux unités à deux.",
      due: null,
    });
  });
});

describe("ensureSubject", () => {
  it("reuses a subject whatever the case or accents", () => {
    const { db } = ensureSubject(emptyDb(), "Mathématiques");
    const again = ensureSubject(db, "  mathematiques ");
    expect(again.db.subjects).toHaveLength(1);
    expect(again.subject.name).toBe("Mathématiques");
  });

  it("creates the subject for a new timetable slot", () => {
    const db = applyAction(emptyDb(), {
      type: "addClass",
      subjectName: "physique",
      slot: { weekday: 2, start: "08:00", end: "10:00" },
    });
    expect(db.subjects.map((s) => s.name)).toEqual(["Physique"]);
    expect(db.classes[0].subjectId).toBe(db.subjects[0].id);
  });
});

describe("markCourseRead", () => {
  it("remembers what was read today, and the first day the course was read", () => {
    const db = emptyDb();
    db.courses.push({ id: "c", subjectId: "s", title: "C", date: TODAY, createdAt: TODAY, images: [], sheet: "", source: "mock" });
    let next = applyAction(db, { type: "markCourseRead", courseId: "c", sections: [1], today: TODAY });
    next = applyAction(next, { type: "markCourseRead", courseId: "c", sections: [0, 1], today: TODAY });
    expect(next.courses[0]).toMatchObject({ sheetReadOn: TODAY, lastRead: { date: TODAY, sections: [0, 1] } });

    const tomorrow = "2026-11-03";
    next = applyAction(next, { type: "markCourseRead", courseId: "c", sections: [2], today: tomorrow });
    expect(next.courses[0]).toMatchObject({ sheetReadOn: TODAY, lastRead: { date: tomorrow, sections: [2] } });
  });
});

