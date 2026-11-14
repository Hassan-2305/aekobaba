"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { InquiryDialog, type InquiryDialogHandle } from "./inquiry-dialog";
import { formatMoney, formatMoqShort, formatUnitMoney, moqInUnits, priceCurrency } from "@/lib/catalog/format";
import { defaultQuantity, priceAtQuantity, type VariantVM } from "@/lib/catalog/related";
import { useQuoteBasketStore } from "@/lib/basket/store";
import { findSize, pricedAsSize, sizeLine, sizeMoq, sizesOf } from "@/lib/catalog/sizes";
import type { ProductVM } from "@/lib/catalog/view-models";
import { QuantityInput } from "./quantity-input";

// Configure before asking: pick a size (listings that bundle their sizes),
// a variant, a quantity and options, see what
// the published price comes to, then send it all as one quote request (or
// add it to the Quote Basket). Estimates use only what the supplier
// publishes; quote-only listings say so instead of showing a number.

interface OptionGroup {
  title: string;
  options: string[];
}

/** Options the listing actually offers, plus requests the buyer can always raise. */
function optionGroups(product: ProductVM): OptionGroup[] {
  if (product.section === "INGREDIENTS") {
    return [
      {
        title: "Ask the supplier about",
        options: ["Technical data sheet", "Sample for R&D", "Volume pricing", "Application support", "Regulatory documents"],
      },
    ];
  }
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
  const sizes = sizesOf(product);
  const [sizeLabel, setSizeLabel] = useState<string | null>(sizes[0]?.label ?? null);
  const size = findSize(product, sizeLabel);
  const minimum = sizeMoq(product, sizeLabel);
  const ingredient = product.section === "INGREDIENTS";
  // Ingredients are bought by weight; 25 kg (one bag) is only a starting figure the buyer edits.
  const [quantity, setQuantity] = useState(() => minimum.moq ?? (ingredient ? 25 : defaultQuantity(product)));
  const [chosen, setChosen] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [added, setAdded] = useState(false);

  const groups = useMemo(() => optionGroups(product), [product]);
  // Listings priced per size quote the chosen size's own price and tiers.
  const priced = pricedAsSize(product, sizeLabel);
  const estimate = priceAtQuantity(priced, quantity);
  const minimumItems = moqInUnits({ ...product, moq: minimum.moq, moqUnit: minimum.moqUnit });
  const belowMoq = minimumItems !== null && quantity < minimumItems;
  const variant = variants.find((v) => v.active);

  const summary = () => {
    const lines = [
      sizeLine(product, sizeLabel),
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
      quantity: kind === "QUOTE" ? `${quantity.toLocaleString("en-US")}${ingredient ? " kg" : ""}` : undefined,
      format: [sizeLabel, variant?.label, ...chosen.filter((c) => !c.startsWith("Custom printing"))]
        .filter(Boolean)
        .join(", "),
      description: summary(),
    });

  return (
    <div data-testid="product-configurator">
      {sizes.length > 0 ? (
        <fieldset className="mb-6" data-testid="size-picker">
          <legend className="tag text-ink-faint">
            Size{sizes.length > 1 ? ` — ${sizes.length} available` : ""}
            {sizeLabel ? <span className="ml-2 normal-case tracking-normal text-ink">{sizeLabel}</span> : null}
          </legend>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
            {sizes.map((option) => {
              const on = option.label === sizeLabel;
              return (
                <button
                  key={option.label}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  data-testid="size-option"
                  onClick={() => {
                    setSizeLabel(option.label);
                    const next = sizeMoq(product, option.label).moq;
                    if (next !== null) setQuantity((q) => Math.max(q, next));
                    setAdded(false);
                  }}
                  className={`min-w-[4.5rem] border px-3 py-2 text-xs font-medium transition-colors ${
                    on ? "border-ink bg-ink text-paper" : "border-line text-ink hover:border-ink"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {size ? (
            <div data-testid="size-details" className="mt-3 flex gap-4 border border-line bg-paper p-3">
              {size.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- small supplier thumbnail, already optimised webp
                <img src={size.imageUrl} alt={`${product.title}, ${size.label}`} className="h-20 w-20 flex-none object-contain" />
              ) : null}
              <dl className="grid min-w-0 flex-1 grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                {size.sku ? (
                  <>
                    <dt className="text-ink-faint">Item no.</dt>
                    <dd className="font-mono text-ink">{size.sku}</dd>
                  </>
                ) : null}
                {size.specs.map((row) => (
                  <div key={row.name} className="contents">
                    <dt className="text-ink-faint">{row.name}</dt>
                    <dd className="text-ink tabular-nums">{row.value}</dd>
                  </div>
                ))}
                {size.basePrice != null ? (
                  <>
                    <dt className="text-ink-faint">Price</dt>
                    <dd className="text-ink tabular-nums" data-testid="size-price">
                      {(size.quantityBreaks?.length ? size.quantityBreaks : [{ minQty: minimum.moq ?? 1, maxQty: null, unitPrice: size.basePrice }])
                        .map((b) => `${formatUnitMoney(b.unitPrice, priceCurrency(product.priceBasis))} at ${b.minQty.toLocaleString("en-US")}+`)
                        .join(" · ")}
                    </dd>
                  </>
                ) : null}
                <dt className="text-ink-faint">Minimum order</dt>
                <dd className={minimum.moq === null ? "text-ink-faint" : "text-ink tabular-nums"}>
                  {minimum.moq === null ? "Not published" : formatMoqShort(minimum.moq, minimum.moqUnit)}
                </dd>
                {size.sourceUrl ? (
                  <>
                    <dt className="text-ink-faint">Source</dt>
                    <dd>
                      <a
                        href={size.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ink underline decoration-ink/25 underline-offset-[3px] hover:decoration-orange"
                      >
                        This size on {product.supplier.name}&rsquo;s site &#8599;
                      </a>
                    </dd>
                  </>
                ) : null}
              </dl>
            </div>
          ) : null}
        </fieldset>
      ) : null}
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
          <span className="tag text-ink-faint">{ingredient ? "Quantity (kg)" : "Quantity"}</span>
          <QuantityInput
            value={quantity}
            onCommit={setQuantity}
            testId="config-quantity"
            className="mt-1.5 block h-11 w-full border border-line bg-paper px-3 text-sm text-ink tabular-nums focus:border-ink focus:outline-none"
          />
          {belowMoq ? (
            <span className="mt-1 block text-xs text-warning-ink">
              Below the {formatMoqShort(minimum.moq, minimum.moqUnit)}
              {minimumItems !== minimum.moq ? ` (${minimumItems!.toLocaleString("en-US")} items)` : ""} minimum — you can
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
            placeholder={
              ingredient
                ? "Your application, target volume per year, delivery location…"
                : "Artwork status, target date, delivery location…"
            }
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
            addProduct(product, quantity, sizeLabel);
            setAdded(true);
          }}
          className="h-12 border border-line px-5 text-sm font-medium text-ink transition-colors hover:border-ink"
        >
          {added ? "In Quote Basket ✓" : "Add to Quote Basket"}
        </button>
      </div>
      <p className="mt-2.5 text-xs text-ink-faint">
        Your {sizes.length > 0 ? "size, " : ""}variant, quantity and options go with the request to {product.supplier.name}. No account
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
