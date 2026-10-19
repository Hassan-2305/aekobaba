import type { Metadata } from "next";

import { MyRequestsView } from "@/components/quotes/my-requests-view";

// Quote and sample requests sent from product pages in this browser (no
// account needed), with their live status.

export const metadata: Metadata = {
  title: "Product requests — Aekobaba",
  description: "Your quote and sample requests from product pages, with their status.",
};

export default function ProductRequestsPage() {
  return <MyRequestsView />;
}
