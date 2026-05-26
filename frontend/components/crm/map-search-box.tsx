"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { searchLocations, type GeocodeResult } from "@/lib/geocoding";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function MapSearchBox({
  onSelect,
  placeholder = "Search location or click map to pin",
  className,
  countryCodes = "ke",
}: {
  onSelect: (result: GeocodeResult) => void;
  placeholder?: string;
  className?: string;
  countryCodes?: string;
}) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    searchLocations(debouncedQuery, { countryCodes, limit: 6 })
      .then((items) => {
        if (cancelled) return;
        setResults(items);
        setOpen(true);
        setActiveIndex(items.length > 0 ? 0 : -1);
      })
      .catch((error) => {
        if (cancelled) return;
        setResults([]);
        toast.error(
          error instanceof Error ? error.message : "Location search failed.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, countryCodes]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function handleSelect(result: GeocodeResult) {
    onSelect(result);
    setQuery(result.label);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) {
      if (event.key === "Escape") setOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        index <= 0 ? results.length - 1 : index - 1,
      );
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      handleSelect(results[activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-10 bg-background/95 pl-9 pr-10 shadow-md backdrop-blur-sm"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {loading ? <Spinner className="h-4 w-4 text-muted-foreground" /> : null}
          {query ? (
            <button
              type="button"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                setResults([]);
                setOpen(false);
              }}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {open && (loading || results.length > 0 || debouncedQuery.trim().length >= 2) ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-[1100] mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-lg"
        >
          {loading && results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              Searching locations…
            </li>
          ) : null}
          {!loading && results.length === 0 && debouncedQuery.trim().length >= 2 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              No places found. Try a nearby town or landmark.
            </li>
          ) : null}
          {results.map((result, index) => (
            <li key={`${result.placeId ?? result.label}-${index}`} role="option">
              <button
                type="button"
                className={cn(
                  "flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted/70",
                  activeIndex === index && "bg-muted/70",
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => handleSelect(result)}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="line-clamp-2">{result.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
