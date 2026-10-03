import Image from "next/image";

// One product picture, lit for each theme.
//
// Light: the studio packshot, multiplied into its warm well (`packshot`).
// Dark:  the same frame as a transparent cut-out (public/products/cutouts —
//        same canvas, so framing and scale are identical), standing on the
//        dark surface with a real shadow. A packshot's white sweep cannot
//        sit on graphite; the cut-out can.
// Images without a cut-out (e.g. future supplier photography) render as-is.

export function cutoutFor(src: string): string | null {
  const packshot = /^\/products\/([a-z0-9-]+)\.png$/.exec(src);
  if (packshot) return `/products/cutouts/${packshot[1]}.webp`;
  // Partner photography keeps a cut-out beside it: /partners/<slug>/cutouts/<file>.webp
  const partner = /^\/partners\/([a-z0-9-]+)\/([A-Za-z0-9._-]+)\.(webp|jpg|png)$/.exec(src);
  if (partner) return `/partners/${partner[1]}/cutouts/${partner[2]}.webp`;
  return null;
}

/** Representative (generated) imagery vs real supplier photography. */
export function isRepresentativeImage(src: string): boolean {
  return !src.startsWith("/partners/");
}

export function ProductPicture({
  src,
  alt,
  sizes,
  className = "",
  priority,
}: {
  src: string;
  alt: string;
  sizes: string;
  /** Layout classes shared by both renderings (padding, transforms). */
  className?: string;
  priority?: boolean;
}) {
  const cutout = cutoutFor(src);
  if (!cutout) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={`packshot object-contain ${className}`}
      />
    );
  }
  return (
    <>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={`packshot object-contain dark:hidden ${className}`}
      />
      <Image
        src={cutout}
        alt={alt}
        fill
        sizes={sizes}
        className={`hidden object-contain brightness-[0.92] drop-shadow-[0_16px_18px_rgba(0,0,0,0.55)] dark:block ${className}`}
      />
    </>
  );
}
