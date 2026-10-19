// RFQ workflow statuses (Aekobaba as mediator). Outreach, commercial quote,
// sample and customer feedback are independent tracks — a buyer can approve a
// sample while terms are still being negotiated. Values mirror the Prisma
// enums; labels are what the team dashboard shows.

export const REQUEST_STAGES = ["NEW", "IN_PROGRESS", "QUOTES_SHARED", "COMPLETED", "CANCELLED"] as const;
export const OUTREACH_STATUSES = ["NOT_CONTACTED", "EMAIL_PREPARED", "CONTACTED", "REPLIED", "FOLLOW_UP_NEEDED"] as const;
export const COMMERCIAL_STATUSES = [
  "AWAITING_QUOTE",
  "QUOTE_RECEIVED",
  "REVIEWING",
  "SHARED_WITH_CUSTOMER",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
] as const;
export const SAMPLE_STATUSES = ["NOT_REQUESTED", "REQUESTED", "APPROVED", "DISPATCHED", "DELIVERED", "CANCELLED"] as const;
export const CUSTOMER_FEEDBACK = ["AWAITING_FEEDBACK", "APPROVED", "CHANGES_REQUESTED", "REJECTED"] as const;
export const APPLICATION_TYPES = ["LISTING", "PRODUCT_FETCH", "PARTNERSHIP"] as const;
export const APPLICATION_STATUSES = [
  "PENDING",
  "REVIEWING",
  "CONTACTED",
  "AUTHORIZED",
  "EXTRACTING",
  "IN_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "REJECTED",
  "CLOSED",
] as const;
export const MEETING_STATUSES = ["BOOKING_PENDING", "BOOKED", "HELD", "NO_SHOW", "CANCELLED"] as const;

export type RequestStage = (typeof REQUEST_STAGES)[number];
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];
export type CommercialStatus = (typeof COMMERCIAL_STATUSES)[number];
export type SampleStatus = (typeof SAMPLE_STATUSES)[number];
export type CustomerFeedback = (typeof CUSTOMER_FEEDBACK)[number];
export type ApplicationType = (typeof APPLICATION_TYPES)[number];
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export const LABEL: Record<string, string> = {
  // stage
  NEW: "New",
  IN_PROGRESS: "In progress",
  QUOTES_SHARED: "Quotes shared",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  // outreach
  NOT_CONTACTED: "Not contacted",
  EMAIL_PREPARED: "Email prepared",
  CONTACTED: "Contacted",
  REPLIED: "Replied",
  FOLLOW_UP_NEEDED: "Follow-up needed",
  // commercial
  AWAITING_QUOTE: "Awaiting quote",
  QUOTE_RECEIVED: "Quote received",
  REVIEWING: "Reviewing",
  SHARED_WITH_CUSTOMER: "Shared with customer",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  EXPIRED: "Expired",
  // sample
  NOT_REQUESTED: "Not requested",
  REQUESTED: "Requested",
  APPROVED: "Approved",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  // feedback
  AWAITING_FEEDBACK: "Awaiting feedback",
  CHANGES_REQUESTED: "Changes requested",
  REJECTED: "Rejected",
  // applications
  PENDING: "Pending",
  CONTACTED_APP: "Contacted",
  AUTHORIZED: "Extraction authorized",
  EXTRACTING: "Extracting",
  IN_REVIEW: "Products in review",
  PUBLISHED: "Published",
  CLOSED: "Closed",
  LISTING: "List your company",
  PRODUCT_FETCH: "Fetch products",
  PARTNERSHIP: "Partnership",
  // meetings
  BOOKING_PENDING: "Booking pending",
  BOOKED: "Booked",
  HELD: "Held",
  NO_SHOW: "No-show",
};

export function label(value: string | null | undefined): string {
  if (!value) return "—";
  return LABEL[value] ?? value;
}

/** Tone for a status chip: what needs the team's attention vs. done vs. stopped. */
export function tone(value: string): "attention" | "progress" | "done" | "stopped" | "neutral" {
  if (["NEW", "NOT_CONTACTED", "FOLLOW_UP_NEEDED", "QUOTE_RECEIVED", "REPLIED", "PENDING", "CHANGES_REQUESTED", "REQUESTED"].includes(value))
    return "attention";
  if (["IN_PROGRESS", "EMAIL_PREPARED", "CONTACTED", "AWAITING_QUOTE", "REVIEWING", "APPROVED", "DISPATCHED", "REVIEWING", "AUTHORIZED", "EXTRACTING", "IN_REVIEW", "BOOKING_PENDING", "BOOKED", "AWAITING_FEEDBACK"].includes(value))
    return "progress";
  if (["COMPLETED", "QUOTES_SHARED", "SHARED_WITH_CUSTOMER", "ACCEPTED", "DELIVERED", "PUBLISHED", "HELD"].includes(value)) return "done";
  if (["CANCELLED", "DECLINED", "EXPIRED", "REJECTED", "CLOSED", "NO_SHOW"].includes(value)) return "stopped";
  return "neutral";
}

/**
 * What the buyer sees for one supplier line. The buyer never sees internal
 * outreach detail — only whether we're contacting the supplier, waiting, or
 * have a quote for them.
 */
export function customerSupplierStatus(outreach: string, commercial: string): string {
  if (commercial === "SHARED_WITH_CUSTOMER") return "Quote ready";
  if (commercial === "ACCEPTED") return "Accepted";
  if (commercial === "DECLINED") return "Supplier declined";
  if (commercial === "EXPIRED") return "Quote expired";
  if (commercial === "QUOTE_RECEIVED" || commercial === "REVIEWING") return "Quote received — we're reviewing it";
  if (outreach === "NOT_CONTACTED" || outreach === "EMAIL_PREPARED") return "We're contacting the supplier";
  return "Waiting for the supplier's quote";
}

/** Commercial statuses whose offer the buyer may see. */
export function quoteVisibleToCustomer(commercial: string): boolean {
  return commercial === "SHARED_WITH_CUSTOMER" || commercial === "ACCEPTED";
}

/** Overall stage derived from supplier lines, used when the team hasn't set one by hand. */
export function suggestedStage(lines: { outreachStatus: string; commercialStatus: string }[]): RequestStage {
  if (lines.length === 0) return "NEW";
  const closed = ["ACCEPTED", "DECLINED", "EXPIRED"];
  if (lines.every((l) => closed.includes(l.commercialStatus))) return "COMPLETED";
  if (lines.some((l) => l.commercialStatus === "SHARED_WITH_CUSTOMER" || l.commercialStatus === "ACCEPTED"))
    return "QUOTES_SHARED";
  if (lines.some((l) => l.outreachStatus !== "NOT_CONTACTED")) return "IN_PROGRESS";
  return "NEW";
}
