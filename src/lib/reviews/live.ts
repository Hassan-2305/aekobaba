import { unstable_cache } from "next/cache";

// Live supplier review cards from the platforms' OFFICIAL APIs — the only
// sanctioned way to show individual review texts on Aekobaba. Each source is
// switched on by its key and silently skipped without one:
//
//   GOOGLE_PLACES_API_KEY   Google Places API (New): place lookup by supplier
//                           name + location, then up to 5 reviews. Google
//                           requires showing "Google" and each author's name.
//   TRUSTPILOT_API_KEY      Trustpilot public Business Units API: business unit
//                           by domain, then the latest reviews. Trustpilot
//                           grants keys to businesses; a partner can provide
//                           theirs.
//
// Results are cached for 24 hours (short-lived, per the platforms' display
// terms) and any error returns no cards — the page never breaks on a review
// API. Nothing is written to the database.

export interface LiveReview {
  platform: "Google" | "Trustpilot";
  rating: number;
  title: string | null;
  text: string;
  author: string;
  authorUrl: string | null;
  /** ISO date, or null when the platform only gives a relative time. */
  date: string | null;
  relativeTime: string | null;
  url: string | null;
}

export interface LivePlatformReviews {
  platform: "Google" | "Trustpilot";
  rating: number | null;
  reviewCount: number | null;
  /** The platform's own page for this supplier (attribution link). */
  url: string | null;
  reviews: LiveReview[];
}

const DAY = 24 * 60 * 60;

async function getJson(url: string, init?: RequestInit): Promise<unknown | null> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Google Places API (New) ────────────────────────────────────────────────

interface GooglePlace {
  id?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: {
    rating?: number;
    text?: { text?: string };
    originalText?: { text?: string };
    authorAttribution?: { displayName?: string; uri?: string };
    publishTime?: string;
    relativePublishTimeDescription?: string;
    googleMapsUri?: string;
  }[];
}

export async function fetchGoogleReviews(
  name: string,
  location: string,
  key = process.env.GOOGLE_PLACES_API_KEY,
): Promise<LivePlatformReviews | null> {
  if (!key) return null;
  const search = (await getJson("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id",
    },
    body: JSON.stringify({ textQuery: `${name} ${location}`, pageSize: 1, languageCode: "en" }),
  })) as { places?: { id?: string }[] } | null;
  const placeId = search?.places?.[0]?.id;
  if (!placeId) return null;

  const place = (await getJson(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en`,
    {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "id,rating,userRatingCount,googleMapsUri,reviews",
      },
    },
  )) as GooglePlace | null;
  if (!place) return null;

  return {
    platform: "Google",
    rating: place.rating ?? null,
    reviewCount: place.userRatingCount ?? null,
    url: place.googleMapsUri ?? null,
    reviews: (place.reviews ?? [])
      .filter((r) => (r.text?.text ?? r.originalText?.text ?? "").trim() !== "")
      .map((r) => ({
        platform: "Google" as const,
        rating: r.rating ?? 0,
        title: null,
        text: (r.text?.text ?? r.originalText?.text ?? "").trim(),
        author: r.authorAttribution?.displayName ?? "Google user",
        authorUrl: r.authorAttribution?.uri ?? null,
        date: r.publishTime ?? null,
        relativeTime: r.relativePublishTimeDescription ?? null,
        url: r.googleMapsUri ?? place.googleMapsUri ?? null,
      })),
  };
}

// ─── Trustpilot Business Units API ──────────────────────────────────────────

interface TrustpilotReviews {
  reviews?: {
    stars?: number;
    title?: string;
    text?: string;
    createdAt?: string;
    consumer?: { displayName?: string };
    links?: { rel?: string; href?: string }[];
  }[];
}

export async function fetchTrustpilotReviews(
  domain: string,
  key = process.env.TRUSTPILOT_API_KEY,
): Promise<LivePlatformReviews | null> {
  if (!key || !domain) return null;
  const unit = (await getJson(
    `https://api.trustpilot.com/v1/business-units/find?name=${encodeURIComponent(domain)}&apikey=${encodeURIComponent(key)}`,
  )) as { id?: string } | null;
  if (!unit?.id) return null;
  const data = (await getJson(
    `https://api.trustpilot.com/v1/business-units/${encodeURIComponent(unit.id)}/reviews?perPage=6&orderBy=createdat.desc&language=en&apikey=${encodeURIComponent(key)}`,
  )) as TrustpilotReviews | null;
  if (!data) return null;
  const page = `https://www.trustpilot.com/review/${domain}`;
  return {
    platform: "Trustpilot",
    rating: null,
    reviewCount: null,
    url: page,
    reviews: (data.reviews ?? [])
      .filter((r) => (r.text ?? "").trim() !== "")
      .map((r) => ({
        platform: "Trustpilot" as const,
        rating: r.stars ?? 0,
        title: r.title?.trim() || null,
        text: (r.text ?? "").trim(),
        author: r.consumer?.displayName ?? "Trustpilot user",
        authorUrl: null,
        date: r.createdAt ?? null,
        relativeTime: null,
        url: r.links?.find((l) => l.rel === "reviews" || l.rel === "self")?.href ?? page,
      })),
  };
}

/** Domain Trustpilot files a supplier under, from its review page URL or website. */
export function trustpilotDomain(reviewUrl: string | null, website: string): string | null {
  const fromReview = reviewUrl ? /trustpilot\.com\/review\/([^/?#]+)/.exec(reviewUrl)?.[1] : null;
  if (fromReview) return fromReview;
  try {
    return website ? new URL(website).host : null;
  } catch {
    return null;
  }
}

/** All configured live sources for one supplier, cached 24 h. */
export const getLiveSupplierReviews = unstable_cache(
  async (
    name: string,
    location: string,
    reviewUrl: string | null,
    website: string,
  ): Promise<LivePlatformReviews[]> => {
    const domain = trustpilotDomain(reviewUrl, website);
    const results = await Promise.all([
      fetchTrustpilotReviews(domain ?? ""),
      fetchGoogleReviews(name, location),
    ]);
    return results.filter((r): r is LivePlatformReviews => r !== null && r.reviews.length > 0);
  },
  ["live-supplier-reviews"],
  { revalidate: DAY },
);
