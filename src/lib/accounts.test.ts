import { describe, expect, it } from "vitest";
import { addSession, emptyAccounts, findUserByEmail, removeSession, signUpError, toPublicUser, userForSession, type User } from "./accounts";
import { hashPassword, hashToken, newSessionToken, verifyPassword } from "./password";

const NOW = new Date("2026-11-03T12:00:00Z");
const user: User = { id: "u1", name: "Léa", email: "lea@example.com", passwordHash: "x", createdAt: NOW.toISOString(), theme: "system" };

describe("passwords", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(stored).not.toContain("correct horse battery");
    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
    expect(await verifyPassword("Correct horse battery", stored)).toBe(false);
    expect(await verifyPassword("anything", "not-a-hash")).toBe(false);
  });

  it("salts each hash, so the same password never gives the same hash", async () => {
    expect(await hashPassword("même mot de passe")).not.toBe(await hashPassword("même mot de passe"));
  });

  it("makes long random tokens and stores only their digest", () => {
    const token = newSessionToken();
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(newSessionToken()).not.toBe(token);
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toContain(token);
  });
});

describe("sign-up checks", () => {
  const file = { ...emptyAccounts(), users: [user] };
  const ok = { name: "Tom", email: "tom@example.com", password: "12345678" };

  it("accepts a valid sign-up", () => {
    expect(signUpError(file, ok)).toBeNull();
  });

  it("explains what's wrong, in French", () => {
    expect(signUpError(file, { ...ok, name: " " })).toMatch(/prénom/);
    expect(signUpError(file, { ...ok, email: "tom@" })).toMatch(/e-mail/);
    expect(signUpError(file, { ...ok, password: "court" })).toMatch(/8 caractères/);
  });

  it("refuses an e-mail already used, whatever its case", () => {
    expect(signUpError(file, { ...ok, email: "  LEA@Example.com " })).toMatch(/existe déjà/);
    expect(findUserByEmail(file, "LEA@EXAMPLE.COM")?.id).toBe("u1");
  });
});

describe("sessions", () => {
  const tomorrow = new Date(NOW.getTime() + 86_400_000).toISOString();
  const yesterday = new Date(NOW.getTime() - 86_400_000).toISOString();

  it("finds the user of a valid session, not of an expired or unknown one", () => {
    let file = { ...emptyAccounts(), users: [user] };
    file = addSession(file, { tokenHash: "live", userId: "u1", expiresAt: tomorrow }, NOW);
    file = { ...file, sessions: [...file.sessions, { tokenHash: "old", userId: "u1", expiresAt: yesterday }] };
    expect(userForSession(file, "live", NOW)?.id).toBe("u1");
    expect(userForSession(file, "old", NOW)).toBeNull();
    expect(userForSession(file, "nope", NOW)).toBeNull();
  });

  it("drops expired sessions when adding one, and logs out by removing it", () => {
    let file = { ...emptyAccounts(), users: [user], sessions: [{ tokenHash: "old", userId: "u1", expiresAt: yesterday }] };
    file = addSession(file, { tokenHash: "live", userId: "u1", expiresAt: tomorrow }, NOW);
    expect(file.sessions.map((s) => s.tokenHash)).toEqual(["live"]);
    expect(userForSession(removeSession(file, "live"), "live", NOW)).toBeNull();
  });

  it("never sends the password hash to the browser", () => {
    expect(toPublicUser(user)).not.toHaveProperty("passwordHash");
  });
});
