// Supplier review overviews — what the review platforms publish about each
// supplier, captured on a date and linked to the source page.
//
// What is stored here, and why:
//  - Facts the platform shows: score, review count, star distribution, the
//    company's reply rate. Facts are not anyone's copyright.
//  - Highlights: recurring praise and complaints, SUMMARISED IN OUR OWN
//    WORDS across many reviews. They are never quotes, and the page says so.
//
// Individual review texts are NOT copied here: Trustpilot and Google forbid
// scraping and republishing their reviews. Real review cards are pulled live
// through the platforms' official APIs instead (src/lib/reviews/*), with the
// attribution those APIs require, once API keys are configured.

export interface StarDistribution {
  /** Percent of reviews per star rating, as the platform shows it (0.5 = "<1%"). */
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

export interface PlatformOverview {
  platform: "Trustpilot" | "Google";
  score: number;
  reviewCount: number;
  stars: StarDistribution | null;
  /** The company's reply behaviour as the platform states it. */
  replies: string | null;
  sourceUrl: string;
  capturedAt: string;
}

export interface ReviewInsights {
  overviews: PlatformOverview[];
  /** Our summary of recurring themes — empty when too few reviews to summarise. */
  praise: string[];
  concerns: string[];
  /** Where the summary was drawn from, e.g. "4,807 Trustpilot reviews". */
  summarisedFrom: string | null;
}

const TP = (
  slug: string,
  score: number,
  reviewCount: number,
  stars: StarDistribution | null,
  replies: string | null,
): PlatformOverview => ({
  platform: "Trustpilot",
  score,
  reviewCount,
  stars,
  replies,
  sourceUrl: `https://www.trustpilot.com/review/${slug}`,
  capturedAt: "2026-10-14",
});

const insights = (
  overview: PlatformOverview,
  praise: string[],
  concerns: string[],
): ReviewInsights => ({
  overviews: [overview],
  praise,
  concerns,
  summarisedFrom:
    praise.length || concerns.length
      ? `${overview.reviewCount.toLocaleString("en-US")} ${overview.platform} reviews`
      : null,
});

/** Captured 14 Oct 2026 from each supplier's Trustpilot page. */
export const REVIEW_INSIGHTS: Record<string, ReviewInsights> = {
  "berlin-packaging": insights(
    TP("berlinpackaging.com", 4.4, 4807, { 5: 77, 4: 8, 3: 5, 2: 3, 1: 7 }, "Replies to 92% of negative reviews, usually within 2 weeks"),
    ["Easy website and simple online ordering", "Consistent quality and a wide selection", "Fair prices; free shipping on larger orders"],
    ["Shipping and freight charges", "Delays when the warehouse is backed up", "Popular items going out of stock"],
  ),
  "bottlestore-com": insights(
    TP("bottlestore.com", 4.4, 3549, { 5: 81, 4: 9, 3: 4, 2: 3, 1: 3 }, "Replies to 6% of negative reviews, usually within 24 hours"),
    ["Durable bottles and lids", "Competitive prices, good value", "Careful packing and quick delivery"],
    ["Slow processing and shipping delays", "Occasional broken bottles on arrival", "Limited tracking updates"],
  ),
  "burch-bottle": insights(
    TP("www.burchbottle.com", 4.9, 2552, { 5: 90, 4: 5, 3: 2, 2: 1, 1: 2 }, "Replies to 90% of negative reviews, usually within 48 hours"),
    ["Friendly, reachable customer service", "Quality glass, well packed", "Straightforward ordering, fair prices"],
    ["Shipping costs", "Slow packing, occasional delays", "Some items arriving damaged"],
  ),
  "container-and-packaging": insights(
    TP("www.containerandpackaging.com", 4.8, 638, { 5: 95, 4: 1, 3: 1, 2: 0.5, 1: 3 }, "Replies to 100% of negative reviews, usually within 1 week"),
    ["Knowledgeable, responsive service team", "Smooth ordering and on-time shipping", "Fair prices and consistent quality"],
    ["Strict return and refund policy", "Website listings not always matching items", "Occasional communication gaps"],
  ),
  "custom-boxes-now": insights(
    TP("customboxesnow.com", 3.7, 186, { 5: 83, 4: 10, 3: 4, 2: 1, 1: 2 }, "Does not reply to negative reviews"),
    ["Helpful, knowledgeable staff", "Quick order turnaround", "Wrong orders put right fairly"],
    ["Limited help with artwork files", "Pallet labelling unclear on delivery", "Few reviews in the past year"],
  ),
  ecoenclose: insights(
    TP("ecoenclose.com", 4.5, 61, { 5: 85, 4: 6, 3: 2, 2: 0, 1: 7 }, "Replies to 50% of negative reviews, usually within 1 week"),
    ["Helpful customer service", "Quality eco-friendly packaging", "Easy ordering, help with urgent orders"],
    ["Prices on the higher side", "An adhesive problem on one order", "A late shipment and a missed order"],
  ),
  "paper-mart": insights(
    TP("www.papermart.com", 4.7, 9922, { 5: 87, 4: 6, 3: 3, 2: 1, 1: 3 }, "Replies to 94% of negative reviews, usually within 24 hours"),
    ["Wide range at reasonable prices", "Fast, reliable delivery", "Easy ordering and friendly support"],
    ["Delivery charges on regular orders", "Return shipping can cost more than the item", "Missing or poorly packed items on some orders"],
  ),
  "sks-bottle": insights(
    TP("www.sks-bottle.com", 4.6, 4139, { 5: 71, 4: 8, 3: 5, 2: 5, 1: 11 }, "Replies to 82% of negative reviews, usually within 24 hours"),
    ["Fast shipping", "Helpful, responsive service", "Well packed, arrives undamaged"],
    ["Website ordering glitches", "Shipping costs and free-shipping thresholds", "Limited options such as lid colours"],
  ),
  "specialty-bottle": insights(
    TP("specialtybottle.com", 4.4, 12, { 5: 67, 4: 8, 3: 0, 2: 8, 1: 17 }, null),
    ["Quick turnaround", "Mostly helpful service", "Competitive prices, no minimums"],
    ["Missing, wrong or damaged items", "Unhelpful staff in some cases", "Poorly fitting lids, late deliveries"],
  ),
  "sticker-mule": insights(
    TP("stickermule.com", 4.7, 44132, { 5: 91, 4: 3, 3: 2, 2: 1, 1: 3 }, "Replies to 90% of negative reviews, usually within 24 hours"),
    ["Print quality and vivid colour", "Fast turnaround and delivery", "Responsive communication"],
    ["Items smaller than expected", "Adhesive strength and residue", "Occasional artwork or packaging issues"],
  ),
  stickerapp: insights(
    TP("stickerapp.com", 4.7, 20748, { 5: 86, 4: 5, 3: 3, 2: 2, 1: 4 }, "Replies to 100% of negative reviews, usually within 48 hours"),
    ["Vivid colours, durable materials", "Fast production and delivery", "Simple online ordering"],
    ["Backing hard to peel", "Cut or size not as expected", "Occasional colour mismatch or delay"],
  ),
  tricorbraun: insights(
    TP("tricorbraun.com", 4.5, 255, { 5: 87, 4: 6, 3: 0.5, 2: 1, 1: 6 }, "Has not replied to negative reviews"),
    ["Fast shipping and turnaround", "Well packed, arrives undamaged", "Helpful service staff"],
    ["Long waits for in-store pickup", "Orders sometimes slow to be ready", "Some shipments lacked padding"],
  ),
  "the-packaging-lab": insights(
    TP("thepkglab.com", 4.8, 324, { 5: 95, 4: 2, 3: 0, 2: 0.5, 1: 2 }, "Replies to 100% of negative reviews, usually within 24 hours"),
    ["Fast production turnaround", "Accurate colour and print quality", "Responsive, professional service"],
    ["Slow follow-up on a custom quote", "Print darker than expected on one order", "A recent complaint about the order experience"],
  ),
  // One review is not a pattern: count shown, no summary.
  boxup: insights(TP("boxup.com", 3.7, 1, null, null), [], []),
};

export function reviewInsights(slug: string): ReviewInsights | null {
  return REVIEW_INSIGHTS[slug] ?? null;
}

/** "<1%" for the platform's sub-1% rows. */
export function formatStarPercent(pct: number): string {
  return pct > 0 && pct < 1 ? "<1%" : `${Math.round(pct)}%`;
}
