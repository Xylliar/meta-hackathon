import { newCardState, newId } from "./actions";
import type { StudyMaterial } from "./llm/types";
import type { Course, Flashcard, ID, QuizQuestion } from "./types";

/** Turns the model's output into the course's reading content, flashcards and questions. */
export function materialToItems(
  courseId: ID,
  material: StudyMaterial,
): { course: Pick<Course, "title" | "essentials" | "sections" | "sheet">; cards: Flashcard[]; questions: QuizQuestion[] } {
  return {
    course: { title: material.title, essentials: material.essentials, sections: material.sections, sheet: "" },
    cards: material.flashcards.map((c) => ({
      id: newId(),
      courseId,
      ...c,
      visual: c.visual.kind === "none" ? undefined : c.visual,
      mnemonic: c.mnemonic || undefined,
      example: c.example || undefined,
      ...newCardState,
    })),
    questions: material.questions.map((q) => ({ id: newId(), courseId, ...q, attempts: 0 })),
  };
}
