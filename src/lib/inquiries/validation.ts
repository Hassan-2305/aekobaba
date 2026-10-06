import { z } from "zod";

// "Get a quote" / "Get a sample" — the public product-page request form.
// Pure parsing and validation, shared by the route handler and tests.

export const INQUIRY_KINDS = ["QUOTE", "SAMPLE"] as const;
export const DESIGN_STATUSES = ["READY", "IN_PROGRESS", "NEED_HELP", "NONE"] as const;

export const DESIGN_STATUS_LABEL: Record<(typeof DESIGN_STATUSES)[number], string> = {
  READY: "Yes — print-ready artwork",
  IN_PROGRESS: "In progress",
  NEED_HELP: "No — I need design help",
  NONE: "No print (plain packaging)",
};

/**
 * Vercel functions accept request bodies up to 4.5 MB, so the attached design
 * file is capped at 4 MB to leave room for the form fields. Print-ready AI,
 * PSD and PDF files are usually bigger: the form takes a share link
 * (`fileLink`) for those instead.
 */
export const MAX_DESIGN_BYTES = 4 * 1024 * 1024;

export const DESIGN_EXTENSIONS = [
  "pdf",
  "ai",
  "eps",
  "svg",
  "png",
  "jpg",
  "jpeg",
  "psd",
  "zip",
] as const;
export const DESIGN_ACCEPT = DESIGN_EXTENSIONS.map((ext) => `.${ext}`).join(",");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

/** Accepts "brand.com" or a full URL; stores a normalised https URL. */
const website = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      const url = new URL(withScheme);
      if (!url.hostname.includes(".")) throw new Error("no tld");
      return url.toString();
    } catch {
      ctx.addIssue({ code: "custom", message: "Enter a valid website, e.g. yourbrand.com" });
      return z.NEVER;
    }
  });

export const inquirySchema = z.object({
  kind: z.enum(INQUIRY_KINDS),
  productId: z.string().trim().min(1).max(64),
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  company: optionalText(160),
  website,
  phone: optionalText(40),
  quantity: z.string().trim().min(1, "How many do you need?").max(80),
  packagingType: optionalText(120),
  format: optionalText(160),
  // Optional: an unanswered design question is stored as null, never guessed.
  designStatus: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z
      .enum(DESIGN_STATUSES, { message: "Choose one of the design options" })
      .optional()
      .transform((v) => v ?? null),
  ),
  description: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .transform((v) => v ?? ""),
  /** Share link (WeTransfer, Drive, Dropbox…) for artwork too large to attach. */
  fileLink: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      try {
        const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
        if (!url.hostname.includes(".")) throw new Error("no tld");
        return url.toString();
      } catch {
        ctx.addIssue({ code: "custom", message: "Paste a full link, e.g. https://wetransfer.com/…" });
        return z.NEVER;
      }
    }),
});

/** The stored description: the buyer's notes plus the large-file link, if any. */
export function inquiryDescription(input: Pick<InquiryInput, "description" | "fileLink">): string {
  return [input.description, input.fileLink ? `Artwork link: ${input.fileLink}` : null]
    .filter((part): part is string => !!part)
    .join("\n\n");
}

export type InquiryInput = z.infer<typeof inquirySchema>;

export interface DesignFile {
  name: string;
  type: string;
  size: number;
}

/** Validates the optional design file; returns an error message or null. */
export function designFileError(file: DesignFile | null): string | null {
  if (!file || file.size === 0) return null;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!(DESIGN_EXTENSIONS as readonly string[]).includes(ext)) {
    return `Upload a ${DESIGN_EXTENSIONS.map((e) => e.toUpperCase()).join(", ")} file`;
  }
  if (file.size > MAX_DESIGN_BYTES)
    return "Attached files can be up to 4 MB — paste a share link below for larger print files";
  return null;
}

/** Field-keyed error messages for the form. */
export function inquiryFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Short human reference for an inquiry id. */
export function inquiryReference(id: string): string {
  return id.slice(-8).toUpperCase();
}
