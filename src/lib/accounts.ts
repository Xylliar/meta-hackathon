import type { Theme } from "./theme";
import type { ID } from "./types";

export interface User {
  id: ID;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  theme: Theme;
}

/** What the browser is allowed to see about the logged-in user. */
export type PublicUser = Omit<User, "passwordHash">;

export interface Session {
  /** SHA-256 of the token in the cookie, never the token itself. */
  tokenHash: string;
  userId: ID;
  expiresAt: string;
}

export interface AccountsFile {
  users: User[];
  sessions: Session[];
}

export const SESSION_DAYS = 30;
export const MIN_PASSWORD_LENGTH = 8;

export const emptyAccounts = (): AccountsFile => ({ users: [], sessions: [] });

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Explicit list of fields, so a secret added to User later can't leak by accident. */
export const toPublicUser = (u: User): PublicUser => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt, theme: u.theme });

/** French error message for the sign-up form, or null when everything is valid. */
export function signUpError(file: AccountsFile, input: { name: string; email: string; password: string }): string | null {
  const name = input.name.trim();
  if (!name) return "Indique ton prénom.";
  if (name.length > 50) return "Ton prénom est trop long.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(input.email))) return "Adresse e-mail invalide.";
  if (input.password.length < MIN_PASSWORD_LENGTH) return `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  if (input.password.length > 200) return "Le mot de passe est trop long.";
  if (findUserByEmail(file, input.email)) return "Un compte existe déjà avec cette adresse.";
  return null;
}

export function findUserByEmail(file: AccountsFile, email: string): User | undefined {
  const normalized = normalizeEmail(email);
  return file.users.find((u) => u.email === normalized);
}

/** Adds a session and drops the ones that have expired. */
export function addSession(file: AccountsFile, session: Session, now: Date): AccountsFile {
  return { ...file, sessions: [...file.sessions.filter((s) => new Date(s.expiresAt) > now), session] };
}

export function userForSession(file: AccountsFile, tokenHash: string, now: Date): User | null {
  const session = file.sessions.find((s) => s.tokenHash === tokenHash);
  if (!session || new Date(session.expiresAt) <= now) return null;
  return file.users.find((u) => u.id === session.userId) ?? null;
}

export function removeSession(file: AccountsFile, tokenHash: string): AccountsFile {
  return { ...file, sessions: file.sessions.filter((s) => s.tokenHash !== tokenHash) };
}

export function updateUser(file: AccountsFile, userId: ID, patch: Partial<Pick<User, "name" | "theme">>): AccountsFile {
  return { ...file, users: file.users.map((u) => (u.id === userId ? { ...u, ...patch } : u)) };
}
