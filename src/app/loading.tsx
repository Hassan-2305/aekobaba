// Instant navigation feedback. Next shows this skeleton the moment a link is
// clicked (and prefetches it for links in view), so a page change never
// looks frozen while its data loads. Shapes mirror the catalog pages: a
// dark title band, then a grid of product cards.

export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" data-testid="page-loading">
      <span className="sr-only">Loading…</span>
      <div className="grain border-b border-line-dark bg-void">
        <div className="mx-auto max-w-[1400px] px-5 pb-10 pt-12 sm:px-8 lg:px-12 lg:pb-12 lg:pt-16">
          <div className="skeleton h-3 w-32 bg-on-dark/10" />
          <div className="skeleton mt-6 h-10 w-[min(520px,80%)] bg-on-dark/10" />
          <div className="skeleton mt-4 h-4 w-[min(380px,60%)] bg-on-dark/10" />
        </div>
      </div>
      <div className="mx-auto max-w-[1400px] px-5 pb-24 pt-10 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="bg-card">
              <div className="skeleton aspect-square bg-well" />
              <div className="space-y-3 p-4">
                <div className="skeleton h-4 w-4/5 bg-line" />
                <div className="skeleton h-3 w-1/2 bg-line" />
                <div className="skeleton h-6 w-1/3 bg-line" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
