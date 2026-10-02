import { SearchIcon } from "@/components/brand/icons";

// Search form — a plain GET form to /results; no client JS.
// `tone` matches the zone it sits in: dark editorial bands or light catalog.

export function SearchForm({
  size = "lg",
  tone = "dark",
  defaultValue,
  inputId,
  arrow = false,
  variant = "default",
}: {
  size?: "lg" | "sm";
  tone?: "dark" | "light";
  defaultValue?: string;
  /** Override when two forms of the same size share a page (themed heroes). */
  inputId?: string;
  /** Trailing arrow in the submit button. */
  arrow?: boolean;
  /** "studio": the light hero's search, sized and styled to the reference. */
  variant?: "default" | "studio";
}) {
  const studio = variant === "studio";
  const id = inputId ?? (size === "lg" ? "hero-search" : "small-search");
  const field =
    tone === "dark"
      ? "border-line-dark bg-surface/80 text-on-dark focus-within:border-orange"
      : "border-line bg-card text-ink focus-within:border-ink";
  const placeholder =
    tone === "dark" ? "placeholder:text-on-dark-muted/70" : "placeholder:text-ink-faint";

  return (
    <form action="/results" role="search" className="w-full">
      <label htmlFor={id} className="sr-only">
        What are you packaging?
      </label>
      <div
        className={`flex items-stretch border transition-colors ${
          studio
            ? "h-[clamp(50px,3.2vw,60px)] border-line-dark bg-white text-[#111419] focus-within:border-[#111419]"
            : field
        }`}
      >
        <SearchIcon
          size={size === "lg" ? 20 : 16}
          className="ml-4 shrink-0 self-center opacity-60"
        />
        <input
          id={id}
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder="Pouches, bottles, labels…"
          className={`w-full min-w-0 bg-transparent focus:outline-none ${
            studio ? "px-4 text-[17px] placeholder:text-[#8a9098]" : placeholder
          } ${studio ? "" : size === "lg" ? "px-3 py-4 text-base" : "px-3 py-2.5 text-sm"}`}
        />
        <button
          type="submit"
          className={`inline-flex shrink-0 items-center justify-center bg-orange font-medium transition-colors ${
            studio
              ? "px-5 text-[16.5px] text-white hover:bg-[#df5a10] sm:w-[190px] sm:px-0"
              : `text-on-orange hover:bg-orange-hi ${size === "lg" ? "px-6 text-sm sm:px-8" : "px-4 text-sm"}`
          }`}
        >
          <span className="sm:hidden">Search</span>
          <span className="hidden sm:inline">Find packaging</span>
          {arrow ? (
            <svg
              aria-hidden
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="ml-2 hidden sm:inline"
            >
              <path d="M4 12h15M13 6l6 6-6 6" />
            </svg>
          ) : null}
        </button>
      </div>
    </form>
  );
}
