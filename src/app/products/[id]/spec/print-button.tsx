"use client";

/** Opens the browser's print dialog — "Save as PDF" gives a downloadable sheet. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 items-center bg-ink px-5 text-sm font-medium text-paper transition-colors hover:bg-ink/85 print:hidden"
    >
      Print / save as PDF
    </button>
  );
}
