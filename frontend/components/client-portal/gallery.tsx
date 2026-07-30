"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { ClientPortalGalleryItem } from "@/lib/api/client-portal";

const STEP_FILTERS = [
  { key: "all", label: "All" },
  { key: "design", label: "Site & design" },
  { key: "production", label: "Production" },
  { key: "installation", label: "Installation" },
  { key: "complete", label: "Handover" },
] as const;

export function ClientPortalGallery({
  items,
  className,
}: {
  items: ClientPortalGalleryItem[];
  className?: string;
}) {
  const [filter, setFilter] = useState<(typeof STEP_FILTERS)[number]["key"]>("all");
  const [active, setActive] = useState<ClientPortalGalleryItem | null>(null);

  const visible = useMemo(() => {
    const usable = items.filter((item) => item.has_file && item.url);
    if (filter === "all") return usable;
    return usable.filter((item) => item.step === filter);
  }, [items, filter]);

  if (!items.length) {
    return (
      <div className={cn("rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-5 py-10 text-center", className)}>
        <p className="text-sm text-[#737373]">
          Site and installation photos will appear here as the team uploads them.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap gap-2">
        {STEP_FILTERS.map((option) => {
          const count =
            option.key === "all"
              ? items.filter((i) => i.has_file).length
              : items.filter((i) => i.has_file && i.step === option.key).length;
          if (option.key !== "all" && count === 0) return null;

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium tracking-normal transition-colors",
                filter === option.key
                  ? "bg-[#ec2024] text-white"
                  : "border border-[#e5e5e5] bg-white text-[#737373] hover:border-[#ec2024]/40 hover:text-black",
              )}
            >
              {option.label}
              <span className="ml-1.5 opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#737373]">No photos in this category yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(item)}
              className="group overflow-hidden rounded-xl border border-[#e5e5e5] bg-white text-left transition hover:border-[#ec2024]/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.caption ?? "Project photo"}
                className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                loading="lazy"
              />
              <div className="space-y-0.5 px-3 py-2">
                <p className="truncate text-xs font-medium text-black">{item.caption ?? "Photo"}</p>
                <p className="truncate text-[11px] capitalize text-[#737373]">
                  {item.source.replace(/_/g, " ")}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {active ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={active.caption ?? "Photo"}
          onClick={() => setActive(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.url}
              alt={active.caption ?? "Project photo"}
              className="max-h-[78vh] w-full object-contain"
            />
            <div className="flex items-center justify-between gap-3 border-t border-[#e5e5e5] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-black">{active.caption ?? "Photo"}</p>
                {active.taken_at ? (
                  <p className="text-xs text-[#737373]">
                    {new Date(active.taken_at).toLocaleString()}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded-full bg-[#ec2024] px-3 py-1.5 text-xs text-white hover:bg-[#d41c20]"
                onClick={() => setActive(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
