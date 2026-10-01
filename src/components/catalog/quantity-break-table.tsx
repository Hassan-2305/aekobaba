import { formatBreakRange, formatMoney } from "@/lib/catalog/format";
import type { QuantityBreakVM } from "@/lib/catalog/view-models";

// Quantity-break table on the product detail page — the supplier's own
// published tiers, in the order they publish them (ascending by minimum).

export function QuantityBreakTable({ breaks }: { breaks: QuantityBreakVM[] }) {
  if (breaks.length === 0) return null;
  return (
    <div data-testid="quantity-breaks">
      <h3 className="text-sm font-medium text-ink">Quantity breaks</h3>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="border-y border-line text-left">
            <th scope="col" className="tag py-3 pr-4 font-semibold text-ink-faint">
              Quantity
            </th>
            <th scope="col" className="tag py-3 text-right font-semibold text-ink-faint">
              Unit price
            </th>
          </tr>
        </thead>
        <tbody>
          {breaks.map((brk, index) => (
            <tr key={`${brk.minQty}-${index}`} className="border-b border-line">
              <td className="py-3 pr-4 text-ink-muted tabular-nums">{formatBreakRange(brk.minQty, brk.maxQty)}</td>
              <td className="py-3 text-right font-medium text-ink tabular-nums">{formatMoney(brk.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
