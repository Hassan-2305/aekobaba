import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// Requester access tokens: the browser that sent an inquiry keeps a random
// token; the database keeps only its sha256. Presenting id + token later
// reveals that one inquiry's status — nothing else, no account needed.

export function newAccessToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashAccessToken(token) };
}

export function hashAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenMatches(token: string, storedHash: string | null): boolean {
  if (!storedHash) return false;
  const a = Buffer.from(hashAccessToken(token), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
