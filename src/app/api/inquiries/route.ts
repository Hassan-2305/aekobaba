import { db } from "@/lib/db";
import { newAccessToken } from "@/lib/inquiries/access";
import {
  designFileError,
  inquiryDescription,
  inquiryFieldErrors,
  inquiryReference,
  inquirySchema,
} from "@/lib/inquiries/validation";

// POST /api/inquiries — "Get a quote" / "Get a sample" from a product page.
// Public (no account needed). multipart/form-data: the form fields plus an
// optional `design` file, stored with the inquiry for admins to download.
// A hidden honeypot field (`fax`, labelled "leave this field empty") silently
// drops naive bots. Artwork too large to attach arrives as `fileLink` and is
// stored with the description.

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "invalid_form" }, { status: 400 });
  }

  if (String(form.get("fax") ?? "").trim() !== "") {
    // Honeypot filled: pretend success, store nothing.
    return Response.json({ ok: true, reference: "RECEIVED" }, { status: 201 });
  }

  const text = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value : undefined;
  };

  const parsed = inquirySchema.safeParse({
    kind: text("kind"),
    productId: text("productId"),
    name: text("name"),
    email: text("email"),
    company: text("company"),
    website: text("website"),
    phone: text("phone"),
    quantity: text("quantity"),
    packagingType: text("packagingType"),
    format: text("format"),
    designStatus: text("designStatus"),
    description: text("description"),
    fileLink: text("fileLink"),
  });
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_fields", fields: inquiryFieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const upload = form.get("design");
  const file = upload instanceof File && upload.size > 0 ? upload : null;
  const fileError = designFileError(file);
  if (fileError)
    return Response.json({ error: "invalid_file", fields: { design: fileError } }, { status: 400 });

  const product = await db.product.findUnique({
    where: { id: parsed.data.productId },
    select: { id: true },
  });
  if (!product) return Response.json({ error: "unknown_product" }, { status: 404 });

  // The requester's browser keeps the token so the Quote Basket can show
  // this request's live status; only its hash is stored.
  const access = newAccessToken();

  const { fileLink, ...fields } = parsed.data;
  const inquiry = await db.inquiry.create({
    data: {
      ...fields,
      description: inquiryDescription({ description: fields.description, fileLink }),
      accessTokenHash: access.hash,
      ...(file
        ? {
            file: {
              create: {
                name: file.name.slice(-200),
                contentType: file.type || "application/octet-stream",
                size: file.size,
                data: new Uint8Array(await file.arrayBuffer()),
              },
            },
          }
        : {}),
    },
    select: { id: true },
  });

  return Response.json(
    { ok: true, id: inquiry.id, token: access.token, reference: inquiryReference(inquiry.id) },
    { status: 201 },
  );
}
