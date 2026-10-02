import { SearchIcon } from "@/components/brand/icons";

// Search form — a plain GET form to /results; no client JS.
// `tone` matches the zone it sits in: dark editorial bands or light catalog.

export function SearchForm({
  size = "lg",
  tone = "dark",
  defaultValue,
}: {
  size?: "lg" | "sm";
  tone?: "dark" | "light";
  defaultValue?: string;
}) {
  const id = size === "lg" ? "hero-search" : "small-search";
  const field =
    tone === "dark"
      ? "border-line-dark bg-surface/80 text-on-dark focus-within:border-orange"
      : "border-line bg-card text-ink focus-within:border-ink";
  const placeholder = tone === "dark" ? "placeholder:text-on-dark-muted/70" : "placeholder:text-ink-faint";

  return (
    <form action="/results" role="search" className="w-full">
      <label htmlFor={id} className="sr-only">
        What are you packaging?
      </label>
      <div className={`flex items-stretch border transition-colors ${field}`}>
        <SearchIcon size={size === "lg" ? 20 : 16} className="ml-4 shrink-0 self-center opacity-60" />
        <input
          id={id}
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder="Pouches, bottles, labels…"
          className={`w-full min-w-0 bg-transparent focus:outline-none ${placeholder} ${
            size === "lg" ? "px-3 py-4 text-base" : "px-3 py-2.5 text-sm"
          }`}
        />
        <button
          type="submit"
          className={`shrink-0 bg-orange font-medium text-on-orange transition-colors hover:bg-orange-hi ${
            size === "lg" ? "px-6 text-sm sm:px-8" : "px-4 text-sm"
          }`}
        >
          <span className="sm:hidden">Search</span>
          <span className="hidden sm:inline">Find packaging</span>
        </button>
      </div>
    </form>
  );
}
