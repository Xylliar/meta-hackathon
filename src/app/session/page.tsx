"use client";

import {
  ArrowRight,
  BookOpen,
  Check,
  CircleCheck,
  CircleQuestionMark,
  Eye,
  Layers,
  PartyPopper,
  RotateCcw,
  Sparkles,
  Target,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CourseReader, Essentials } from "@/components/CourseReader";
import { useData } from "@/components/DataProvider";
import { FlashcardView } from "@/components/Flashcard";
import { Button, ButtonLink, Card, Empty, ExercisesNote, IconBubble, Loaded, Progress, SubjectChip } from "@/components/ui";
import { deadlineByCourse, sectionMinutes, type PlanDay } from "@/lib/scheduler";
import { knownDelay } from "@/lib/srs";
import type { DB, ID, ISODate } from "@/lib/types";

type Step =
  | { kind: "read"; courseId: ID; sections: number[] }
  | { kind: "card"; cardId: ID; isNew: boolean; retry: number }
  | { kind: "question"; questionId: ID };

/** A card not known comes back after this many other cards, until it is known. */
const RETRY_GAP = 3;

export default function SessionPage() {
  return <Loaded>{(db) => <SessionGate db={db} />}</Loaded>;
}

function SessionGate({ db }: { db: DB }) {
  const { plan, today } = useData();
  // The plan is recomputed after every answer (and today gets logged at the end),
  // so the session works from a snapshot of the day taken when it starts. The
  // snapshot is keyed by date because Next keeps this page's state between visits.
  const [snapshot, setSnapshot] = useState<{ date: ISODate; day: PlanDay } | null>(null);
  const first = plan?.days[0];
  const log = db.dayLogs.find((l) => l.date === today);
  if (!log && first?.date === today && first.minutes > 0 && snapshot?.date !== today) {
    setSnapshot({ date: today, day: first });
  }

  if (snapshot?.date === today) return <SessionRunner key={today} db={db} day={snapshot.day} />;
  return (
    <div className="mx-auto max-w-xl">
      <Empty>
        {log?.status === "done" ? "Révision du jour déjà faite, bravo !" : "Pas de révision à faire maintenant."}{" "}
        <Link href="/" className="font-medium text-accent">
          Retour à l&apos;accueil
        </Link>
      </Empty>
    </div>
  );
}

/** 1. read the course, 2. flashcards (not-known-last-time first, then new ones), 3. quiz. */
function buildSteps(db: DB, day: PlanDay): Step[] {
  const cards = new Map(db.cards.map((c) => [c.id, c]));
  const courseOrder = day.reading.map((t) => t.courseId);
  const rank = (id: ID) => {
    const c = cards.get(id);
    const course = c ? courseOrder.indexOf(c.courseId) : -1;
    return (course === -1 ? 99 : course) * 1000 + (c?.section ?? 0);
  };
  const reviews = [...day.reviews].sort((a, b) => Number(cards.get(b)?.lastGrade === "unknown") - Number(cards.get(a)?.lastGrade === "unknown"));
  const fresh = [...day.newCards].sort((a, b) => rank(a) - rank(b));
  return [
    ...day.reading.map((t): Step => ({ kind: "read", courseId: t.courseId, sections: t.sections })),
    ...reviews.map((cardId): Step => ({ kind: "card", cardId, isNew: false, retry: 0 })),
    ...fresh.map((cardId): Step => ({ kind: "card", cardId, isNew: true, retry: 0 })),
    ...day.questions.map((questionId): Step => ({ kind: "question", questionId })),
  ];
}

function SessionRunner({ db, day }: { db: DB; day: PlanDay }) {
  const { dispatch, today } = useData();
  const [steps, setSteps] = useState<Step[]>(() => buildSteps(db, day));
  const [total] = useState(steps.length);
  const [doneCount, setDoneCount] = useState(0);
  const [stats, setStats] = useState({ read: 0, firstTry: 0, learned: 0, retries: 0, quizRight: 0, quizTotal: 0 });
  const [quizStarted, setQuizStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  // Bumped on every step so a re-queued card is shown fresh (front side up).
  const [turn, setTurn] = useState(0);

  const advance = async (requeue?: Step) => {
    setTurn((t) => t + 1);
    const rest = steps.slice(1);
    if (requeue) {
      // Back a few cards later, but always before the quiz.
      const lastCard = rest.findLastIndex((s) => s.kind === "card");
      rest.splice(Math.min(RETRY_GAP, lastCard + 1), 0, requeue);
    } else setDoneCount((n) => n + 1);
    setSteps(rest);
    if (rest.length === 0) {
      setFinished(true);
      await dispatch({ type: "logDay", log: { date: today, status: "done" } });
    }
  };

  if (finished) return <Summary stats={stats} />;

  const step = steps[0];
  const allPhases: { id: Step["kind"]; label: string; Icon: LucideIcon; count: number }[] = [
    { id: "read", label: "Lire", Icon: BookOpen, count: day.reading.length },
    { id: "card", label: "Flashcards", Icon: Layers, count: day.reviews.length + day.newCards.length },
    { id: "question", label: "Quiz", Icon: CircleQuestionMark, count: day.questions.length },
  ];
  const phases = allPhases.filter((p) => p.count > 0);
  const current = phases.findIndex((p) => p.id === step.kind);
  const showQuizIntro = step.kind === "question" && !quizStarted && phases.length > 1;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href="/" aria-label="Quitter la séance" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pressed text-ink hover:bg-pressed-hover">
          <X size={20} />
        </Link>
        <Progress value={total ? doneCount / total : 0} />
        <span className="shrink-0 text-[13px] font-semibold text-muted">
          {doneCount}/{total}
        </span>
      </div>

      <ol className="flex gap-2 text-[13px] font-semibold">
        {phases.map((p, i) => (
          <li
            key={p.id}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 ${
              i < current ? "bg-emerald-50 text-[#31a24c]" : i === current ? "bg-accent text-white" : "bg-surface text-muted shadow-card"
            }`}
          >
            {i < current ? <Check size={15} strokeWidth={3} /> : <p.Icon size={15} />} {p.label}
          </li>
        ))}
      </ol>

      {showQuizIntro ? (
        <Card className="flex flex-col items-center py-8 text-center">
          <IconBubble Icon={CircleCheck} color="#31a24c" size={64} />
          <h2 className="mt-3 text-xl font-bold">Flashcards terminées !</h2>
          <p className="mt-1 text-[15px] text-muted">
            Place à {day.questions.length} question{day.questions.length > 1 ? "s" : ""} de quiz pour vérifier que tu as compris.
          </p>
          <Button className="mt-5 h-10 px-6" onClick={() => setQuizStarted(true)}>
            C&apos;est parti <ArrowRight size={18} />
          </Button>
        </Card>
      ) : step.kind === "read" ? (
        <ReadStep
          key={`r-${turn}`}
          db={db}
          courseId={step.courseId}
          sections={step.sections}
          onRead={async () => {
            setStats((s) => ({ ...s, read: s.read + 1 }));
            await dispatch({ type: "markCourseRead", courseId: step.courseId, sections: step.sections, today });
            await advance();
          }}
        />
      ) : step.kind === "card" ? (
        <CardStep
          key={`c-${turn}`}
          db={db}
          step={step}
          onAnswer={async (known) => {
            if (known) {
              setStats((s) => (step.retry ? { ...s, learned: s.learned + 1 } : { ...s, firstTry: s.firstTry + 1 }));
              // A card already missed this session is scheduled for tomorrow: knowing it now doesn't change that.
              if (step.retry === 0) await dispatch({ type: "reviewCard", id: step.cardId, grade: "known", today });
              await advance();
            } else {
              setStats((s) => ({ ...s, retries: s.retries + 1 }));
              if (step.retry === 0) await dispatch({ type: "reviewCard", id: step.cardId, grade: "unknown", today });
              await advance({ ...step, retry: step.retry + 1 });
            }
          }}
        />
      ) : (
        <QuestionStep
          key={`q-${turn}`}
          db={db}
          questionId={step.questionId}
          isLast={steps.length === 1}
          onAnswer={async (choiceIndex, right) => {
            setStats((s) => ({ ...s, quizRight: s.quizRight + Number(right), quizTotal: s.quizTotal + 1 }));
            await dispatch({ type: "answerQuestion", id: step.questionId, choiceIndex, today });
          }}
          onNext={() => advance()}
        />
      )}
    </div>
  );
}

function ReadStep({ db, courseId, sections, onRead }: { db: DB; courseId: ID; sections: number[]; onRead: () => void }) {
  const [showAll, setShowAll] = useState(false);
  const course = db.courses.find((c) => c.id === courseId);
  const subject = course && db.subjects.find((s) => s.id === course.subjectId);
  if (!course) return null;
  const color = subject?.color ?? "#0866ff";
  const recap = sections.length === 0;
  const minutes = sections.reduce((sum, i) => sum + sectionMinutes(course, i), 0);
  const partLabel = recap
    ? "Petit rappel avant les flashcards"
    : sections.length === (course.sections?.length ?? 1)
      ? "Tout le chapitre"
      : `Partie${sections.length > 1 ? "s" : ""} ${sections.map((s) => s + 1).join(", ")} sur ${course.sections?.length ?? 1}`;

  return (
    <Card>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[13px] font-bold text-accent">
          <BookOpen size={15} /> Lire le cours
        </p>
        <SubjectChip subjectId={course.subjectId} db={db} />
      </div>
      <h2 className="text-xl font-bold">{course.title}</h2>
      <p className="mb-5 text-[15px] text-muted">
        {partLabel}
        {!recap && ` · environ ${Math.ceil(minutes)} min`}
      </p>

      <div className="flex flex-col gap-6">
        <Essentials course={course} color={color} />
        {(!recap || showAll) && <CourseReader course={course} color={color} sections={showAll ? undefined : sections} />}
        {recap && Boolean(course.sections?.length) && (
          <Button variant="soft" className="self-start" onClick={() => setShowAll(!showAll)}>
            <BookOpen size={16} /> {showAll ? "Masquer le cours" : "Relire tout le cours"}
          </Button>
        )}
      </div>

      <Button className="mt-6 h-11 w-full" onClick={onRead}>
        {recap ? "C'est bon, aux flashcards" : "J'ai lu, place aux flashcards"} <ArrowRight size={18} />
      </Button>
    </Card>
  );
}

function CardStep({ db, step, onAnswer }: { db: DB; step: Extract<Step, { kind: "card" }>; onAnswer: (known: boolean) => void }) {
  const { today } = useData();
  const [flipped, setFlipped] = useState(false);
  const card = db.cards.find((c) => c.id === step.cardId);
  const course = card && db.courses.find((c) => c.id === card.courseId);
  const subject = course && db.subjects.find((s) => s.id === course.subjectId);
  const deadline = useMemo(() => (card ? deadlineByCourse(db, today).get(card.courseId) : undefined), [db, today, card]);
  if (!card || !course) return null;

  const delay = step.retry ? 1 : knownDelay(card, today, deadline);
  const [LabelIcon, label, tone] = step.retry
    ? [RotateCcw, `On la revoit (${step.retry + 1}e passage)`, "text-amber-700"]
    : step.isNew
      ? [Sparkles, "Nouvelle carte", "text-[#31a24c]"]
      : card.lastGrade === "unknown"
        ? [Target, "Pas sue la dernière fois", "text-[#e41e3f]"]
        : [RotateCcw, "Révision", "text-accent"];

  return (
    <div className="flex flex-col gap-3">
      <p className={`flex items-center justify-center gap-1.5 text-center text-[13px] font-bold ${tone}`}>
        <LabelIcon size={15} /> {label} <span className="font-normal text-muted">· {course.title}</span>
      </p>
      <FlashcardView card={card} color={subject?.color ?? "#0866ff"} subjectName={subject?.name} flipped={flipped} onFlip={() => setFlipped(!flipped)} />
      {!flipped ? (
        <Button className="h-11 w-full" onClick={() => setFlipped(true)}>
          <Eye size={18} /> Voir la réponse
        </Button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onAnswer(false)}
            className="flex flex-col items-center gap-1 rounded-lg bg-surface px-3 py-3 shadow-card transition hover:bg-red-50"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e41e3f] text-white">
              <X size={20} strokeWidth={3} />
            </span>
            <span className="font-bold text-negative-ink">Je ne connais pas</span>
            <span className="text-xs text-muted">On la revoit tout de suite</span>
          </button>
          <button
            onClick={() => onAnswer(true)}
            className="flex flex-col items-center gap-1 rounded-lg bg-surface px-3 py-3 shadow-card transition hover:bg-emerald-50"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#31a24c] text-white">
              <Check size={20} strokeWidth={3} />
            </span>
            <span className="font-bold text-positive-ink">Je connais</span>
            <span className="text-xs text-muted">Revient {delay <= 1 ? "demain" : `dans ${delay} jours`}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function QuestionStep({
  db,
  questionId,
  isLast,
  onAnswer,
  onNext,
}: {
  db: DB;
  questionId: ID;
  isLast: boolean;
  onAnswer: (choiceIndex: number, right: boolean) => void;
  onNext: () => void;
}) {
  const [chosen, setChosen] = useState<number | null>(null);
  const q = db.questions.find((x) => x.id === questionId);
  const course = q && db.courses.find((c) => c.id === q.courseId);
  if (!q || !course) return null;
  const answered = chosen !== null;
  const right = chosen === q.answerIndex;

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[13px] font-bold text-[#8b5cf6]">
          <CircleQuestionMark size={15} /> Quiz
        </p>
        <SubjectChip subjectId={course.subjectId} db={db} />
      </div>
      <p className="text-lg font-semibold">{q.question}</p>
      <ul className="mt-4 flex flex-col gap-2">
        {q.choices.map((choice, i) => {
          const state = !answered ? "idle" : i === q.answerIndex ? "right" : i === chosen ? "wrong" : "other";
          return (
            <li key={i}>
              <button
                disabled={answered}
                onClick={() => {
                  setChosen(i);
                  onAnswer(i, i === q.answerIndex);
                }}
                className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-[15px] transition ${
                  state === "idle"
                    ? "border-input hover:border-accent hover:bg-accent-soft"
                    : state === "right"
                      ? "border-emerald-400 bg-emerald-50 font-medium text-emerald-900"
                      : state === "wrong"
                        ? "border-red-300 bg-red-50 text-red-900"
                        : "border-line opacity-50"
                }`}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    state === "right" ? "bg-[#31a24c] text-white" : state === "wrong" ? "bg-[#e41e3f] text-white" : "bg-pressed"
                  }`}
                >
                  {state === "right" ? <Check size={15} strokeWidth={3} /> : state === "wrong" ? <X size={15} strokeWidth={3} /> : String.fromCharCode(65 + i)}
                </span>
                {choice}
              </button>
            </li>
          );
        })}
      </ul>

      {answered && (
        <div className="mt-4 flex flex-col gap-3">
          <div className={`rounded-lg px-4 py-3 text-sm ${right ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
            <p className="flex items-center gap-1.5 font-bold">
              {right ? <CircleCheck size={17} /> : <TriangleAlert size={17} />} {right ? "Bonne réponse !" : "Pas tout à fait."}
            </p>
            {q.explanation && <p className="mt-1">{q.explanation}</p>}
            {!right && <p className="mt-2 text-xs">Cette erreur devient une flashcard, et la question reviendra demain.</p>}
          </div>
          <Button className="h-10" onClick={onNext}>
            {isLast ? "Terminer la séance" : "Question suivante"} <ArrowRight size={18} />
          </Button>
        </div>
      )}
    </Card>
  );
}

function Summary({ stats }: { stats: { read: number; firstTry: number; learned: number; retries: number; quizRight: number; quizTotal: number } }) {
  const cards = stats.firstTry + stats.learned;
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Card className="flex flex-col items-center py-8 text-center">
        <span className="ai-gradient grid h-16 w-16 place-items-center rounded-full text-white">
          <PartyPopper size={30} />
        </span>
        <h1 className="mt-3 text-2xl font-bold">Révision du jour terminée !</h1>
        <div className="mt-5 grid w-full gap-2 text-left sm:grid-cols-3">
          <div className="rounded-lg bg-sunken p-3">
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-muted">
              <BookOpen size={14} /> Cours
            </p>
            <p className="mt-1 text-sm">
              {stats.read} lecture{stats.read > 1 ? "s" : ""}
            </p>
          </div>
          <div className="rounded-lg bg-sunken p-3">
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-muted">
              <Layers size={14} /> Flashcards
            </p>
            <p className="mt-1 text-sm">{cards ? `${stats.firstTry}/${cards} sues du premier coup` : "Aucune"}</p>
            {stats.learned > 0 && (
              <p className="text-xs text-muted">
                {stats.learned} apprise{stats.learned > 1 ? "s" : ""} pendant la séance, à revoir demain
              </p>
            )}
          </div>
          <div className="rounded-lg bg-sunken p-3">
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-muted">
              <CircleQuestionMark size={14} /> Quiz
            </p>
            <p className="mt-1 text-sm">{stats.quizTotal ? `${stats.quizRight}/${stats.quizTotal} bonnes réponses` : "Aucun aujourd'hui"}</p>
          </div>
        </div>
        <ButtonLink href="/" className="mt-5 h-10 px-6">
          Retour à l&apos;accueil
        </ButtonLink>
      </Card>
      <ExercisesNote />
    </div>
  );
}
