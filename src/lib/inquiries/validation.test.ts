import { describe, expect, it } from "vitest";

import {
  designFileError,
  inquiryDescription,
  inquiryFieldErrors,
  inquiryReference,
  inquirySchema,
  MAX_DESIGN_BYTES,
} from "./validation";

const base = {
  kind: "QUOTE",
  productId: "prod_1",
  name: "Asha Rao",
  email: "Asha@Brand.com ",
  quantity: "5,000 pouches",
  designStatus: "READY",
  description: "250g coffee, matte black, one-colour logo.",
};

describe("inquirySchema", () => {
  it("accepts a minimal valid request and normalises fields", () => {
    const parsed = inquirySchema.parse({ ...base, website: "brand.com", company: "" });
    expect(parsed.email).toBe("asha@brand.com");
    expect(parsed.website).toBe("https://brand.com/");
    expect(parsed.company).toBeNull();
    expect(parsed.phone).toBeNull();
  });

  it("rejects missing essentials with field-keyed messages", () => {
    const result = inquirySchema.safeParse({
      ...base,
      name: "",
      email: "nope",
      quantity: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = inquiryFieldErrors(result.error);
      expect(errors.name).toBeTruthy();
      expect(errors.email).toBeTruthy();
      expect(errors.quantity).toBeTruthy();
    }
  });

  it("keeps the design question and description optional", () => {
    const parsed = inquirySchema.parse({ ...base, designStatus: undefined, description: undefined });
    expect(parsed.designStatus).toBeNull();
    expect(parsed.description).toBe("");
    expect(inquirySchema.parse({ ...base, designStatus: "" }).designStatus).toBeNull();
  });

  it("accepts a share link for large artwork and stores it with the description", () => {
    const parsed = inquirySchema.parse({ ...base, fileLink: "wetransfer.com/downloads/abc" });
    expect(parsed.fileLink).toBe("https://wetransfer.com/downloads/abc");
    expect(inquiryDescription(parsed)).toBe(
      "250g coffee, matte black, one-colour logo.\n\nArtwork link: https://wetransfer.com/downloads/abc",
    );
    expect(inquirySchema.safeParse({ ...base, fileLink: "not a link" }).success).toBe(false);
  });

  it("rejects an invalid website and an unknown design status", () => {
    expect(inquirySchema.safeParse({ ...base, website: "not a site" }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...base, designStatus: "MAYBE" }).success).toBe(false);
  });

  it("accepts sample requests", () => {
    expect(inquirySchema.parse({ ...base, kind: "SAMPLE", quantity: "2 samples" }).kind).toBe(
      "SAMPLE",
    );
  });
});

describe("designFileError", () => {
  it("allows no file and common design formats", () => {
    expect(designFileError(null)).toBeNull();
    expect(designFileError({ name: "label.PDF", type: "application/pdf", size: 1000 })).toBeNull();
    expect(designFileError({ name: "art.ai", type: "", size: 1000 })).toBeNull();
  });

  it("rejects other types and oversized files", () => {
    expect(
      designFileError({ name: "virus.exe", type: "application/octet-stream", size: 10 }),
    ).toMatch(/Upload a/);
    expect(
      designFileError({ name: "big.pdf", type: "application/pdf", size: MAX_DESIGN_BYTES + 1 }),
    ).toMatch(/4 MB/);
  });
});

it("builds a short uppercase reference", () => {
  expect(inquiryReference("cmabc123def456gh")).toBe("DEF456GH");
});
