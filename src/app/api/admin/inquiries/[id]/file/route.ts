import { jsonError, requireApiRole } from "@/lib/auth/api";
import { db } from "@/lib/db";

// GET /api/admin/inquiries/[id]/file — download an inquiry's design file.
// ADMIN only (middleware does not guard /api/*); always served as an
// attachment so uploaded SVG/HTML-ish content never renders on our origin.

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("ADMIN");
  if (auth.kind === "deny") return jsonError(auth.status, auth.code);

  const { id } = await params;
  const file = await db.inquiryFile.findUnique({ where: { inquiryId: id } });
  if (!file) return jsonError(404, "not_found");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return new Response(Buffer.from(file.data), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Content-Length": String(file.size),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
