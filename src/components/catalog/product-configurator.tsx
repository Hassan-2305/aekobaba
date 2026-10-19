"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { InquiryDialog, type InquiryDialogHandle } from "./inquiry-dialog";
import { formatMoney, formatMoqShort, formatUnitMoney, moqInUnits } from "@/lib/catalog/format";
import { defaultQuantity, priceAtQuantity, type VariantVM } from "@/lib/catalog/related";
import { useQuoteBasketStore } from "@/lib/basket/store";
import type { ProductVM } from "@/lib/catalog/view-models";
import { QuantityInput } from "./quantity-input";

// Configure before asking: pick a variant, a quantity and options, see what
// the published price comes to, then send it all as one quote request (or
// add it to the Quote Basket). Estimates use only what the supplier
// publishes; quote-only listings say so instead of showing a number.

interface OptionGroup {
  title: string;
  options: string[];
}

/** Options the listing actually offers, plus requests the buyer can always raise. */
function optionGroups(product: ProductVM): OptionGroup[] {
  const s = product.specs;
  const groups: OptionGroup[] = [];
  const printing = [...new Set([...s.customization, ...s.printing])];
  if (printing.length) groups.push({ title: "Printing & customization", options: printing });
  if (s.finishes.length > 1) groups.push({ title: "Colour & finish", options: s.finishes });
  const closures = s.closures.filter((c) => c !== "Cap sold separately");
  if (closures.length) groups.push({ title: "Closure", options: closures });
  groups.push({
    title: "Ask the supplier about",
    options: ["Custom printing / my logo", "Custom size", "Different colour or finish", "Faster delivery"],
  });
  return groups;
}

export function ProductConfigurator({
  product,
  variants,
}: {
  product: ProductVM;
  variants: VariantVM[];
}) {
  const dialog = useRef<InquiryDialogHandle>(null);
  const addProduct = useQuoteBasketStore((s) => s.addProduct);
  const [quantity, setQuantity] = useState(defaultQuantity(product));
  const [chosen, setChosen] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [added, setAdded] = useState(false);

  const groups = useMemo(() => optionGroups(product), [product]);
  const estimate = priceAtQuantity(product, quantity);
  const minimumItems = moqInUnits(product);
  const belowMoq = minimumItems !== null && quantity < minimumItems;
  const variant = variants.find((v) => v.active);

  const summary = () => {
    const lines = [
      variant ? `Variant: ${variant.label}${variant.sku ? ` (${variant.sku})` : ""}` : null,
      chosen.length ? `Options: ${chosen.join(", ")}` : null,
      estimate
        ? `Published price at this quantity: ${formatUnitMoney(estimate.perUnit, estimate.currency)} / ${estimate.unit} (≈ ${formatMoney(estimate.total, estimate.currency)} total)`
        : null,
      notes.trim() || null,
    ];
    return lines.filter(Boolean).join("\n");
  };

  const open = (kind: "QUOTE" | "SAMPLE") =>
    dialog.current?.open(kind, {
      quantity: kind === "QUOTE" ? quantity.toLocaleString("en-US") : undefined,
      format: [variant?.label, ...chosen.filter((c) => !c.startsWith("Custom printing"))]
        .filter(Boolean)
        .join(", "),
      description: summary(),
    });

  return (
    <div data-testid="product-configurator">
      {variants.length > 1 ? (
        <fieldset>
          <legend className="tag text-ink-faint">Available variants ({variants.length})</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {variants.map((v) => (
              <Link
                key={v.id}
                href={`/products/${v.id}`}
                aria-current={v.active ? "true" : undefined}
                scroll={false}
                className={`border px-3 py-2 text-left text-xs transition-colors ${
                  v.active ? "border-ink bg-ink text-paper" : "border-line text-ink hover:border-ink"
                }`}
              >
                <span className="block font-medium">{v.label}</span>
                {v.sku ? (
                  <span className={`mt-0.5 block font-mono ${v.active ? "text-paper/70" : "text-ink-faint"}`}>
                    {v.sku}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className={`grid gap-4 sm:grid-cols-[minmax(0,180px)_1fr] ${variants.length > 1 ? "mt-6" : ""}`}>
        <label className="block">
          <span className="tag text-ink-faint">Quantity</span>
          <QuantityInput
            value={quantity}
            onCommit={setQuantity}
            testId="config-quantity"
            className="mt-1.5 block h-11 w-full border border-line bg-paper px-3 text-sm text-ink tabular-nums focus:border-ink focus:outline-none"
          />
          {belowMoq ? (
            <span className="mt-1 block text-xs text-warning-ink">
              Below the {formatMoqShort(product.moq, product.moqUnit)}
              {minimumItems !== product.moq ? ` (${minimumItems!.toLocaleString("en-US")} items)` : ""} minimum — you can
              still ask.
            </span>
          ) : null}
        </label>
        <div data-testid="config-estimate" className="self-end pb-1">
          {estimate ? (
            <>
              <p className="font-semiwide text-2xl font-medium tracking-tight text-ink tabular-nums">
                ≈ {formatMoney(estimate.total, estimate.currency)}
              </p>
              <p className="text-xs text-ink-muted tabular-nums">
                {formatUnitMoney(estimate.perUnit, estimate.currency)} / {estimate.unit}
                {estimate.basis === "tier" ? ` · ${estimate.tierLabel} tier` : " · list price"} · estimate
                from the published price; the supplier&rsquo;s quote is final.
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-muted">
              No published price — the supplier quotes for your quantity and options.
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {groups.map((group) => (
          <fieldset key={group.title}>
            <legend className="tag text-ink-faint">{group.title}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {group.options.map((option) => {
                const on = chosen.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setChosen((c) => (on ? c.filter((x) => x !== option) : [...c, option]))}
                    className={`border px-2.5 py-1.5 text-xs transition-colors ${
                      on ? "border-orange bg-orange-tint text-ink" : "border-line text-ink-muted hover:border-ink hover:text-ink"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
        <label className="block">
          <span className="tag text-ink-faint">Notes for the supplier (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Artwork status, target date, delivery location…"
            className="mt-1.5 block w-full border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
          />
        </label>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          data-testid="get-quote"
          onClick={() => open("QUOTE")}
          className="h-12 bg-orange px-5 text-sm font-medium text-on-orange transition-colors hover:bg-orange-hi sm:col-span-1"
        >
          Get a quote
        </button>
        <button
          type="button"
          data-testid="get-sample"
          onClick={() => open("SAMPLE")}
          className="h-12 border border-ink/80 px-5 text-sm font-medium text-ink transition-colors hover:border-orange hover:text-orange-ink"
        >
          Get a sample
        </button>
        <button
          type="button"
          data-testid="add-to-basket"
          onClick={() => {
            addProduct(product, quantity);
            setAdded(true);
          }}
          className="h-12 border border-line px-5 text-sm font-medium text-ink transition-colors hover:border-ink"
        >
          {added ? "In Quote Basket ✓" : "Add to Quote Basket"}
        </button>
      </div>
      <p className="mt-2.5 text-xs text-ink-faint">
        Your variant, quantity and options go with the request to {product.supplier.name}. No account
        needed.
        {added ? (
          <>
            {" "}
            <Link href="/basket" className="text-ink underline decoration-orange underline-offset-4">
              Open Quote Basket
            </Link>
          </>
        ) : null}
      </p>
      <InquiryDialog ref={dialog} product={product} />
    </div>
  );
}
