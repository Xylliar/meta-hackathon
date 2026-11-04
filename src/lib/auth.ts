import "server-only";
import path from "node:path";
import { cookies } from "next/headers";
import {
  addSession,
  emptyAccounts,
  findUserByEmail,
  normalizeEmail,
  removeSession,
  SESSION_DAYS,
  signUpError,
  updateUser as patchUser,
  userForSession,
  type AccountsFile,
  type User,
} from "./accounts";
import { hashPassword, hashToken, newSessionToken, verifyPassword } from "./password";
import { adoptLegacyData, DATA_DIR, readJson, serialize, writeJson } from "./store";
import type { Theme } from "./theme";

const ACCOUNTS_FILE = path.join(DATA_DIR, "accounts.json");
const SESSION_COOKIE = "tempo_session";

const readAccounts = () => readJson<AccountsFile>(ACCOUNTS_FILE, emptyAccounts);

function updateAccounts<T>(fn: (file: AccountsFile) => Promise<{ file: AccountsFile; result: T }>): Promise<T> {
  return serialize(async () => {
    const { file, result } = await fn(await readAccounts());
    await writeJson(ACCOUNTS_FILE, file);
    return result;
  });
}

async function setSessionCookie(userId: string) {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await updateAccounts(async (file) => ({
    file: addSession(file, { tokenHash: hashToken(token), userId, expiresAt: expiresAt.toISOString() }, new Date()),
    result: null,
  }));
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** Creates the account and logs it in. The very first account takes over the data saved before accounts existed. */
export async function signUp(input: { name: string; email: string; password: string }): Promise<{ user: User; adopted: boolean } | { error: string }> {
  const passwordHash = await hashPassword(input.password);
  const outcome = await updateAccounts<{ error: string } | { user: User; first: boolean }>(async (file) => {
    const error = signUpError(file, input);
    if (error) return { file, result: { error } };
    const user: User = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      email: normalizeEmail(input.email),
      passwordHash,
      createdAt: new Date().toISOString(),
      theme: "system",
    };
    return { file: { ...file, users: [...file.users, user] }, result: { user, first: file.users.length === 0 } };
  });
  if ("error" in outcome) return outcome;
  const adopted = outcome.first ? await adoptLegacyData(outcome.user.id) : false;
  await setSessionCookie(outcome.user.id);
  return { user: outcome.user, adopted };
}

export async function logIn(email: string, password: string): Promise<User | null> {
  const user = findUserByEmail(await readAccounts(), email);
  // Same message (and roughly the same time) whether the e-mail or the password is wrong.
  const ok = user ? await verifyPassword(password, user.passwordHash) : await hashPassword(password).then(() => false);
  if (!user || !ok) return null;
  await setSessionCookie(user.id);
  return user;
}

export async function logOut() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await updateAccounts(async (file) => ({ file: removeSession(file, hashToken(token)), result: null }));
  store.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return userForSession(await readAccounts(), hashToken(token), new Date());
}

/** For API routes: the logged-in user, or a 401 response to return as is. */
export async function requireUser(): Promise<User | Response> {
  return (await currentUser()) ?? Response.json({ error: "Connecte-toi pour continuer." }, { status: 401 });
}

export function updateCurrentUser(userId: string, patch: { name?: string; theme?: Theme }): Promise<User | null> {
  return updateAccounts(async (file) => {
    const next = patchUser(file, userId, patch);
    return { file: next, result: next.users.find((u) => u.id === userId) ?? null };
  });
}
