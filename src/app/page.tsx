"use client";

import {
  BookOpen,
  Brain,
  CalendarDays,
  Camera,
  CircleCheck,
  CircleQuestionMark,
  Clock,
  FastForward,
  Flame,
  Layers,
  MapPin,
  Moon,
  Play,
  Plus,
  RotateCcw,
  Target,
  Timer,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { postJson, useData } from "@/components/DataProvider";
import { NAV_LINKS } from "@/components/Nav";
import { Button, ButtonLink, Card, CardTitle, ErrorBanner, ExercisesNote, IconBubble, Loaded, Progress, SubjectAvatar } from "@/components/ui";
import { addDays, diffDays, formatLong, formatShort, weekdayOf } from "@/lib/date";
import { isMastered, streak, todayProgress } from "@/lib/progress";
import type { ExamReport } from "@/lib/scheduler";
import type { DB } from "@/lib/types";

export default function HomePage() {
  return <Loaded>{(db) => <Home db={db} />}</Loaded>;
}

function Home({ db }: { db: DB }) {
  const { plan } = useData();
  if (!plan) return null;
  if (db.courses.length === 0 && db.exams.length === 0) return <Onboarding />;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[240px_minmax(0,1fr)_300px]">
      <LeftRail db={db} />

      <div className="flex min-w-0 flex-col gap-4">
        <ErrorBanner />
        <ExamStories db={db} reports={plan.exams} />
        <TodayCard db={db} />
        {plan.exams.map((r) => (
          <ExamPost key={r.examId} db={db} report={r} />
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <ProgressCard db={db} />
        <TodayClasses db={db} />
        <ExercisesNote />
        <DemoTools />
      </div>
    </div>
  );
}

function LeftRail({ db }: { db: DB }) {
  const subjects = db.subjects.filter((s) => db.courses.some((c) => c.subjectId === s.id));
  return (
    <nav className="sticky top-[72px] hidden flex-col gap-0.5 xl:flex" aria-label="Raccourcis">
      {NAV_LINKS.map(({ href, label, Icon, color }) => (
        <Link key={href} href={href} className="flex items-center gap-3 rounded-lg px-2 py-2 text-[15px] font-semibold hover:bg-pressed">
          <IconBubble Icon={Icon} color={color} />
          {label}
        </Link>
      ))}
      {subjects.length > 0 && (
        <>
          <hr className="mx-2 my-2 border-line" />
          <p className="px-2 pb-1 text-[15px] font-semibold text-muted">Tes matières</p>
          {subjects.map((s) => (
            <Link key={s.id} href="/cours" className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-pressed">
              <SubjectAvatar subject={s} size={36} />
              <span className="truncate text-[15px] font-semibold">{s.name}</span>
            </Link>
          ))}
        </>
      )}
    </nav>
  );
}

/** Upcoming exams as "stories": countdown, and a ring around the avatar that fills as the exam is mastered. */
function ExamStories({ db, reports }: { db: DB; reports: ExamReport[] }) {
  const { today } = useData();
  const tile = "relative h-48 w-[7.25rem] shrink-0 snap-start overflow-hidden rounded-lg shadow-card sm:h-52 sm:w-32";

  return (
    <div className="no-scrollbar -mx-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 py-0.5 sm:mx-0 sm:px-0.5">
      <Link href="/cours" className={`${tile} flex flex-col bg-surface`}>
        <div className="grid h-[68%] place-items-center bg-accent-soft text-accent">
          <BookOpen size={44} strokeWidth={1.6} />
        </div>
        <span className="absolute top-[68%] left-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-surface bg-accent text-white">
          <Plus size={20} strokeWidth={3} />
        </span>
        <p className="mt-auto px-1.5 pb-2.5 text-center text-xs leading-tight font-semibold sm:text-[13px]">Ajouter un cours</p>
      </Link>

      {reports.map((r) => {
        const exam = db.exams.find((e) => e.id === r.examId)!;
        const subject = db.subjects.find((s) => s.id === exam.subjectId);
        const color = subject?.color ?? "#65676b";
        const days = diffDays(today, exam.date);
        const pct = Math.round(r.readiness * 100);
        return (
          <Link
            key={r.examId}
            href="/cours"
            className={`${tile} text-white`}
            style={{ background: `linear-gradient(160deg, ${color} 0%, color-mix(in srgb, ${color} 50%, black) 100%)` }}
          >
            <span
              className="absolute top-2 left-2 grid h-10 w-10 place-items-center rounded-full"
              style={{ background: `conic-gradient(#fff ${pct * 3.6}deg, rgba(255,255,255,0.35) 0)` }}
              title={`${pct} % maîtrisé`}
            >
              <span className="grid h-[34px] w-[34px] place-items-center rounded-full text-sm font-bold" style={{ background: color }}>
                {subject?.name.charAt(0).toUpperCase()}
              </span>
            </span>
            <span className="absolute inset-0 grid place-items-center text-[34px] font-black tracking-tight drop-shadow">
              {days === 0 ? "Auj." : `J-${days}`}
            </span>
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pt-8 pb-2">
              <span className="line-clamp-2 text-[13px] leading-tight font-semibold">{exam.title}</span>
              <span className="text-[11px] opacity-90">{pct} % maîtrisé</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function TodayCard({ db }: { db: DB }) {
  const { plan, today, dispatch } = useData();
  const progress = todayProgress(db, plan!, today);
  const tomorrow = plan!.days.find((d) => d.date === addDays(today, 1));
  const day = progress.day;
  const cards = day ? day.reviews.length + day.newCards.length : 0;
  const questions = day?.questions.length ?? 0;
  const days = streak(db, today);

  const header = (
    <div className="flex items-center gap-3">
      <span className="ai-gradient grid h-10 w-10 shrink-0 place-items-center rounded-full text-white">
        <Timer size={22} strokeWidth={2.3} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Révision du jour</p>
        <p className="text-[13px] text-muted capitalize">{formatLong(today)}</p>
      </div>
      {days > 0 && (
        <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-600" title="Jours de suite">
          <Flame size={14} fill="currentColor" /> {days} j
        </span>
      )}
    </div>
  );

  if (progress.status === "skipped") {
    return (
      <Card>
        {header}
        <div className="mt-4 flex gap-3">
          <IconBubble Icon={Moon} color="#8b5cf6" />
          <div>
            <p className="font-semibold">Pas de souci, on a réorganisé ton planning</p>
            <p className="mt-0.5 text-[15px] text-muted">
              Le travail d&apos;aujourd&apos;hui est réparti sur les jours qui restent.
              {tomorrow && ` Demain : environ ${Math.ceil(tomorrow.minutes)} min.`}
            </p>
          </div>
        </div>
        <Button variant="secondary" className="mt-4 w-full sm:w-auto" onClick={() => dispatch({ type: "clearDayLog", date: today })}>
          <RotateCcw size={16} /> Finalement, je peux réviser aujourd&apos;hui
        </Button>
      </Card>
    );
  }

  if (progress.status === "done" || progress.status === "empty") {
    const done = progress.status === "done";
    return (
      <Card>
        {header}
        <div className="mt-4 flex gap-3">
          <IconBubble Icon={done ? CircleCheck : CalendarDays} color={done ? "#31a24c" : "#0866ff"} />
          <div>
            <p className="font-semibold">{done ? "Révision terminée, bravo !" : "Rien à réviser aujourd'hui"}</p>
            <p className="mt-0.5 text-[15px] text-muted">
              {done
                ? tomorrow
                  ? `Prochaine séance demain, environ ${Math.ceil(tomorrow.minutes)} min.`
                  : "Ton planning est à jour."
                : db.exams.length
                  ? "Ton planning est à jour, profite de ta journée."
                  : "Ajoute un cours avec sa date d'examen pour démarrer."}
            </p>
          </div>
        </div>
        {done && <Progress value={1} color="#31a24c" className="mt-4" />}
      </Card>
    );
  }

  const steps = [
    {
      Icon: BookOpen,
      color: "#0866ff",
      title: "Lire le cours",
      detail: day!.reading.length
        ? `${day!.reading.some((t) => t.sections.length) ? "Nouvelles parties" : "Rappel express"} · ${day!.reading.length} cours`
        : "Rien de nouveau",
    },
    {
      Icon: Layers,
      color: "#31a24c",
      title: "Flashcards",
      detail: `${cards} carte${cards > 1 ? "s" : ""}${day!.newCards.length ? ` dont ${day!.newCards.length} nouvelle${day!.newCards.length > 1 ? "s" : ""}` : ""}`,
    },
    { Icon: CircleQuestionMark, color: "#8b5cf6", title: "Quiz", detail: questions ? `${questions} question${questions > 1 ? "s" : ""}` : "Aucun aujourd'hui" },
  ];

  return (
    <Card>
      {header}
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-[28px] leading-none font-bold">
          {Math.ceil(day!.minutes)} min <span className="text-[15px] font-normal text-muted">pour aujourd&apos;hui</span>
        </p>
        <span className="text-sm font-bold text-accent">{Math.round(progress.ratio * 100)} %</span>
      </div>
      <Progress value={progress.ratio} className="mt-3" />
      <p className="mt-1.5 text-[13px] text-muted">
        {progress.done} étape{progress.done > 1 ? "s" : ""} faite{progress.done > 1 ? "s" : ""} sur {progress.total}
      </p>

      <ol className="mt-3 grid gap-1 sm:grid-cols-3 sm:gap-2">
        {steps.map((s, i) => (
          <li key={s.title} className="flex items-center gap-3 rounded-lg py-1.5 sm:bg-sunken sm:p-2.5">
            <IconBubble Icon={s.Icon} color={s.color} />
            <span className="min-w-0 text-sm">
              <span className="block font-semibold">
                {i + 1}. {s.title}
              </span>
              <span className="block truncate text-[13px] text-muted">{s.detail}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-[1fr_auto]">
        <ButtonLink href="/session" className="h-10 w-full">
          <Play size={16} fill="currentColor" />
          {progress.status === "started" ? "Continuer la révision" : "Commencer la révision"}
        </ButtonLink>
        <Button variant="secondary" className="h-10" onClick={() => dispatch({ type: "logDay", log: { date: today, status: "skipped" } })}>
          <Moon size={16} /> Pas aujourd&apos;hui
        </Button>
      </div>
    </Card>
  );
}

function ExamPost({ db, report }: { db: DB; report: ExamReport }) {
  const { today, dispatch } = useData();
  const exam = db.exams.find((e) => e.id === report.examId)!;
  const subject = db.subjects.find((s) => s.id === exam.subjectId);
  const color = subject?.color ?? "#65676b";
  const days = diffDays(today, exam.date);
  const questions = db.questions.filter((q) => exam.courseIds.includes(q.courseId)).length;
  const pct = Math.round(report.readiness * 100);
  const action = "flex items-center justify-center gap-2 rounded-md py-2 text-[15px] font-semibold text-muted hover:bg-sunken";

  return (
    <Card flush>
      <div className="flex items-start gap-3 p-4 pb-3">
        <SubjectAvatar subject={subject} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{exam.title}</p>
          <p className="flex items-center gap-1 text-[13px] text-muted">
            <CalendarDays size={13} className="shrink-0" />
            <span className="truncate">
              <span className="capitalize">{formatShort(exam.date)}</span> · {subject?.name}
            </span>
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-sm font-bold"
          style={{ color: `color-mix(in srgb, ${color} 80%, var(--ink))`, background: `color-mix(in srgb, ${color} 14%, var(--surface))` }}
        >
          {days === 0 ? "Aujourd'hui" : `J-${days}`}
        </span>
      </div>

      <div className="px-4 pb-3">
        <div className="flex items-baseline justify-between text-[13px]">
          <span className="font-semibold">Maîtrise</span>
          <span className="text-muted">{pct} %</span>
        </div>
        <Progress value={report.readiness} color={color} className="mt-1" />
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
          <span className="flex items-center gap-1">
            <BookOpen size={14} /> {exam.courseIds.length} chapitre{exam.courseIds.length > 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <Layers size={14} /> {report.totalCards} cartes
          </span>
          <span className="flex items-center gap-1">
            <CircleQuestionMark size={14} /> {questions} questions
          </span>
        </div>

        {report.status === "late" && (
          <div className="mt-3 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            <p>
              Ça ne rentre pas en {db.settings.dailyMinutes} min/jour : {report.unscheduledItems} carte{report.unscheduledItems > 1 ? "s" : ""} ne
              seront pas vues avant l&apos;examen.{" "}
              {report.extraMinutesPerDay !== null && (
                <button
                  className="font-semibold underline"
                  onClick={() => dispatch({ type: "setDailyMinutes", minutes: db.settings.dailyMinutes + report.extraMinutesPerDay! })}
                >
                  Passer à {db.settings.dailyMinutes + report.extraMinutesPerDay} min/jour
                </button>
              )}
            </p>
          </div>
        )}
        {report.status === "empty" && <p className="mt-3 text-[13px] text-amber-800">Aucun cours scanné pour cet examen.</p>}
        {report.status === "today" && <p className="mt-3 text-[13px] font-semibold text-[#31a24c]">C&apos;est aujourd&apos;hui, bonne chance !</p>}
      </div>

      <div className="mx-4 grid grid-cols-2 border-t border-line py-1">
        <Link href="/cours" className={action}>
          <BookOpen size={18} /> Voir le cours
        </Link>
        <Link href="/cours" className={action}>
          <Camera size={18} /> <span className="sm:hidden">Photos</span>
          <span className="hidden sm:inline">Ajouter des photos</span>
        </Link>
      </div>
    </Card>
  );
}

function ProgressCard({ db }: { db: DB }) {
  const { plan, today } = useData();
  const next = plan?.exams[0] && db.exams.find((e) => e.id === plan.exams[0].examId);
  const rows = [
    { Icon: Flame, color: "#f97316", label: "Série en cours", value: `${streak(db, today)} jour${streak(db, today) > 1 ? "s" : ""}` },
    { Icon: Brain, color: "#8b5cf6", label: "Cartes maîtrisées", value: `${db.cards.filter((c) => isMastered(c.reps)).length} / ${db.cards.length}` },
    { Icon: Target, color: "#f02849", label: "Prochain examen", value: next ? (next.date === today ? "Aujourd'hui" : `Dans ${diffDays(today, next.date)} jours`) : "Aucun" },
  ];
  return (
    <Card>
      <CardTitle>Ta progression</CardTitle>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-3">
            <IconBubble Icon={r.Icon} color={r.color} />
            <span className="min-w-0">
              <span className="block text-[13px] text-muted">{r.label}</span>
              <span className="block font-semibold">{r.value}</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TodayClasses({ db }: { db: DB }) {
  const { today } = useData();
  const classes = db.classes.filter((c) => c.weekday === weekdayOf(today)).sort((a, b) => a.start.localeCompare(b.start));
  return (
    <Card>
      <CardTitle
        action={
          <Link href="/planning" className="rounded-md px-2 py-1 text-[15px] text-accent-text hover:bg-sunken">
            Planning
          </Link>
        }
      >
        Tes cours aujourd&apos;hui
      </CardTitle>
      {classes.length === 0 ? (
        <p className="text-[15px] text-muted">Pas de cours prévu.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {classes.map((c) => {
            const subject = db.subjects.find((s) => s.id === c.subjectId);
            return (
              <li key={c.id} className="flex items-center gap-3 rounded-lg py-1.5">
                <SubjectAvatar subject={subject} size={36} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{subject?.name}</span>
                  <span className="flex items-center gap-2 text-[13px] text-muted">
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {c.start}–{c.end}
                    </span>
                    {c.room && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} /> {c.room}
                      </span>
                    )}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function Onboarding() {
  const { setDb, today } = useData();
  const [loading, setLoading] = useState(false);
  const steps = [
    { href: "/cours", Icon: Camera, color: "#31a24c", title: "Ajoute tes cours", text: "La matière, la date de l'examen et les photos de tes notes : Muse en tire un cours clair, des flashcards et un quiz." },
    { href: "/planning", Icon: CalendarDays, color: "#f02849", title: "Renseigne ton emploi du temps", text: "Tes cours de la semaine, pour retrouver ta journée d'un coup d'œil." },
    { href: "/", Icon: Timer, color: "#0866ff", title: "Révise 15 min par jour", text: "Lis le cours, teste-toi avec « je connais / je ne connais pas », puis un petit quiz. Le planning s'adapte si tu rates un jour." },
  ];
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Card flush className="overflow-hidden">
        <div className="ai-gradient flex h-28 items-end px-4 pb-3 text-white sm:h-32">
          <p className="text-2xl font-bold sm:text-[28px]">Bienvenue sur Tempo</p>
        </div>
        <div className="p-4">
          <p className="text-[15px] text-muted">Arrive à tes examens préparé, sans y passer tes soirées.</p>
          <ol className="mt-3 flex flex-col gap-1">
            {steps.map((s) => (
              <li key={s.title}>
                <Link href={s.href} className="-mx-2 flex gap-3 rounded-lg p-2 hover:bg-sunken">
                  <IconBubble Icon={s.Icon} color={s.color} size={40} />
                  <span>
                    <span className="block font-semibold">{s.title}</span>
                    <span className="block text-[15px] text-muted">{s.text}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </Card>
      <Card>
        <CardTitle>Envie de voir le résultat ?</CardTitle>
        <p className="text-[15px] text-muted">Charge un exemple avec 3 matières, leurs cours, des flashcards et des examens.</p>
        <Button
          className="mt-3"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            setDb((await postJson<{ db: DB }>("/api/demo", { today })).db);
            setLoading(false);
          }}
        >
          Charger la démo
        </Button>
      </Card>
      <ExercisesNote />
    </div>
  );
}

function DemoTools() {
  const { dayOffset, setDayOffset, setDb, today } = useData();
  return (
    <Card>
      <CardTitle>Outils de démo</CardTitle>
      <p className="text-[13px] text-muted">Simule les jours suivants pour montrer comment le planning s&apos;adapte.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setDayOffset(dayOffset + 1)}>
          <FastForward size={16} /> Jour suivant
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            if (!confirm("Remplacer toutes tes données (cours, cartes, planning) par la démo ?")) return;
            setDayOffset(0);
            setDb((await postJson<{ db: DB }>("/api/demo", { today: addDays(today, -dayOffset) })).db);
          }}
        >
          Charger la démo
        </Button>
      </div>
    </Card>
  );
}
