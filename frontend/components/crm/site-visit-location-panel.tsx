"use client";

import dynamic from "next/dynamic";
import { ExternalLink, MapPin } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const SiteVisitMapPreview = dynamic(
  () =>
    import("@/components/crm/site-visit-map-preview").then(
      (m) => m.SiteVisitMapPreview,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-48 items-center justify-center rounded-lg border border-border bg-muted/20">
        <Spinner className="h-5 w-5 text-primary" />
      </div>
    ),
  },
);

function toCoord(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

export function SiteVisitLocationPanel({
  siteAddress,
  latitude,
  longitude,
  className,
}: {
  siteAddress?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  className?: string;
}) {
  const lat = toCoord(latitude);
  const lng = toCoord(longitude);
  const hasPin = lat != null && lng != null;
  const address = siteAddress?.trim() || null;

  if (!address && !hasPin) {
    return null;
  }

  const mapsHref = hasPin
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
      : null;

  return (
    <div className={cn("space-y-3", className)}>
      {address ? (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
          <span className="min-w-0 flex-1 text-foreground">{address}</span>
        </p>
      ) : (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
          <span>Pinned site location</span>
        </p>
      )}

      {hasPin ? (
        <p className="text-xs text-muted-foreground">
          {lat!.toFixed(5)}, {lng!.toFixed(5)}
          {mapsHref ? (
            <>
              {" · "}
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Open in Maps
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          ) : null}
        </p>
      ) : null}

      {hasPin ? (
        <SiteVisitMapPreview latitude={lat!} longitude={lng!} />
      ) : null}
    </div>
  );
}
