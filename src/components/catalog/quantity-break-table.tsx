import { formatBreakRange, formatMoney, type CurrencyCode } from "@/lib/catalog/format";
import type { QuantityBreakVM } from "@/lib/catalog/view-models";

// Quantity-break table on the product detail page — the supplier's own
// published tiers, in the order they publish them (ascending by minimum).

export function QuantityBreakTable({
  breaks,
  currency = "USD",
  packSize = 1,
}: {
  breaks: QuantityBreakVM[];
  /** The listing's published currency (tiers are quoted in it). */
  currency?: CurrencyCode;
  /** Units per selling pack when the listing is sold by the case (tiers count cases). */
  packSize?: number;
}) {
  const byCase = packSize > 1;
  if (breaks.length === 0) return null;
  return (
    <div data-testid="quantity-breaks">
      <h3 className="text-sm font-medium text-ink">Quantity breaks</h3>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="border-y border-line text-left">
            <th scope="col" className="tag py-3 pr-4 font-semibold text-ink-faint">
              {byCase ? `Cases of ${packSize.toLocaleString("en-US")}` : "Quantity"}
            </th>
            <th scope="col" className="tag py-3 text-right font-semibold text-ink-faint">
              {byCase ? "Price per case" : "Unit price"}
            </th>
          </tr>
        </thead>
        <tbody>
          {breaks.map((brk, index) => (
            <tr key={`${brk.minQty}-${index}`} className="border-b border-line">
              <td className="py-3 pr-4 text-ink-muted tabular-nums">{formatBreakRange(brk.minQty, brk.maxQty)}</td>
              <td className="py-3 text-right font-medium text-ink tabular-nums">{formatMoney(brk.unitPrice, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
