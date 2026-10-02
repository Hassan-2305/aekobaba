import type { Metadata } from "next";

import { MyRequestsView } from "@/components/quotes/my-requests-view";

// The Quote Basket: the quote and sample requests this browser has sent,
// with live status. Requests are stored in this browser (no account needed).

export const metadata: Metadata = {
  title: "Quote Basket — Aekobaba",
  description: "Your quote and sample requests, with their status.",
};

export default function BasketPage() {
  return <MyRequestsView />;
}
