"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { searchWarehouseItems, type WarehouseItem } from "@/lib/api/warehouse";

export function MaterialCodeSearch({
  value,
  onSelect,
  placeholder = "Find material by code",
  category,
}: {
  value?: string;
  onSelect: (item: WarehouseItem) => void;
  placeholder?: string;
  category?: string | null;
}) {
  const [query, setQuery] = useState(value ?? "");
  const [results, setResults] = useState<WarehouseItem[]>([]);

  useEffect(() => {
    setQuery(value ?? "");
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const term = query.trim();
      if (term.length < 2) {
        setResults([]);
        return;
      }
      try {
        const res = await searchWarehouseItems({ code: term, q: term });
        const filtered = category
          ? res.data.filter((item) => item.category === category)
          : res.data;
        setResults(filtered.slice(0, 8));
      } catch {
        setResults([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [category, query]);

  return (
    <div className="min-w-0 space-y-2">
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} />
      {results.length > 0 ? (
        <div className="max-h-48 min-w-0 overflow-auto rounded border">
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              className="block w-full min-w-0 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/40"
              onClick={() => onSelect(item)}
            >
              <span className="break-words">{item.sku} · {item.name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
