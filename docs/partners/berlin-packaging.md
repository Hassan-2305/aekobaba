# Berlin Packaging — featured partner research

Captured 2026-10-02. Every figure below is shown on Aekobaba only with its source link and this date.
Re-verify prices before any campaign: Berlin's web prices change (the same SKU appeared at different
prices in pages cached on different days).

## Positioning (verified)

| Claim                                                                                                                           | Source                                                             |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| "World's Largest Hybrid Container and Packaging Supplier"; plastic, glass and metal containers, closures and dispensing systems | https://www.berlinpackaging.com/                                   |
| Free shipping over $300 (qualifying online orders)                                                                              | https://www.berlinpackaging.com/                                   |
| 100+ locations worldwide; 1,700+ global suppliers; 2,000+ employees                                                             | https://www.gcimagazine.com/home/company/21163018/berlin-packaging |
| Studio One Eleven: package and brand design at no charge in exchange for packaging business                                     | https://www.berlinpackaging.com/innovation/                        |
| Trustpilot 4.4 / 5 from 4,779 reviews (77% five-star)                                                                           | https://www.trustpilot.com/review/berlinpackaging.com              |

Not shown (could not verify on a source page this session): 50,000+ SKUs (an older Berlin page says
35,000+), 225+ packaging awards, ISO 9001, 99% on-time delivery, the full markets list. Add them once
Berlin sends a source we can link.

## What reviewers praise (Trustpilot, recurring themes)

Easy website and checkout; no large minimums ("works perfect for us as we are small-batch producers");
fast shipping and order processing; reasonable shipping cost. Recurring criticism: stock-outs on some items
and fulfilment speed. Berlin replies to ~100% of negative reviews.

## Listings seeded (10 SKUs — the CPG/food staples their shop features most)

| SKU        | Product                                                    | Web price (captured)           | Basis |
| ---------- | ---------------------------------------------------------- | ------------------------------ | ----- |
| 3351B09-B  | 8 oz Clear PET Honey Bear Bottle (cap not included)        | $0.53                          | each  |
| 3351B09    | 8 oz Clear PET Honey Bear Bottle, yellow flip-top cap      | $1.25                          | each  |
| 33512      | 8 oz Clear PET Honey Bear Bottle, flip-top cap             | $1.37                          | each  |
| 343936     | 4 oz Clear PET Wide Mouth Packer Bottle (cap not included) | $0.42                          | each  |
| 2310B07BLK | 16 oz Clear PET Spice Jar, black cap                       | $2.43                          | each  |
| 2310B05WHT | 8 oz Clear PET Spice Jar, white cap + sifter               | $1.68                          | each  |
| 322420-B   | 4 oz Clear PET Spice Jar, red cap                          | $0.63                          | each  |
| 34317-B    | 16 oz Clear PET General Purpose Jar (cap separate)         | $0.88                          | each  |
| 3301B08-B  | 8 oz White HDPE Wide Mouth Jar (cap separate)              | $0.73                          | each  |
| 337048     | 3.5 oz 100% PCR Aluminum Packer Bottle                     | not shown → "Ask the supplier" | —     |

MOQ and lead time are not published per item on these pages → shown as "Not published".
Re-checked 2026-10-06: the product pages show price and "Bulk pricing is not available for this
item" but no MOQ, case quantity or lead time; two featured SKUs (3351B09-B, 322420-K) read
"Currently unavailable. We do not have an estimated date this item will be back in stock."
Samples exist for some items (e.g. YSP4SQ-SAM) but are not verified per listing → sample requests go
through the inquiry form with "we'll ask them for you".

## Closing the data gaps (partner program, Oct 2026)

Berlin fills in `docs/partners/berlin-packaging-data-request.csv` (one row per listed SKU: MOQ,
lead time, case pack, pallet quantity, stock). Paste each answer into
`src/lib/catalog/partner-facts.ts` with the date they sent it. Values render labelled
"Supplied by Berlin Packaging, <date>" — never as captured from their page — and only fill gaps;
anything their page publishes still wins. Also ask for:

- Legal entity name (verification gate 1 — the remaining blocker for the Recommended tier).
- Restock dates for any featured SKU that is out of stock.
- Hero product photography at full resolution (partner photography perk).

## Partner program surfaces (live in the app)

- "Partner" badge + "Sponsored" tag on every paid placement; disclosure text in `tier-badge.tsx`.
- Sponsored slot on results: "Featured in <category>" (results-view.tsx).
- Branded storefront: `/suppliers/berlin-packaging` (logo, brand red, photo showcase).
- Invite-only partner collection: `/partners`.
- Lead dashboard (demo, live + labelled sample data): `/suppliers/berlin-packaging/dashboard`,
  with the lead inbox preview at `/suppliers/berlin-packaging/inbox-preview`.

## Next for the partnership

1. Listings now use Berlin's own product photos ("Supplier photo"). Premium perk: shoot or retouch
   their hero products at high resolution for the storefront.
2. A product feed (SKU, price, case quantity, stock status) would keep prices current automatically.
3. Confirm legal entity name → completes verification gate 1 for the Recommended tier.
