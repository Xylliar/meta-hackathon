"use client";

import {
  BookOpen,
  Camera,
  ChevronDown,
  CircleCheck,
  CircleQuestionMark,
  Image as ImageIcon,
  Layers,
  Plus,
  Sparkles,
  Target,
  Trash,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CourseReader, Essentials } from "@/components/CourseReader";
import { postJson, useData } from "@/components/DataProvider";
import { FlashcardView } from "@/components/Flashcard";
import { Button, Card, Empty, ErrorBanner, ExercisesNote, Field, IconBubble, Input, Loaded, PageHeader, SubjectAvatar } from "@/components/ui";
import { addDays, diffDays, formatShort } from "@/lib/date";
import type { Course, DB, Subject } from "@/lib/types";

export default function CoursesPage() {
  return <Loaded>{(db) => <Courses db={db} />}</Loaded>;
}

function Courses({ db }: { db: DB }) {
  const [prefill, setPrefill] = useState<{ subject: string; nonce: number } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const subjects = db.subjects.filter((s) => db.courses.some((c) => c.subjectId === s.id) || db.exams.some((e) => e.subjectId === s.id));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader title="Mes cours" subtitle="Chaque matière, sa date d'examen et les photos de tes cours." />
      <ErrorBanner />
      <div ref={formRef} className="scroll-mt-20">
        <Composer db={db} prefill={prefill} startOpen={db.courses.length === 0} />
      </div>
      {subjects.length === 0 && <Empty>Aucun cours pour l&apos;instant. Commence par en ajouter un.</Empty>}
      {subjects.map((s) => (
        <SubjectSection
          key={s.id}
          db={db}
          subject={s}
          onAddChapter={() => {
            setPrefill({ subject: s.name, nonce: Date.now() });
            formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      ))}
      <ExercisesNote />
    </div>
  );
}

const LOADING_STEPS = ["Envoi des photos…", "Muse lit tes notes…", "Mise en forme du cours…", "Création des flashcards…", "Préparation du quiz…"];

const nextExamOf = (db: DB, subjectName: string, today: string) => {
  const s = db.subjects.find((x) => x.name.localeCompare(subjectName.trim(), "fr", { sensitivity: "base" }) === 0);
  return s && db.exams.filter((e) => e.subjectId === s.id && e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
};

function Composer({ db, prefill, startOpen }: { db: DB; prefill: { subject: string; nonce: number } | null; startOpen: boolean }) {
  const { setDb, today } = useData();
  const [open, setOpen] = useState(startOpen);
  const [subjectName, setSubjectName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loadingStep, setLoadingStep] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const nextExam = nextExamOf(db, subjectName, today);

  // "Add a chapter" on a subject opens the form with that subject and its next exam.
  const [appliedNonce, setAppliedNonce] = useState<number | null>(null);
  if (prefill && prefill.nonce !== appliedNonce) {
    setAppliedNonce(prefill.nonce);
    setOpen(true);
    setSubjectName(prefill.subject);
    const e = nextExamOf(db, prefill.subject, today);
    if (e) setExamDate(e.date);
  }

  useEffect(() => {
    if (loadingStep === null || loadingStep >= LOADING_STEPS.length - 1) return;
    const t = setTimeout(() => setLoadingStep((s) => (s === null ? null : s + 1)), 6000);
    return () => clearTimeout(t);
  }, [loadingStep]);

  const addFiles = (picked: File[]) => {
    setOpen(true);
    setFiles((prev) => [...prev, ...picked].slice(0, 10));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const form = new FormData();
    form.set("subjectName", subjectName);
    form.set("examDate", examDate);
    form.set("title", title);
    form.set("today", today);
    for (const f of files) form.append("images", f);
    setLoadingStep(0);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/courses", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDb(data.db);
      const course = (data.db as DB).courses.find((c) => c.id === data.courseId);
      const n = (data.db as DB).cards.filter((c) => c.courseId === data.courseId).length;
      const q = (data.db as DB).questions.filter((x) => x.courseId === data.courseId).length;
      setSuccess(`« ${course?.title} » ajouté : ${course?.sections?.length ?? 0} parties de cours, ${n} flashcards et ${q} questions de quiz.`);
      setFiles([]);
      setTitle("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingStep(null);
    }
  }

  const loading = loadingStep !== null;
  const actionClass = "flex items-center justify-center gap-2 rounded-md py-2 text-[15px] font-semibold text-muted hover:bg-sunken cursor-pointer";

  if (!open) {
    return (
      <Card>
        <div className="flex items-center gap-2">
          <span className="ai-gradient grid h-10 w-10 shrink-0 place-items-center rounded-full text-white">
            <Sparkles size={20} />
          </span>
          <button
            onClick={() => setOpen(true)}
            className="h-10 min-w-0 flex-1 truncate rounded-full bg-sunken px-4 text-left text-[15px] text-muted hover:bg-pressed"
          >
            Ajoute un cours : matière, examen, photos…
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 border-t border-line pt-2">
          <PhotoInput camera onPick={addFiles} className={actionClass}>
            <Camera size={20} className="text-[#45bd62]" /> Photo
          </PhotoInput>
          <PhotoInput onPick={addFiles} className={actionClass}>
            <ImageIcon size={20} className="text-accent" /> Galerie
          </PhotoInput>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-bold">Ajouter un cours</h2>
        {db.courses.length > 0 && (
          <button
            onClick={() => setOpen(false)}
            aria-label="Fermer"
            className="grid h-9 w-9 place-items-center rounded-full bg-pressed text-muted hover:bg-pressed-hover"
          >
            <X size={20} />
          </button>
        )}
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Matière">
            <Input
              list="subjects"
              value={subjectName}
              onChange={(e) => {
                setSubjectName(e.target.value);
                const next = nextExamOf(db, e.target.value, today);
                if (next) setExamDate(next.date);
              }}
              placeholder="Ex. : Mathématiques"
              required
            />
            <datalist id="subjects">
              {db.subjects.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </Field>
          <Field label="Date de l'examen ou du contrôle">
            <Input type="date" value={examDate} min={addDays(today, 1)} onChange={(e) => setExamDate(e.target.value)} required />
          </Field>
        </div>
        {nextExam && examDate === nextExam.date && <p className="-mt-2 text-[13px] text-muted">Ce cours sera ajouté à « {nextExam.title} ».</p>}
        <Field label="Nom du chapitre (facultatif)">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sinon, Muse le propose à partir des photos" />
        </Field>

        <div>
          <p className="mb-1.5 text-sm font-semibold text-muted">Photos du cours</p>
          <div className="grid grid-cols-2 gap-2">
            <PhotoInput camera onPick={addFiles} className="flex cursor-pointer flex-col items-center gap-2 rounded-lg bg-sunken p-4 text-center hover:bg-pressed">
              <IconBubble Icon={Camera} color="#45bd62" size={40} />
              <span className="text-[15px] font-semibold">Prendre une photo</span>
            </PhotoInput>
            <PhotoInput onPick={addFiles} className="flex cursor-pointer flex-col items-center gap-2 rounded-lg bg-sunken p-4 text-center hover:bg-pressed">
              <IconBubble Icon={ImageIcon} color="#0866ff" size={40} />
              <span className="text-[15px] font-semibold">Choisir dans la galerie</span>
            </PhotoInput>
          </div>
          <p className="mt-1.5 text-[13px] text-muted">
            {files.length ? `${files.length} photo${files.length > 1 ? "s" : ""} sélectionnée${files.length > 1 ? "s" : ""} · ` : ""}
            JPG, PNG ou WEBP · 10 photos max
          </p>
          <Thumbnails files={files} onRemove={(i) => setFiles(files.filter((_, j) => j !== i))} />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {success && (
          <p className="flex gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <CircleCheck size={18} className="shrink-0" /> {success}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || files.length === 0 || !subjectName.trim() || !examDate}
          className="ai-gradient flex h-11 items-center justify-center gap-2 rounded-md px-4 text-[15px] font-semibold text-white transition-opacity disabled:opacity-40"
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <Sparkles size={18} />
          )}
          {loading ? LOADING_STEPS[loadingStep] : "Générer le cours, les flashcards et le quiz"}
        </button>
        {loading && <p className="-mt-2 text-center text-[13px] text-muted">Compte 20 secondes à 1 minute selon le nombre de photos.</p>}
      </form>
    </Card>
  );
}

/**
 * On phones, `capture` opens the camera directly; without it the browser offers
 * the photo library. Listing exact formats makes iOS convert HEIC photos to JPEG.
 */
function PhotoInput({ camera = false, onPick, className, children }: { camera?: boolean; onPick: (files: File[]) => void; className: string; children: React.ReactNode }) {
  return (
    <label className={className}>
      {children}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture={camera ? "environment" : undefined}
        multiple={!camera}
        className="sr-only"
        onChange={(e) => {
          onPick(Array.from(e.target.files ?? []));
          e.target.value = ""; // so picking the same photo again still triggers onChange
        }}
      />
    </label>
  );
}

function Thumbnails({ files, onRemove }: { files: File[]; onRemove: (index: number) => void }) {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  if (files.length === 0) return null;
  return (
    <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5">
      {urls.map((url, i) => (
        <div key={url} className="relative aspect-square overflow-hidden rounded-lg bg-sunken">
          {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a file not uploaded yet */}
          <img src={url} alt={files[i].name} className="h-full w-full object-cover" />
          <button
            type="button"
            aria-label="Retirer la photo"
            onClick={() => onRemove(i)}
            className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-surface/90 text-ink shadow-card"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function SubjectSection({ db, subject, onAddChapter }: { db: DB; subject: Subject; onAddChapter: () => void }) {
  const { today, dispatch } = useData();
  const exams = db.exams.filter((e) => e.subjectId === subject.id).sort((a, b) => a.date.localeCompare(b.date));
  const courses = db.courses.filter((c) => c.subjectId === subject.id).sort((a, b) => b.date.localeCompare(a.date));
  const cardCount = db.cards.filter((c) => courses.some((x) => x.id === c.courseId)).length;

  return (
    <Card flush className="overflow-hidden">
      <div className="h-16 sm:h-20" style={{ background: `linear-gradient(120deg, ${subject.color}, color-mix(in srgb, ${subject.color} 55%, var(--surface)))` }} />
      <div className="px-4 pb-3">
        <div className="-mt-7 flex items-end justify-between gap-3">
          <span className="rounded-full border-4 border-surface">
            <SubjectAvatar subject={subject} size={56} />
          </span>
          <Button variant="secondary" onClick={onAddChapter}>
            <Plus size={16} strokeWidth={2.6} /> <span>Chapitre</span>
          </Button>
        </div>
        <h2 className="mt-1 text-xl font-bold">{subject.name}</h2>
        <p className="text-[13px] text-muted">
          {courses.length} chapitre{courses.length > 1 ? "s" : ""} · {cardCount} flashcards
        </p>
      </div>

      <div className="flex flex-col border-t border-line px-2 py-1">
        {exams.map((e) => {
          const days = diffDays(today, e.date);
          return (
            <div key={e.id} className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-2 py-2 ${days < 0 ? "opacity-50" : ""}`}>
              <IconBubble Icon={Target} color="#f02849" />
              <span className="min-w-[10rem] flex-1">
                <span className="block font-semibold">{e.title}</span>
                <span className="block text-[13px] text-muted">{days < 0 ? "Passé" : days === 0 ? "Aujourd'hui" : `Dans ${days} jour${days > 1 ? "s" : ""}`}</span>
              </span>
              <span className="ml-12 flex items-center gap-1 sm:ml-0">
                <input
                  type="date"
                  aria-label="Date de l'examen"
                  value={e.date}
                  onChange={(ev) => ev.target.value && dispatch({ type: "updateExam", exam: { ...e, date: ev.target.value } })}
                  className="h-9 rounded-md border border-input bg-surface px-2 text-[13px]"
                />
                <button
                  aria-label="Supprimer l'examen"
                  className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-sunken hover:text-[#e41e3f]"
                  onClick={() => confirm(`Supprimer « ${e.title} » ? Les cours restent.`) && dispatch({ type: "deleteExam", id: e.id })}
                >
                  <Trash size={16} />
                </button>
              </span>
            </div>
          );
        })}
        {exams.length === 0 && <p className="px-2 py-2 text-[15px] text-muted">Pas d&apos;examen prévu.</p>}
      </div>

      <div className="flex flex-col border-t border-line">
        {courses.map((c) => (
          <ChapterItem key={c.id} db={db} course={c} subject={subject} />
        ))}
        {courses.length === 0 && <p className="px-4 py-3 text-[15px] text-muted">Aucun chapitre scanné.</p>}
      </div>
    </Card>
  );
}

function ChapterItem({ db, course, subject }: { db: DB; course: Course; subject: Subject }) {
  const { dispatch, setDb } = useData();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"course" | "cards" | "questions">("course");
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [regenerating, setRegenerating] = useState(false);
  const cards = db.cards.filter((c) => c.courseId === course.id);
  const questions = db.questions.filter((q) => q.courseId === course.id);
  const errors = cards.filter((c) => c.kind === "erreur" && c.fromQuestionId).length;

  const toggle = (id: string) => {
    const next = new Set(flipped);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFlipped(next);
  };
  const tabs: [typeof tab, string, LucideIcon, number?][] = [
    ["course", "Cours", BookOpen],
    ["cards", "Flashcards", Layers, cards.length],
    ["questions", "Quiz", CircleQuestionMark, questions.length],
  ];

  return (
    <div className="border-b border-line last:border-b-0">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-sunken" aria-expanded={open}>
        <IconBubble Icon={BookOpen} color={subject.color} size={40} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{course.title}</span>
          <span className="block truncate text-[13px] text-muted">
            {formatShort(course.date)} · {course.sections?.length ? `${course.sections.length} parties · ` : ""}
            {cards.length} flashcards · {questions.length} quiz
            {errors > 0 && ` · ${errors} erreur${errors > 1 ? "s" : ""} à revoir`}
            {course.source === "mock" && course.images.length > 0 && " · exemple sans IA"}
          </span>
        </span>
        <ChevronDown size={20} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="pb-4">
          <div className="no-scrollbar flex overflow-x-auto border-y border-line px-2">
            {tabs.map(([t, label, Icon, count]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative flex shrink-0 items-center gap-1.5 px-2.5 py-3 text-[15px] font-semibold sm:px-3 ${tab === t ? "text-accent" : "text-muted hover:text-ink"}`}
              >
                <Icon size={17} /> {label}
                {count !== undefined && (
                  <span className={`rounded-full px-1.5 text-xs ${tab === t ? "bg-accent-soft" : "bg-sunken"}`}>{count}</span>
                )}
                {tab === t && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-accent" />}
              </button>
            ))}
          </div>

          <div className="px-4 pt-4">
            {tab === "course" && (
              <div className="flex flex-col gap-6">
                <Essentials course={course} color={subject.color} />
                <CourseReader course={course} color={subject.color} />
              </div>
            )}

            {tab === "cards" &&
              (cards.length === 0 ? (
                <p className="text-[15px] text-muted">Pas de flashcards.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {cards.map((c) => (
                    <div key={c.id} className="relative">
                      <FlashcardView card={c} color={subject.color} flipped={flipped.has(c.id)} onFlip={() => toggle(c.id)} compact />
                      <button
                        aria-label="Supprimer la carte"
                        className="absolute top-3 right-3 grid h-6 w-6 place-items-center rounded-full bg-surface text-muted shadow-card hover:text-[#e41e3f]"
                        onClick={() => dispatch({ type: "deleteCard", id: c.id })}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ))}

            {tab === "questions" &&
              (questions.length === 0 ? (
                <p className="text-[15px] text-muted">Pas de quiz pour ce chapitre. Régénère-le pour en obtenir.</p>
              ) : (
                <ol className="flex flex-col gap-3">
                  {questions.map((q, i) => (
                    <li key={q.id} className="rounded-lg bg-sunken p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold">
                          {i + 1}. {q.question}
                        </p>
                        <button
                          aria-label="Supprimer la question"
                          title="Supprimer cette question (si elle est fausse ou inutile)"
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted hover:bg-pressed hover:text-[#e41e3f]"
                          onClick={() => confirm("Supprimer cette question du quiz ?") && dispatch({ type: "deleteQuestion", id: q.id })}
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                        {q.choices.map((choice, j) => (
                          <li
                            key={j}
                            className={`flex items-start gap-1.5 rounded-md px-2 py-1 ${j === q.answerIndex ? "bg-emerald-50 font-semibold text-emerald-800" : "bg-surface text-muted"}`}
                          >
                            {j === q.answerIndex && <CircleCheck size={15} className="mt-0.5 shrink-0" />}
                            {choice}
                          </li>
                        ))}
                      </ul>
                      {q.explanation && <p className="mt-2 text-[13px] text-muted">{q.explanation}</p>}
                    </li>
                  ))}
                </ol>
              ))}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {course.images.length > 0 && (
                <Button
                  variant="soft"
                  disabled={regenerating}
                  onClick={async () => {
                    if (!confirm("Régénérer le cours, les flashcards et le quiz à partir des photos ? Ta progression sur ce chapitre repart de zéro.")) return;
                    setRegenerating(true);
                    try {
                      setDb((await postJson<{ db: DB }>("/api/courses/regenerate", { courseId: course.id })).db);
                    } catch (err) {
                      alert((err as Error).message);
                    } finally {
                      setRegenerating(false);
                    }
                  }}
                >
                  <Sparkles size={16} /> {regenerating ? "Muse relit tes photos…" : "Régénérer avec Muse"}
                </Button>
              )}
              <Button
                variant="danger"
                onClick={() => confirm(`Supprimer « ${course.title} » et ses flashcards ?`) && dispatch({ type: "deleteCourse", id: course.id })}
              >
                <Trash size={16} /> Supprimer le chapitre
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
