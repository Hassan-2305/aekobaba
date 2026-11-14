// Video reviews a supplier has supplied: customer testimonials and product
// showcases, hosted under /suppliers/<slug>/videos/. They come from the
// supplier, not from an independent review platform, and the reviews section
// labels them that way.

export interface SupplierVideo {
  src: string;
  poster: string;
  /** Short caption under the video. */
  title: string;
  kind: "Customer testimonial" | "Product showcase";
  /** Length in seconds. */
  seconds: number;
}

export interface SupplierVideoSet {
  /** Who provided the videos and when — shown under the strip. */
  source: string;
  videos: SupplierVideo[];
}

const v = (slug: string, n: number, title: string, kind: SupplierVideo["kind"], seconds: number): SupplierVideo => ({
  src: `/suppliers/${slug}/videos/review-${n}.mp4`,
  poster: `/suppliers/${slug}/videos/review-${n}.jpg`,
  title,
  kind,
  seconds,
});

export const SUPPLIER_VIDEOS: Record<string, SupplierVideoSet> = {
  print247: {
    source: "Supplied by Print247 to Aekobaba, Nov 2026",
    videos: [
      v("print247", 1, "A brand owner on the proofs and finished pouches", "Customer testimonial", 62),
      v("print247", 6, "A customer shows his printed resealable pouches", "Customer testimonial", 39),
      v("print247", 2, "Customer interview at the Print247 trade-show booth", "Customer testimonial", 15),
      v("print247", 3, "Customer feedback at a cannabis trade show", "Customer testimonial", 25),
      v("print247", 5, "Interview at the Print247 booth", "Customer testimonial", 38),
      v("print247", 7, "Unboxing a custom rigid gift box", "Product showcase", 49),
      v("print247", 4, "Pouches, labels and boxes on the Print247 stand", "Product showcase", 43),
    ],
  },
};

export function supplierVideos(slug: string): SupplierVideoSet | null {
  return SUPPLIER_VIDEOS[slug] ?? null;
}

export function formatSeconds(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}
