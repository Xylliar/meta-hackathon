import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// scrypt with Node's recommended interactive-login cost; the parameters are stored
// with each hash so they can be raised later without breaking existing accounts.
const PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;

function derive(password: string, salt: Buffer, params: typeof PARAMS): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, { ...params, maxmem: 64 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

/** Returns "scrypt$N$r$p$salt$hash" (salt and hash in base64). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, PARAMS);
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, N, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const key = await derive(password, Buffer.from(salt, "base64"), { N: Number(N), r: Number(r), p: Number(p) });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Random session token, sent to the browser in an httpOnly cookie. */
export const newSessionToken = () => randomBytes(32).toString("base64url");

/** Only this digest is stored, so a copy of the accounts file doesn't let anyone log in. */
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
