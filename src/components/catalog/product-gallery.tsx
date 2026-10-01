import Image from "next/image";

import type { ProductImageVM } from "@/lib/catalog/view-models";

// Product gallery (spec art_AjaTUf9x): renders the product's actual Image
// rows — primary large in the warm image well, remaining rows as a thumbnail
// strip. No invented views: today the seed writes exactly one row, so the
// strip is hidden; when real supplier photography lands as new rows, the
// gallery grows with the data. The visible "Representative image" caption is
// the honesty rule.

export function ProductGallery({ images, title }: { images: ProductImageVM[]; title: string }) {
  if (images.length === 0) return null;

  const [primary, ...rest] = images;
  const altFor = (image: ProductImageVM) => image.alt ?? `${title} — representative packaging image`;

  return (
    <figure data-testid="product-gallery">
      <div className="relative aspect-square overflow-hidden bg-well">
        <Image
          src={primary.url}
          alt={altFor(primary)}
          fill
          priority
          sizes="(min-width: 1024px) 680px, 100vw"
          className="packshot object-contain p-10 sm:p-16"
        />
      </div>
      <figcaption data-testid="representative-image-caption" className="mt-3 text-xs text-ink-faint">
        Representative image — generated illustration, not a photo of the supplier&rsquo;s actual stock.
      </figcaption>

      {rest.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2" data-testid="gallery-thumbs">
          {rest.map((image) => (
            <div key={image.url} className="relative h-20 w-20 overflow-hidden bg-well">
              <Image src={image.url} alt={altFor(image)} fill sizes="80px" className="packshot object-contain p-2" />
            </div>
          ))}
        </div>
      ) : null}
    </figure>
  );
}
