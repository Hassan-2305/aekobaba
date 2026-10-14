import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SupplierReviewsView } from "./supplier-reviews";
import { formatStarPercent, REVIEW_INSIGHTS } from "@/lib/catalog/review-insights";
import { trustpilotDomain } from "@/lib/reviews/live";

const render = (node: React.ReactElement) => renderToStaticMarkup(node).replace(/<!-- -->/g, "");
const berlin = {
  name: "Berlin Packaging",
  slug: "berlin-packaging",
  reviewScore: 4.4,
  reviewCount: 4807,
  reviewPlatform: "Trustpilot",
  reviewUrl: "https://www.trustpilot.com/review/berlinpackaging.com",
};

describe("SupplierReviewsView", () => {
  it("shows the rating, star distribution, our summary and the platform link", () => {
    const html = render(createElement(SupplierReviewsView, { supplier: berlin, insights: REVIEW_INSIGHTS["berlin-packaging"], live: [] }));
    expect(html).toContain("Berlin Packaging reviews");
    expect(html).toContain("not of this");
    expect(html).toContain('data-testid="reviews-distribution"');
    expect(html).toContain("77%");
    expect(html).toContain("Summarised by Aekobaba from 4,807 Trustpilot reviews");
    expect(html).toContain("our wording, not quotes");
    expect(html).toContain('href="https://www.trustpilot.com/review/berlinpackaging.com"');
    expect(html).toContain('data-testid="reviews-cards-pending"');
  });

  it("renders live API review cards with platform and author attribution", () => {
    const html = render(
      createElement(SupplierReviewsView, {
        supplier: berlin,
        insights: null,
        live: [
          {
            platform: "Google",
            rating: 4.6,
            reviewCount: 120,
            url: "https://maps.google.com/?cid=1",
            reviews: [
              { platform: "Google", rating: 5, title: null, text: "Great service.", author: "A. Buyer", authorUrl: "https://maps.google.com/u/1", date: "2026-09-01T00:00:00Z", relativeTime: null, url: null },
            ],
          },
        ],
      }),
    );
    expect(html).toContain('data-testid="reviews-cards"');
    expect(html).toContain("via Google");
    expect(html).toContain("A. Buyer");
    expect(html).toContain("Great service.");
  });

  it("says plainly when a supplier has no reviews", () => {
    const html = render(
      createElement(SupplierReviewsView, {
        supplier: { ...berlin, name: "New Co", reviewScore: null, reviewCount: 0, reviewPlatform: null, reviewUrl: null },
        insights: null,
        live: [],
      }),
    );
    expect(html).toContain('data-testid="reviews-empty"');
  });
});

describe("review data", () => {
  it("keeps summaries short and stars summing to ~100%", () => {
    for (const [slug, ins] of Object.entries(REVIEW_INSIGHTS)) {
      for (const t of [...ins.praise, ...ins.concerns]) expect(t.split(" ").length, slug).toBeLessThanOrEqual(9);
      const s = ins.overviews[0].stars;
      if (s) expect(s[5] + s[4] + s[3] + s[2] + s[1], slug).toBeGreaterThan(97);
    }
    expect(formatStarPercent(0.5)).toBe("<1%");
  });

  it("finds the Trustpilot domain from the review URL or website", () => {
    expect(trustpilotDomain("https://www.trustpilot.com/review/berlinpackaging.com", "")).toBe("berlinpackaging.com");
    expect(trustpilotDomain(null, "https://www.bottlestore.com")).toBe("www.bottlestore.com");
  });
});
