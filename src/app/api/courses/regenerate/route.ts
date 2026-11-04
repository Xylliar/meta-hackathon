import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireUser } from "@/lib/auth";
import { getProvider } from "@/lib/llm";
import { materialToItems } from "@/lib/material";
import { readDb, updateDb, UPLOADS_DIR } from "@/lib/store";

const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

/** Re-reads a course's stored photos and replaces its reading content, flashcards and questions. */
export async function POST(request: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const { courseId } = (await request.json()) as { courseId: string };
  const db = await readDb(user.id);
  const course = db.courses.find((c) => c.id === courseId);
  if (!course) return Response.json({ error: "Cours introuvable." }, { status: 404 });
  if (course.images.length === 0) return Response.json({ error: "Ce cours n'a pas de photos." }, { status: 400 });

  const subjectName = db.subjects.find((s) => s.id === course.subjectId)?.name ?? "";
  const images = await Promise.all(
    course.images.map(async (name) => ({
      mimeType: MIME[name.split(".").pop() ?? ""] ?? "image/jpeg",
      base64: (await readFile(path.join(UPLOADS_DIR, path.basename(name)))).toString("base64"),
    })),
  );

  const provider = getProvider();
  let material;
  try {
    material = await provider.generateStudyMaterial({ subjectName, courseTitle: course.title, images });
  } catch (err) {
    return Response.json({ error: `La génération a échoué : ${(err as Error).message}` }, { status: 502 });
  }

  const { course: content, cards, questions } = materialToItems(courseId, material);
  const next = await updateDb(user.id, (db) => ({
    ...db,
    courses: db.courses.map((c) =>
      c.id === courseId ? { ...c, ...content, sheetReadOn: undefined, lastRead: undefined, source: provider.name } : c,
    ),
    // Error cards stay: they record the student's own mistakes.
    cards: [...db.cards.filter((c) => c.courseId !== courseId || (c.kind === "erreur" && c.fromQuestionId)), ...cards],
    questions: [...db.questions.filter((q) => q.courseId !== courseId), ...questions],
  }));
  return Response.json({ db: next });
}
