"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ExternalLink, MapPin } from "lucide-react";
import type { LeadViewMode } from "@/lib/leads-list-data";
import { cn } from "@/lib/utils";
import { getLeadsMapMarkers } from "@/lib/leads-map-data";

const LeadsMap = dynamic(
  () => import("@/components/crm/leads-map").then((m) => m.LeadsMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[480px] items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">Loading map…</p>
      </div>
    ),
  }
);

export function LeadsMapView({
  className,
  returnView = "map",
}: {
  className?: string;
  returnView?: LeadViewMode;
}) {
  const markers = getLeadsMapMarkers();
  const [focusedLeadId, setFocusedLeadId] = useState<string | null>(null);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card",
        className
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="relative min-h-[min(70dvh,560px)] flex-1 lg:min-h-[calc(100dvh-11.5rem)]">
          <LeadsMap focusedLeadId={focusedLeadId} />
        </div>
        <aside className="flex w-full shrink-0 flex-col border-t border-border bg-card lg:w-80 lg:border-t-0 lg:border-l">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                {markers.length} leads on map
              </h2>
            </div>
            {focusedLeadId && (
              <button
                type="button"
                onClick={() => setFocusedLeadId(null)}
                className="shrink-0 text-xs font-medium text-primary hover:underline"
              >
                Show all
              </button>
            )}
          </div>
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 lg:max-h-none">
            {markers.map((marker) => {
              const isActive = focusedLeadId === marker.id;
              return (
                <li key={marker.id}>
                  <button
                    type="button"
                    onClick={() => setFocusedLeadId(marker.id)}
                    className={cn(
                      "w-full rounded-md border px-3 py-3 text-left text-sm transition-colors",
                      isActive
                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                        : "border-border/80 bg-muted/30 hover:border-border hover:bg-muted/50"
                    )}
                  >
                    <Link
                      href={`/crm/leads/${marker.id}?view=${returnView}`}
                      className="font-medium leading-snug text-[#2563eb] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {marker.title}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {marker.company}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0 text-primary/80" />
                      {marker.location}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium",
                          marker.stageClassName
                        )}
                      >
                        {marker.stage}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {marker.owner}
                      </span>
                    </div>
                    <Link
                      href={`/crm/leads/${marker.id}?view=${returnView}`}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#1e3a5f] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View lead
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="shrink-0 border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
            Click a lead to zoom in · Map data © OpenStreetMap
          </p>
        </aside>
      </div>
    </div>
  );
}
