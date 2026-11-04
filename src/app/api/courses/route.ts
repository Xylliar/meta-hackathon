import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ensureSubject, newId } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { getProvider } from "@/lib/llm";
import { materialToItems } from "@/lib/material";
import { updateDb, UPLOADS_DIR } from "@/lib/store";
import type { Course } from "@/lib/types";

const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const fail = (error: string, status = 400) => Response.json({ error }, { status });
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

/**
 * New course: subject + exam date + photos. The subject and the exam are created
 * when they don't exist yet; the photos become a course to read, flashcards and a quiz.
 */
export async function POST(request: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const form = await request.formData();
  const subjectName = String(form.get("subjectName") ?? "").trim();
  const examDate = String(form.get("examDate") ?? "");
  const title = String(form.get("title") ?? "");
  const today = String(form.get("today") ?? "");
  const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);

  if (!subjectName) return fail("Indique la matière.");
  if (!isDate(examDate)) return fail("Indique la date de l'examen.");
  if (!isDate(today)) return fail("Date du jour invalide.");
  if (files.length === 0) return fail("Ajoute au moins une photo du cours.");
  if (files.length > MAX_IMAGES) return fail(`${MAX_IMAGES} photos maximum par cours.`);
  for (const f of files) {
    if (!EXTENSIONS[f.type]) return fail(`Format non pris en charge (JPG, PNG ou WEBP) : ${f.name}`);
    if (f.size > MAX_IMAGE_BYTES) return fail(`Photo trop lourde (10 Mo max) : ${f.name}`);
  }

  const courseId = newId();
  await mkdir(UPLOADS_DIR, { recursive: true });
  const images = await Promise.all(
    files.map(async (f, i) => {
      const buffer = Buffer.from(await f.arrayBuffer());
      const name = `${courseId}-${i + 1}.${EXTENSIONS[f.type]}`;
      await writeFile(path.join(UPLOADS_DIR, name), buffer);
      return { name, mimeType: f.type, base64: buffer.toString("base64") };
    }),
  );

  const provider = getProvider();
  let material;
  try {
    material = await provider.generateStudyMaterial({ subjectName, courseTitle: title, images });
  } catch (err) {
    return fail(`La génération a échoué : ${(err as Error).message}`, 502);
  }

  const db = await updateDb(user.id, (current) => {
    const { db, subject } = ensureSubject(current, subjectName);
    const { course: content, cards, questions } = materialToItems(courseId, material);
    const course: Course = {
      id: courseId,
      subjectId: subject.id,
      date: today,
      createdAt: new Date().toISOString(),
      images: images.map((i) => i.name),
      source: provider.name,
      ...content,
    };
    const exam = db.exams.find((e) => e.subjectId === subject.id && e.date === examDate);
    const exams = exam
      ? db.exams.map((e) => (e.id === exam.id ? { ...e, courseIds: [...e.courseIds, courseId] } : e))
      : [...db.exams, { id: newId(), subjectId: subject.id, title: `Examen de ${subject.name}`, date: examDate, courseIds: [courseId] }];

    return {
      ...db,
      courses: [...db.courses, course],
      cards: [...db.cards, ...cards],
      questions: [...db.questions, ...questions],
      exams,
    };
  });
  return Response.json({ db, courseId });
}
