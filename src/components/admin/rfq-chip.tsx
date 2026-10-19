import { label, tone } from "@/lib/rfq/statuses";

// Status chip for the RFQ workspace: tone says whether it needs attention.

const TONES = {
  attention: "border-orange/40 bg-orange-tint text-orange-ink",
  progress: "border-line-strong bg-well text-ink",
  done: "border-success-ink/30 bg-success-tint text-success-deep",
  stopped: "border-line bg-paper text-ink-faint",
  neutral: "border-line bg-paper text-ink-muted",
} as const;

export function RfqChip({ value, prefix }: { value: string; prefix?: string }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${TONES[tone(value)]}`}>
      {prefix ? <span className="mr-1 text-ink-faint">{prefix}</span> : null}
      {label(value)}
    </span>
  );
}
