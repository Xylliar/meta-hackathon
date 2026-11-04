import "server-only";
import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { emptyDb, type DB, type ID } from "./types";

// Local storage for the hackathon demo: JSON files plus an uploads folder.
// TEMPO_DATA_DIR points the app at another folder (demos, screenshots) without touching real data.
export const DATA_DIR = process.env.TEMPO_DATA_DIR ? path.resolve(process.env.TEMPO_DATA_DIR) : path.join(process.cwd(), "data");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
/** Data saved before accounts existed; the first account created takes it over. */
const LEGACY_DB_FILE = path.join(DATA_DIR, "db.json");

function userDbFile(userId: ID): string {
  // Ids are UUIDs we generate; checking keeps a bad id from ever escaping the data folder.
  if (!/^[0-9a-f-]{36}$/.test(userId)) throw new Error("Identifiant de compte invalide.");
  return path.join(DATA_DIR, "users", userId, "db.json");
}

export async function readJson<T>(file: string, fallback: () => T): Promise<T> {
  try {
    return { ...fallback(), ...JSON.parse(await readFile(file, "utf8")) };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return fallback();
    throw err;
  }
}

/** Writes through a temporary file, so a crash never leaves half a file behind. */
export async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2));
  await rename(tmp, file);
}

// Writes are handled one at a time so two quick clicks can't overwrite each other.
let queue: Promise<unknown> = Promise.resolve();

export function serialize<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task);
  queue = run.catch(() => {});
  return run;
}

export const readDb = (userId: ID): Promise<DB> => readJson(userDbFile(userId), emptyDb);

export function updateDb(userId: ID, fn: (db: DB) => DB | Promise<DB>): Promise<DB> {
  return serialize(async () => {
    const next = await fn(await readDb(userId));
    await writeJson(userDbFile(userId), next);
    return next;
  });
}

/**
 * Gives the data saved before accounts existed to a new account. The old file is kept,
 * renamed, as a backup. Returns false when there was nothing to take over.
 */
export async function adoptLegacyData(userId: ID): Promise<boolean> {
  try {
    await mkdir(path.dirname(userDbFile(userId)), { recursive: true });
    await copyFile(LEGACY_DB_FILE, userDbFile(userId));
    await rename(LEGACY_DB_FILE, path.join(DATA_DIR, "db.before-accounts.json"));
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw err;
  }
}
