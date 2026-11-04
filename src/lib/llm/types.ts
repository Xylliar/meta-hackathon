import type { CardKind, CardVisual, CourseSection } from "../types";

export interface CourseImage {
  mimeType: string;
  base64: string;
}

export interface StudyMaterialInput {
  subjectName: string;
  /** Title typed by the student; may be empty, in which case the model proposes one. */
  courseTitle: string;
  images: CourseImage[];
}

export interface GeneratedCard {
  /** Index of the section the card comes from. */
  section: number;
  kind: CardKind;
  emoji: string;
  question: string;
  answer: string;
  keywords: string[];
  visual: CardVisual;
  mnemonic: string;
  example: string;
}

export interface GeneratedQuestion {
  section: number;
  question: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
}

export interface StudyMaterial {
  title: string;
  essentials: string[];
  sections: CourseSection[];
  flashcards: GeneratedCard[];
  questions: GeneratedQuestion[];
}

export interface LlmProvider {
  name: "mock" | "muse";
  generateStudyMaterial(input: StudyMaterialInput): Promise<StudyMaterial>;
}
