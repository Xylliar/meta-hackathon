"use client";

import { BookOpen, CircleQuestionMark, Clock, Layers, MapPin, Moon, Plus, Target, Timer, X } from "lucide-react";
import { useState } from "react";
import { useData } from "@/components/DataProvider";
import { Button, Card, CardTitle, Empty, ErrorBanner, Field, IconBubble, Input, Loaded, PageHeader, Select } from "@/components/ui";
import { addDays, parseISODate, WEEKDAYS, weekdayOf } from "@/lib/date";
import { MINUTES, sectionMinutes, type PlanDay } from "@/lib/scheduler";
import type { DB, ID } from "@/lib/types";

export default function PlanningPage() {
  return <Loaded>{(db) => <Planning db={db} />}</Loaded>;
}

function Planning({ db }: { db: DB }) {
  return (
    <>
      <PageHeader title="Planning" subtitle="Ton emploi du temps de la semaine et tes prochaines révisions." />
      <ErrorBanner />
      <div className="flex flex-col gap-4">
        <WeekGrid db={db} />
        <div className="grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="flex flex-col gap-4 lg:sticky lg:top-[72px]">
            <SlotForm db={db} />
            <DailyTime db={db} />
          </div>
          <Revisions db={db} />
        </div>
      </div>
    </>
  );
}

function SlotForm({ db }: { db: DB }) {
  const { dispatch } = useData();
  const [subjectName, setSubjectName] = useState("");
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("10:00");
  const [room, setRoom] = useState("");
  const invalid = end <= start;

  return (
    <Card>
      <CardTitle>Ajouter un cours à l&apos;emploi du temps</CardTitle>
      <form
        className="grid grid-cols-2 gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (invalid || !subjectName.trim()) return;
          await dispatch({ type: "addClass", subjectName, slot: { weekday, start, end, room: room.trim() || undefined } });
          setRoom("");
        }}
      >
        <div className="col-span-2">
          <Field label="Matière">
            <Input list="planning-subjects" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="Ex. : Physique" required />
            <datalist id="planning-subjects">
              {db.subjects.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Jour">
            <Select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i + 1}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Début">
          <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Fin">
          <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
        <div className="col-span-2">
          <Field label="Salle (facultatif)">
            <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Ex. : B204" />
          </Field>
        </div>
        {invalid && <p className="col-span-2 text-[13px] text-[#e41e3f]">L&apos;heure de fin doit être après le début.</p>}
        <Button type="submit" className="col-span-2 h-10" disabled={invalid || !subjectName.trim()}>
          <Plus size={18} strokeWidth={2.6} /> Ajouter
        </Button>
      </form>
    </Card>
  );
}

function DailyTime({ db }: { db: DB }) {
  const { dispatch } = useData();
  return (
    <Card>
      <div className="flex items-center gap-3">
        <IconBubble Icon={Timer} color="#0866ff" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Temps de révision par jour</p>
          <p className="text-[13px] text-muted">Le planning s&apos;adapte tout de suite.</p>
        </div>
        <span className="text-xl font-bold text-accent">{db.settings.dailyMinutes} min</span>
      </div>
      <input
        type="range"
        min={5}
        max={60}
        step={5}
        value={db.settings.dailyMinutes}
        onChange={(e) => dispatch({ type: "setDailyMinutes", minutes: Number(e.target.value) })}
        className="mt-3 w-full accent-[var(--accent)]"
        aria-label="Minutes de révision par jour"
      />
    </Card>
  );
}

function WeekGrid({ db }: { db: DB }) {
  const { today, dispatch } = useData();
  const todayWeekday = weekdayOf(today);
  const subject = (id: ID) => db.subjects.find((s) => s.id === id);
  const days = WEEKDAYS.map((name, i) => ({
    name,
    weekday: i + 1,
    slots: db.classes.filter((c) => c.weekday === i + 1).sort((a, b) => a.start.localeCompare(b.start)),
  })).filter((d) => d.weekday <= 5 || d.slots.length > 0);

  return (
    <Card>
      <CardTitle>Mon emploi du temps</CardTitle>
      {db.classes.length === 0 && <p className="mb-3 text-[15px] text-muted">Ajoute tes cours de la semaine pour les voir ici.</p>}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {days.map((d) => (
          <div key={d.weekday} className={`rounded-lg p-2 ${d.weekday === todayWeekday ? "bg-accent-soft" : "bg-sunken"}`}>
            <p className={`mb-2 px-1 text-[13px] font-bold ${d.weekday === todayWeekday ? "text-accent-text" : "text-muted"}`}>
              {d.name}
              {d.weekday === todayWeekday && " · aujourd'hui"}
            </p>
            {d.slots.length === 0 && <p className="px-1 pb-1 text-[13px] text-muted">Pas de cours</p>}
            <ul className="flex flex-col gap-1.5">
              {d.slots.map((c) => {
                const s = subject(c.subjectId);
                return (
                  <li key={c.id} className="flex items-start gap-2 rounded-md border-l-4 bg-surface px-2.5 py-2 shadow-card" style={{ borderColor: s?.color }}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{s?.name}</p>
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {c.start}–{c.end}
                        </span>
                        {c.room && (
                          <span className="flex items-center gap-1">
                            <MapPin size={11} /> {c.room}
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      aria-label="Supprimer ce cours"
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted hover:bg-sunken hover:text-[#e41e3f]"
                      onClick={() => dispatch({ type: "deleteClass", id: c.id })}
                    >
                      <X size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DateTile({ date, highlight }: { date: string; highlight: boolean }) {
  const d = parseISODate(date);
  return (
    <span className={`flex w-12 shrink-0 flex-col items-center self-start overflow-hidden rounded-lg border ${highlight ? "border-accent" : "border-line"} bg-surface`}>
      <span className={`w-full py-0.5 text-center text-[10px] font-bold text-white uppercase ${highlight ? "bg-accent" : "bg-[#f02849]"}`}>
        {d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")}
      </span>
      <span className="text-lg leading-7 font-bold">{d.getDate()}</span>
    </span>
  );
}

function Revisions({ db }: { db: DB }) {
  const { plan, today } = useData();
  if (!plan) return null;

  const courseOfCard = new Map(db.cards.map((c) => [c.id, c.courseId]));
  const courseOfQuestion = new Map(db.questions.map((q) => [q.id, q.courseId]));
  const subjectOfCourse = new Map(db.courses.map((c) => [c.id, c.subjectId]));
  const subject = (id: ID) => db.subjects.find((s) => s.id === id);
  const days = plan.days.slice(0, 21);

  /** Minutes per subject for one day, to draw a stacked bar. */
  const minutesBySubject = (d: PlanDay) => {
    const acc = new Map<ID, number>();
    const add = (courseId: ID | undefined, minutes: number) => {
      const s = subjectOfCourse.get(courseId ?? "");
      if (s) acc.set(s, (acc.get(s) ?? 0) + minutes);
    };
    for (const t of d.reading) {
      const course = db.courses.find((c) => c.id === t.courseId);
      if (course) add(t.courseId, t.sections.length ? t.sections.reduce((m, i) => m + sectionMinutes(course, i), 0) : MINUTES.recap);
    }
    for (const id of d.newCards) add(courseOfCard.get(id), MINUTES.newCard);
    for (const id of d.reviews) add(courseOfCard.get(id), MINUTES.review);
    for (const id of d.questions) add(courseOfQuestion.get(id), MINUTES.question);
    return acc;
  };

  return (
    <Card flush>
      <div className="p-4 pb-2">
        <CardTitle>Mes prochaines révisions</CardTitle>
        {plan.start !== today && <p className="-mt-1 mb-1 text-[13px] text-muted">Aujourd&apos;hui est déjà réglé, le planning reprend demain.</p>}
      </div>

      {days.length === 0 ? (
        <div className="px-4 pb-4">
          <Empty>Rien de planifié : ajoute un cours avec sa date d&apos;examen dans l&apos;onglet Cours.</Empty>
        </div>
      ) : (
        <ul className="px-2 pb-2">
          {days.map((d) => {
            const exams = db.exams.filter((e) => e.date === addDays(d.date, 1));
            const bySubject = minutesBySubject(d);
            const cards = d.newCards.length + d.reviews.length;
            const parts = d.reading.reduce((n, t) => n + t.sections.length, 0);
            const isToday = d.date === today;
            const label = isToday
              ? "Aujourd'hui"
              : parseISODate(d.date).toLocaleDateString("fr-FR", { weekday: "long" }).replace(/^./, (c) => c.toUpperCase());
            return (
              <li key={d.date} className={`flex gap-3 rounded-lg p-2 ${isToday ? "bg-accent-soft" : "hover:bg-sunken"}`}>
                <DateTile date={d.date} highlight={isToday} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2">
                    <p className={`font-semibold ${isToday ? "text-accent-text" : ""}`}>{label}</p>
                    <p className="text-[13px] text-muted">{d.minutes ? `${Math.ceil(d.minutes)} min` : "Repos"}</p>
                    {exams.length > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-[#e41e3f]">
                        <Target size={12} /> Veille : {exams.map((e) => e.title).join(", ")}
                      </span>
                    )}
                  </div>
                  {d.minutes > 0 ? (
                    <>
                      <div
                        className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-pressed"
                        style={{ width: `${Math.min(100, (d.minutes / db.settings.dailyMinutes) * 100)}%`, minWidth: 12 }}
                      >
                        {[...bySubject].map(([sid, min]) => (
                          <div key={sid} style={{ width: `${(min / d.minutes) * 100}%`, background: subject(sid)?.color }} />
                        ))}
                      </div>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-muted">
                        {parts > 0 && (
                          <span className="flex items-center gap-1">
                            <BookOpen size={13} /> {parts} partie{parts > 1 ? "s" : ""}
                          </span>
                        )}
                        {cards > 0 && (
                          <span className="flex items-center gap-1">
                            <Layers size={13} /> {cards} carte{cards > 1 ? "s" : ""}
                          </span>
                        )}
                        {d.questions.length > 0 && (
                          <span className="flex items-center gap-1">
                            <CircleQuestionMark size={13} /> {d.questions.length} quiz
                          </span>
                        )}
                        <span className="truncate">{[...bySubject.keys()].map((sid) => subject(sid)?.name).join(", ")}</span>
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 flex items-center gap-1 text-[13px] text-muted">
                      <Moon size={13} /> Pas de révision ce jour-là
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
