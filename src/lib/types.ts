export type ID = string;
/** Local calendar date, formatted YYYY-MM-DD. */
export type ISODate = string;

export interface Subject {
  id: ID;
  name: string;
  color: string;
}

/** A recurring class in the weekly timetable. */
export interface ClassSlot {
  id: ID;
  subjectId: ID;
  /** 1 = Monday … 7 = Sunday */
  weekday: number;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  room?: string;
}

export const BLOCK_TYPES = [
  "text",
  "definition",
  "formula",
  "keypoint",
  "example",
  "warning",
  "list",
  "steps",
  "timeline",
  "compare",
  "quote",
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

/**
 * One block of the course to read. `text` may contain **bold** key terms and
 * ==highlighted== must-know parts. `items` is used by list-like blocks (see the prompt).
 */
export interface CourseBlock {
  type: BlockType;
  title: string;
  text: string;
  items: { label: string; value: string }[];
}

export interface CourseSection {
  title: string;
  blocks: CourseBlock[];
}

/** One scanned lesson, turned into a course to read, flashcards and a quiz. */
export interface Course {
  id: ID;
  subjectId: ID;
  title: string;
  date: ISODate;
  createdAt: string;
  images: string[];
  /** What to remember if there were only 30 seconds. */
  essentials?: string[];
  /** The course restructured for reading. Older courses only have `sheet`. */
  sections?: CourseSection[];
  /** Revision sheet in Markdown, for courses created before `sections` existed. */
  sheet: string;
  /** First day the student read this course. */
  sheetReadOn?: ISODate;
  /** What was read most recently, so the planner doesn't ask for it twice the same day. */
  lastRead?: { date: ISODate; sections: number[] };
  source: "mock" | "muse";
}

/** Card types from the "effective flashcards" method: one notion per card, shaped by what it teaches. */
export const CARD_KINDS = [
  "definition",
  "formule",
  "date",
  "schema",
  "comparaison",
  "oeuvre",
  "citation",
  "vocabulaire",
  "plan",
  "erreur",
] as const;
export type CardKind = (typeof CARD_KINDS)[number];

export const VISUAL_KINDS = ["none", "steps", "timeline", "compare", "formula", "list"] as const;
export type VisualKind = (typeof VISUAL_KINDS)[number];

/**
 * A small diagram drawn on the back of a card.
 * - steps: items are the stages of a process, in order (label only)
 * - timeline: label = date, value = event
 * - compare: first item = the two things compared, then one row per difference
 * - formula: title = the formula, items = its symbols (label) and their meaning (value)
 * - list: items to remember (label, optional value)
 */
export interface CardVisual {
  kind: VisualKind;
  title: string;
  items: { label: string; value: string }[];
}

export interface Flashcard {
  id: ID;
  courseId: ID;
  /** Index of the course section the card comes from (0 for older cards). */
  section?: number;
  question: string;
  answer: string;
  kind?: CardKind;
  emoji?: string;
  /** Words of the answer to highlight. */
  keywords?: string[];
  visual?: CardVisual;
  /** Memory trick, shown as a tip. */
  mnemonic?: string;
  example?: string;
  /** Explanation, used by error cards created from a missed question. */
  detail?: string;
  fromQuestionId?: ID;
  /** Consecutive "I know it" answers (Leitner box). 0 with due = null means never studied. */
  reps: number;
  intervalDays: number;
  due: ISODate | null;
  /** Times the card was not known after having been learned. */
  lapses: number;
  lastReviewed?: ISODate;
  lastGrade?: Grade;
}

/** Multiple-choice question on the course, asked after the flashcards. */
export interface QuizQuestion {
  id: ID;
  courseId: ID;
  section?: number;
  question: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  attempts: number;
  lastAnswered?: ISODate;
  lastCorrect?: boolean;
}

export interface Exam {
  id: ID;
  subjectId: ID;
  title: string;
  date: ISODate;
  courseIds: ID[];
}

export interface DayLog {
  date: ISODate;
  status: "done" | "skipped";
}

export interface Settings {
  dailyMinutes: number;
}

export interface DB {
  subjects: Subject[];
  classes: ClassSlot[];
  courses: Course[];
  cards: Flashcard[];
  questions: QuizQuestion[];
  exams: Exam[];
  dayLogs: DayLog[];
  settings: Settings;
}

/** The student's own verdict after turning a card over. */
export type Grade = "known" | "unknown";

export const emptyDb = (): DB => ({
  subjects: [],
  classes: [],
  courses: [],
  cards: [],
  questions: [],
  exams: [],
  dayLogs: [],
  settings: { dailyMinutes: 15 },
});
