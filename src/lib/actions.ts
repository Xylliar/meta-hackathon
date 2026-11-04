import { reviewCard } from "./srs";
import { deadlineByCourse } from "./scheduler";
import type { ClassSlot, DB, DayLog, Exam, Flashcard, Grade, ID, ISODate, Subject } from "./types";

export type Action =
  | { type: "addSubject"; subject: Omit<Subject, "id"> }
  | { type: "deleteSubject"; id: ID }
  | { type: "addClass"; subjectName: string; slot: Omit<ClassSlot, "id" | "subjectId"> }
  | { type: "deleteClass"; id: ID }
  | { type: "addExam"; exam: Omit<Exam, "id"> }
  | { type: "updateExam"; exam: Exam }
  | { type: "deleteExam"; id: ID }
  | { type: "deleteCourse"; id: ID }
  | { type: "addCard"; courseId: ID; question: string; answer: string }
  | { type: "updateCard"; id: ID; question: string; answer: string }
  | { type: "deleteCard"; id: ID }
  | { type: "reviewCard"; id: ID; grade: Grade; today: ISODate }
  | { type: "answerQuestion"; id: ID; choiceIndex: number; today: ISODate }
  | { type: "deleteQuestion"; id: ID }
  | { type: "markCourseRead"; courseId: ID; sections: number[]; today: ISODate }
  | { type: "logDay"; log: DayLog }
  | { type: "clearDayLog"; date: ISODate }
  | { type: "setDailyMinutes"; minutes: number };

export const newId = () => crypto.randomUUID();

export const SUBJECT_COLORS = ["#4f46e5", "#16a34a", "#c2410c", "#2563eb", "#db2777", "#0891b2", "#ca8a04", "#7c3aed"];

const sameName = (a: string, b: string) => a.trim().localeCompare(b.trim(), "fr", { sensitivity: "base" }) === 0;

/** Finds a subject by name (ignoring case and accents) or creates it. */
export function ensureSubject(db: DB, name: string): { db: DB; subject: Subject } {
  const existing = db.subjects.find((s) => sameName(s.name, name));
  if (existing) return { db, subject: existing };
  const clean = name.trim();
  const subject = {
    id: newId(),
    name: clean.charAt(0).toLocaleUpperCase("fr") + clean.slice(1),
    color: SUBJECT_COLORS[db.subjects.length % SUBJECT_COLORS.length],
  };
  return { db: { ...db, subjects: [...db.subjects, subject] }, subject };
}

export const newCardState = { reps: 0, intervalDays: 0, due: null, lapses: 0 } satisfies Partial<Flashcard>;

/** Pure state transition; the server persists whatever this returns. */
export function applyAction(db: DB, action: Action): DB {
  switch (action.type) {
    case "addSubject":
      return { ...db, subjects: [...db.subjects, { ...action.subject, id: newId() }] };

    case "deleteSubject": {
      const courseIds = new Set(db.courses.filter((c) => c.subjectId === action.id).map((c) => c.id));
      return {
        ...db,
        subjects: db.subjects.filter((s) => s.id !== action.id),
        classes: db.classes.filter((c) => c.subjectId !== action.id),
        exams: db.exams.filter((e) => e.subjectId !== action.id),
        courses: db.courses.filter((c) => !courseIds.has(c.id)),
        cards: db.cards.filter((c) => !courseIds.has(c.courseId)),
        questions: db.questions.filter((q) => !courseIds.has(q.courseId)),
      };
    }

    case "addClass": {
      const { db: next, subject } = ensureSubject(db, action.subjectName);
      return { ...next, classes: [...next.classes, { ...action.slot, subjectId: subject.id, id: newId() }] };
    }

    case "deleteClass":
      return { ...db, classes: db.classes.filter((c) => c.id !== action.id) };

    case "addExam":
      return { ...db, exams: [...db.exams, { ...action.exam, id: newId() }] };

    case "updateExam":
      return { ...db, exams: db.exams.map((e) => (e.id === action.exam.id ? action.exam : e)) };

    case "deleteExam":
      return { ...db, exams: db.exams.filter((e) => e.id !== action.id) };

    case "deleteCourse":
      return {
        ...db,
        courses: db.courses.filter((c) => c.id !== action.id),
        cards: db.cards.filter((c) => c.courseId !== action.id),
        questions: db.questions.filter((q) => q.courseId !== action.id),
        exams: db.exams.map((e) => ({ ...e, courseIds: e.courseIds.filter((id) => id !== action.id) })),
      };

    case "addCard":
      return {
        ...db,
        cards: [
          ...db.cards,
          {
            id: newId(),
            courseId: action.courseId,
            question: action.question,
            answer: action.answer,
            ...newCardState,
          },
        ],
      };

    case "updateCard":
      return {
        ...db,
        cards: db.cards.map((c) =>
          c.id === action.id ? { ...c, question: action.question, answer: action.answer } : c,
        ),
      };

    case "deleteCard":
      return { ...db, cards: db.cards.filter((c) => c.id !== action.id) };

    case "reviewCard": {
      const deadlines = deadlineByCourse(db, action.today);
      return {
        ...db,
        cards: db.cards.map((c) =>
          c.id === action.id ? reviewCard(c, action.grade, action.today, deadlines.get(c.courseId)) : c,
        ),
      };
    }

    case "answerQuestion": {
      const q = db.questions.find((x) => x.id === action.id);
      if (!q) return db;
      const correct = action.choiceIndex === q.answerIndex;
      const questions = db.questions.map((x) =>
        x.id === q.id ? { ...x, attempts: x.attempts + 1, lastAnswered: action.today, lastCorrect: correct } : x,
      );
      // A missed question becomes an "error" flashcard, so the mistake gets reviewed until it sticks.
      const hasErrorCard = db.cards.some((c) => c.fromQuestionId === q.id);
      if (correct || hasErrorCard) return { ...db, questions };
      const errorCard: Flashcard = {
        id: newId(),
        courseId: q.courseId,
        section: q.section,
        kind: "erreur",
        emoji: "⚠️",
        question: q.question,
        answer: q.choices[q.answerIndex],
        detail: q.explanation,
        fromQuestionId: q.id,
        ...newCardState,
      };
      return { ...db, questions, cards: [...db.cards, errorCard] };
    }

    case "deleteQuestion":
      return { ...db, questions: db.questions.filter((q) => q.id !== action.id) };

    case "markCourseRead":
      return {
        ...db,
        courses: db.courses.map((c) => {
          if (c.id !== action.courseId) return c;
          const sameDay = c.lastRead?.date === action.today ? c.lastRead.sections : [];
          return {
            ...c,
            sheetReadOn: c.sheetReadOn ?? action.today,
            lastRead: { date: action.today, sections: [...new Set([...sameDay, ...action.sections])].sort((a, b) => a - b) },
          };
        }),
      };

    case "logDay":
      return {
        ...db,
        dayLogs: [...db.dayLogs.filter((l) => l.date !== action.log.date), action.log],
      };

    case "clearDayLog":
      return { ...db, dayLogs: db.dayLogs.filter((l) => l.date !== action.date) };

    case "setDailyMinutes":
      return { ...db, settings: { ...db.settings, dailyMinutes: Math.max(5, Math.min(120, action.minutes)) } };
  }
}
