"use client";

import { useRef } from "react";

import { InquiryDialog, type InquiryDialogHandle } from "./inquiry-dialog";
import type { ProductVM } from "@/lib/catalog/view-models";

// Product actions — two clear asks: get a quote, get a sample. Either opens
// the request form (no account needed). The sample request is always
// available; when the supplier has not published a sample policy the form
// says so plainly ("we'll ask them for you") instead of promising one.

export function ProductActions({ product }: { product: ProductVM }) {
  const dialog = useRef<InquiryDialogHandle>(null);

  return (
    <div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          data-testid="get-quote"
          onClick={() => dialog.current?.open("QUOTE")}
          className="h-12 bg-orange px-5 text-sm font-medium text-white transition-colors hover:bg-orange-hi"
        >
          Get a quote
        </button>
        <button
          type="button"
          data-testid="get-sample"
          onClick={() => dialog.current?.open("SAMPLE")}
          className="h-12 border border-ink/80 px-5 text-sm font-medium text-ink transition-colors hover:border-orange hover:text-orange-ink"
        >
          Get a sample
        </button>
      </div>
      <p className="mt-2.5 text-xs text-ink-faint">
        Tell us what you need — quantity, format, design — and we&rsquo;ll get it to{" "}
        {product.supplier.name}.
      </p>
      <InquiryDialog ref={dialog} product={product} />
    </div>
  );
}
