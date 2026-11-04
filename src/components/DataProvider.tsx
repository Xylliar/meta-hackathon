"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PublicUser } from "@/lib/accounts";
import type { Action } from "@/lib/actions";
import { addDays, todayISO } from "@/lib/date";
import { buildPlan, type Plan } from "@/lib/scheduler";
import { applyTheme, storedTheme, type Theme } from "@/lib/theme";
import type { DB, ISODate } from "@/lib/types";

interface DataContext {
  /** "anonymous" once we know nobody is logged in; pages then send the visitor to /connexion. */
  status: "loading" | "anonymous" | "ready";
  user: PublicUser | null;
  db: DB | null;
  plan: Plan | null;
  /** null until loaded, so the "demo AI" badge doesn't flash before we know. */
  provider: "mock" | "muse" | null;
  today: ISODate;
  /** Days added to the real date, so a demo can show what happens tomorrow. */
  dayOffset: number;
  setDayOffset: (n: number) => void;
  dispatch: (action: Action) => Promise<void>;
  setDb: (db: DB) => void;
  /** Loads the logged-in user's data (after logging in, for instance). */
  reload: () => Promise<void>;
  logout: () => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  error: string | null;
}

const Ctx = createContext<DataContext | null>(null);
const OFFSET_KEY = "tempo.dayOffset";

type StatePayload = { user: PublicUser; db: DB; provider: "mock" | "muse" };

/** The logged-in user's data, or null when nobody is logged in. */
async function fetchState(): Promise<StatePayload | null> {
  const res = await fetch("/api/state");
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Impossible de charger les données.");
  return res.json();
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function postJson<T>(url: string, body?: unknown, method = "POST"): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "Erreur inconnue", res.status);
  return data as T;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<DataContext["status"]>("loading");
  const [user, setUser] = useState<PublicUser | null>(null);
  const [db, setDb] = useState<DB | null>(null);
  const [provider, setProvider] = useState<"mock" | "muse" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [realToday, setRealToday] = useState<ISODate>("");
  const [dayOffset, setOffsetState] = useState(0);

  const signedOut = useCallback(() => {
    setUser(null);
    setDb(null);
    setStatus("anonymous");
  }, []);

  const applyState = useCallback(
    (data: StatePayload | null) => {
      if (!data) return signedOut();
      let offset = 0;
      try {
        offset = Number(localStorage.getItem(OFFSET_KEY)) || 0;
      } catch {}
      setOffsetState(offset);
      setRealToday(todayISO());
      setProvider(data.provider);
      setUser(data.user);
      setDb(data.db);
      setError(null);
      // The account's theme wins over the one cached in this browser.
      applyTheme(data.user.theme);
      setStatus("ready");
    },
    [signedOut],
  );

  const reload = useCallback(async () => applyState(await fetchState()), [applyState]);

  useEffect(() => {
    fetchState()
      .then((data) => applyState(data))
      .catch((err: Error) => setError(err.message));
  }, [applyState]);

  // "Automatique" follows the device when it switches between light and dark.
  const theme = user?.theme ?? (status === "anonymous" ? storedTheme() : null);
  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const setDayOffset = useCallback((n: number) => {
    setOffsetState(n);
    try {
      localStorage.setItem(OFFSET_KEY, String(n));
    } catch {}
  }, []);

  const dispatch = useCallback(
    async (action: Action) => {
      try {
        const { db } = await postJson<{ db: DB }>("/api/actions", action);
        setDb(db);
        setError(null);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) signedOut();
        else setError((err as Error).message);
      }
    },
    [signedOut],
  );

  const logout = useCallback(async () => {
    await postJson("/api/auth/logout");
    signedOut();
  }, [signedOut]);

  const setTheme = useCallback(async (next: Theme) => {
    applyTheme(next);
    setUser((u) => (u ? { ...u, theme: next } : u));
    try {
      await postJson("/api/auth/me", { theme: next }, "PATCH");
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const today = realToday ? addDays(realToday, dayOffset) : "";
  const plan = useMemo(() => (db && today ? buildPlan(db, today) : null), [db, today]);

  return (
    <Ctx.Provider
      value={{ status, user, db, plan, provider, today, dayOffset, setDayOffset, dispatch, setDb, reload, logout, setTheme, error }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useData(): DataContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}
