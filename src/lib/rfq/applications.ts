import type { PrismaClient } from "@prisma/client";
import { z } from "zod";

import { enqueueEmail } from "@/lib/notify/outbox";
import { applicationEmail } from "@/lib/notify/templates";

import { isUniqueViolation, makeReference } from "./reference";
import { APPLICATION_STATUSES, APPLICATION_TYPES, MEETING_STATUSES } from "./statuses";

// Supplier onboarding: "List your company", "Fetch products from my site" and
// "Become a partner". Each submission is stored (PENDING) together with its
// team email in one transaction. Product extraction never starts on its own —
// the team authorizes it, and extracted products are reviewed before publishing.

const url = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
  .pipe(z.url());

export const applicationSchema = z.object({
  type: z.enum(APPLICATION_TYPES),
  companyName: z.string().trim().min(2).max(160),
  website: url,
  location: z.string().trim().max(160).optional(),
  contactName: z.string().trim().min(1).max(120),
  contactEmail: z.email().max(200),
  contactPhone: z.string().trim().max(40).optional(),
  categories: z.array(z.string().trim().min(1).max(80)).max(25).default([]),
  catalogUrls: z.array(url).max(20).default([]),
  message: z.string().trim().max(4000).optional(),
  /** Honeypot — real users never fill it. */
  fax: z.string().max(0).optional(),
});
export type ApplicationInput = z.infer<typeof applicationSchema>;

export async function createApplication(
  db: PrismaClient,
  input: ApplicationInput,
  applicantUserId: string | null,
): Promise<{ id: string; reference: string; outboxId: string }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const reference = makeReference("APP");
    try {
      return await db.$transaction(async (tx) => {
        const app = await tx.supplierApplication.create({
          data: {
            reference,
            type: input.type,
            applicantUserId,
            companyName: input.companyName,
            website: input.website,
            location: input.location || null,
            contactName: input.contactName,
            contactEmail: input.contactEmail,
            contactPhone: input.contactPhone || null,
            categories: input.categories,
            catalogUrls: input.catalogUrls,
            message: input.message || null,
            ...(input.type === "PARTNERSHIP" ? { meeting: { create: {} } } : {}),
          },
          select: { id: true },
        });
        const outboxId = await enqueueEmail(
          tx,
          applicationEmail({
            id: app.id,
            reference,
            type: input.type,
            companyName: input.companyName,
            website: input.website,
            location: input.location || null,
            contactName: input.contactName,
            contactEmail: input.contactEmail,
            contactPhone: input.contactPhone || null,
            categories: input.categories,
            catalogUrls: input.catalogUrls,
            message: input.message || null,
          }),
        );
        return { id: app.id, reference, outboxId };
      });
    } catch (error) {
      if (isUniqueViolation(error)) continue;
      throw error;
    }
  }
  throw new Error("could not allocate a unique application reference");
}

export const adminApplicationUpdateSchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
  internalNotes: z.string().trim().max(8000).nullable().optional(),
  meeting: z
    .object({
      status: z.enum(MEETING_STATUSES).optional(),
      scheduledAt: z.iso.datetime({ local: true }).nullable().optional(),
      outcome: z.string().trim().max(2000).nullable().optional(),
      followUp: z.string().trim().max(2000).nullable().optional(),
    })
    .optional(),
});
