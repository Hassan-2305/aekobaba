import { redirect } from "next/navigation";

// /admin is guarded by middleware; the quote workspace is the landing
// surface.

export default function AdminIndexPage() {
  redirect("/admin/quotes");
}
