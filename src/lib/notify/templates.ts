import { label } from "@/lib/rfq/statuses";

import { siteUrl, teamInbox, type OutboxMessage } from "./outbox";

// Team notification emails (plain text — they land in the team's Gmail).

export interface NewRequestEmailInput {
  id: string;
  reference: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  companyName: string | null;
  deadline: string | null;
  notes: string | null;
  artworkNotes: string | null;
  hasArtworkFile: boolean;
  lines: { supplierName: string; productTitle: string; quantity: number; specNotes: string | null }[];
}

export function newRequestEmail(input: NewRequestEmailInput): OutboxMessage {
  const bySupplier = new Map<string, NewRequestEmailInput["lines"]>();
  for (const line of input.lines) bySupplier.set(line.supplierName, [...(bySupplier.get(line.supplierName) ?? []), line]);
  const productBlock = [...bySupplier.entries()]
    .map(
      ([supplier, lines]) =>
        `${supplier}\n` +
        lines
          .map((l) => `  - ${l.productTitle} — qty ${l.quantity.toLocaleString("en-US")}${l.specNotes ? `\n    Spec: ${l.specNotes}` : ""}`)
          .join("\n"),
    )
    .join("\n\n");

  const textBody = [
    `New quote request ${input.reference}`,
    "",
    "Customer",
    `  Name:    ${input.contactName}`,
    `  Company: ${input.companyName ?? "—"}`,
    `  Email:   ${input.contactEmail}`,
    `  Phone:   ${input.contactPhone ?? "—"}`,
    "",
    `Requested products (${input.lines.length} line${input.lines.length === 1 ? "" : "s"}, ${bySupplier.size} supplier${bySupplier.size === 1 ? "" : "s"})`,
    "",
    productBlock,
    "",
    `Needed by: ${input.deadline ?? "—"}`,
    `Requirements: ${input.notes ?? "—"}`,
    `Artwork notes: ${input.artworkNotes ?? "—"}`,
    `Artwork file: ${input.hasArtworkFile ? "attached in the dashboard" : "none"}`,
    "",
    `Open in the dashboard: ${siteUrl()}/admin/quotes/${input.id}`,
  ].join("\n");

  return {
    kind: "rfq.created",
    toEmail: teamInbox(),
    subject: `New quote request ${input.reference} — ${input.companyName ?? input.contactName}`,
    textBody,
  };
}

export interface ApplicationEmailInput {
  id: string;
  reference: string;
  type: string;
  companyName: string;
  website: string;
  location: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  categories: string[];
  catalogUrls: string[];
  message: string | null;
}

export function applicationEmail(input: ApplicationEmailInput): OutboxMessage {
  const heading =
    input.type === "PRODUCT_FETCH"
      ? "Product data extraction requested"
      : input.type === "PARTNERSHIP"
        ? "Partnership request"
        : "New company listing application";
  const textBody = [
    `${heading} — ${input.reference}`,
    "",
    `Company:  ${input.companyName}`,
    `Website:  ${input.website}`,
    `Location: ${input.location ?? "—"}`,
    `Contact:  ${input.contactName} <${input.contactEmail}>${input.contactPhone ? `, ${input.contactPhone}` : ""}`,
    ...(input.categories.length ? [`Categories: ${input.categories.join(", ")}`] : []),
    ...(input.catalogUrls.length ? ["", "Product / catalog pages:", ...input.catalogUrls.map((u) => `  - ${u}`)] : []),
    ...(input.message ? ["", "Message:", input.message] : []),
    "",
    input.type === "PRODUCT_FETCH"
      ? "Review the website and authorize extraction before anything is fetched. Extracted products are reviewed before publishing."
      : input.type === "PARTNERSHIP"
        ? "They were sent to the meeting booking page. Record the meeting and outcome in the dashboard."
        : "Review the application and contact the company.",
    "",
    `Open in the dashboard: ${siteUrl()}/admin/applications/${input.id}`,
  ].join("\n");
  return {
    kind: `application.${input.type.toLowerCase()}`,
    toEmail: teamInbox(),
    subject: `${label(input.type)}: ${input.companyName} (${input.reference})`,
    textBody,
  };
}

export interface InquiryEmailInput {
  reference: string;
  kind: "QUOTE" | "SAMPLE";
  name: string;
  email: string;
  company?: string | null;
  website?: string | null;
  phone?: string | null;
  quantity: string;
  packagingType?: string | null;
  format?: string | null;
  designStatus?: string | null;
  description: string;
  hasFile: boolean;
  product: { id: string; title: string; supplierName: string; sourceUrl: string };
}

/** "Get a quote" / "Get a sample" from a product page. */
export function inquiryEmail(input: InquiryEmailInput): OutboxMessage {
  const what = input.kind === "SAMPLE" ? "Sample request" : "Quote request";
  const textBody = [
    `${what} #${input.reference} from a product page`,
    "",
    "Customer",
    `  Name:    ${input.name}`,
    `  Company: ${input.company || "—"}`,
    `  Email:   ${input.email}`,
    `  Phone:   ${input.phone || "—"}`,
    `  Website: ${input.website || "—"}`,
    "",
    "Product",
    `  ${input.product.title}`,
    `  Supplier: ${input.product.supplierName}`,
    `  Listing:  ${siteUrl()}/products/${input.product.id}`,
    `  Supplier page: ${input.product.sourceUrl}`,
    "",
    `Quantity: ${input.quantity}`,
    ...(input.packagingType ? [`Packaging type: ${input.packagingType}`] : []),
    ...(input.format ? [`Format: ${input.format}`] : []),
    ...(input.designStatus ? [`Design: ${input.designStatus}`] : []),
    `Design file: ${input.hasFile ? "attached in the dashboard" : "none"}`,
    "",
    "Details:",
    input.description,
    "",
    `Open in the dashboard: ${siteUrl()}/admin/inquiries`,
  ].join("\n");
  return {
    kind: `inquiry.${input.kind.toLowerCase()}`,
    toEmail: teamInbox(),
    subject: `${what} #${input.reference} — ${input.company || input.name} — ${input.product.title.slice(0, 60)}`,
    textBody,
  };
}
