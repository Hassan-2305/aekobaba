import { redirect } from "next/navigation";

// The request list lives on the account page now.
export default function QuoteRequestsPage() {
  redirect("/account#requests");
}
