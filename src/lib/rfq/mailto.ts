// The "Send email" button: composes (never sends) the RFQ email a team member
// reviews in their own mail app. Aekobaba is the mediator — the supplier is
// told a customer request came in, never the customer's identity.

export interface RfqEmailInput {
  reference: string;
  supplierName: string;
  supplierEmail: string;
  lines: {
    productTitle: string;
    quantity: number;
    sourceUrl?: string | null;
    specNotes?: string | null;
  }[];
  deadline?: string | null;
  requirements?: string | null;
  artworkAvailable?: boolean;
  /** Team member's name for the sign-off. */
  signOff?: string;
}

export interface ComposedEmail {
  to: string;
  subject: string;
  body: string;
  href: string;
  /** The full body didn't fit in a mailto link — the link carries a short note; paste the copied body. */
  truncated: boolean;
}

/** Some mail clients (notably on Windows) cut mailto links beyond ~2,000 characters. */
export const MAILTO_MAX = 1900;

export function rfqSubject(reference: string, productTitle: string, extraLines: number): string {
  const product = productTitle.length > 70 ? `${productTitle.slice(0, 67)}…` : productTitle;
  return `Aekobaba RFQ — ${reference} — ${product}${extraLines > 0 ? ` (+${extraLines} more)` : ""}`;
}

export function composeRfqEmail(input: RfqEmailInput): ComposedEmail {
  const first = input.lines[0]?.productTitle ?? "Packaging request";
  const subject = rfqSubject(input.reference, first, Math.max(0, input.lines.length - 1));
  const items = input.lines
    .map((line, i) => {
      const parts = [`${i + 1}. ${line.productTitle}`, `   Quantity: ${line.quantity.toLocaleString("en-US")}`];
      if (line.specNotes) parts.push(`   Specification: ${line.specNotes}`);
      if (line.sourceUrl) parts.push(`   Your listing: ${line.sourceUrl}`);
      return parts.join("\n");
    })
    .join("\n\n");

  const body = [
    `Hello ${input.supplierName} team,`,
    "",
    `Aekobaba, the packaging sourcing marketplace run by Aekovera, has received a sourcing request from one of our customers, and we would like to know whether you can fulfil it. Our reference is ${input.reference}.`,
    "",
    "Requested items:",
    "",
    items,
    "",
    ...(input.deadline ? [`Needed by: ${input.deadline}`, ""] : []),
    ...(input.requirements ? [`Customer requirements: ${input.requirements}`, ""] : []),
    ...(input.artworkAvailable ? ["The customer has provided artwork / design files, which we can share on request.", ""] : []),
    "Could you please confirm:",
    "- availability and unit price at the quantity above (and any price breaks),",
    "- minimum order quantity,",
    "- lead time and shipping terms,",
    "- whether samples are available, and their cost.",
    "",
    `Please reply to this email and keep the reference ${input.reference} in the subject line.`,
    "",
    "Thank you,",
    input.signOff ? `${input.signOff}\nTeam Aekovera — Aekobaba` : "Team Aekovera — Aekobaba",
  ].join("\n");

  const base = `mailto:${encodeURIComponent(input.supplierEmail).replace(/%40/g, "@")}?subject=${encodeURIComponent(subject)}&body=`;
  const full = base + encodeURIComponent(body);
  if (full.length <= MAILTO_MAX) return { to: input.supplierEmail, subject, body, href: full, truncated: false };
  const note = `Hello ${input.supplierName} team,

[Paste the RFQ details copied from the Aekobaba dashboard here — reference ${input.reference}.]`;
  return { to: input.supplierEmail, subject, body, href: base + encodeURIComponent(note), truncated: true };
}
