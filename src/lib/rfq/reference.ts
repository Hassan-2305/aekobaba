import { randomInt } from "node:crypto";

// Human references for RFQs and supplier applications: "AEK-261019-7KQ4".
// Date for orientation, four characters from an unambiguous alphabet (no
// 0/O/1/I) for uniqueness; the database's unique constraint is the backstop
// and the caller retries on collision.

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function makeReference(prefix: "AEK" | "APP", now: Date = new Date(), rand: (n: number) => number = randomInt): string {
  const yy = String(now.getUTCFullYear()).slice(2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  let tail = "";
  for (let i = 0; i < 4; i++) tail += ALPHABET[rand(ALPHABET.length)];
  return `${prefix}-${yy}${mm}${dd}-${tail}`;
}

/** True for a Prisma unique-constraint violation (P2002). */
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}
