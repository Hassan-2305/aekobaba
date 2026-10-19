import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Give an existing account the ADMIN role (team dashboard access).
//
//   npm run admin:grant -- teamaekovera@gmail.com
//   npm run admin:grant -- someone@example.com --revoke   (back to BRAND)
//
// The person must have signed up on the site first (that creates their User
// row). The role lives in the database — nothing is inferred from an email
// domain.

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const revoke = process.argv.includes("--revoke");
  if (!email || !email.includes("@")) {
    console.error("Usage: npm run admin:grant -- you@example.com [--revoke]");
    process.exit(1);
  }
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL || "" }),
  });
  try {
    const user = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
    if (!user) {
      console.error(`No account for ${email}. Sign up on the site with that email first, then run this again.`);
      process.exit(1);
    }
    const role = revoke ? "BRAND" : "ADMIN";
    await db.user.update({ where: { id: user.id }, data: { role } });
    console.log(`${email} is now ${role}.`);
  } finally {
    await db.$disconnect();
  }
}

void main();
