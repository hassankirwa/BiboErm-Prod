"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatPinAdminLine,
  formatPinGpsBadge,
  formatPinStreetLine,
  parseCoord,
  type ApiFieldDayPin,
} from "@/lib/api/crm/field-day";
import { cn } from "@/lib/utils";

export function sortPinsChronologically(pins: ApiFieldDayPin[] = []) {
  return [...pins].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : a.id;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : b.id;
    return aTime - bTime;
  });
}

export function FieldDayPinListItem({
  pin,
  compact = false,
  className,
  converting,
  onQuickConvert,
}: {
  pin: ApiFieldDayPin;
  compact?: boolean;
  className?: string;
  converting: boolean;
  onQuickConvert: () => void;
}) {
  const latitude = parseCoord(pin.latitude);
  const longitude = parseCoord(pin.longitude);
  const adminLine = formatPinAdminLine(pin);
  const streetLine = formatPinStreetLine(pin);
  const gpsBadge = formatPinGpsBadge(pin);
  const timeLabel = pin.created_at
    ? new Date(pin.created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      className={cn(
        "rounded-md border border-border",
        compact ? "p-3" : "p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">
              {pin.site_label || pin.notes || `Pin #${pin.id}`}
            </p>
            {timeLabel ? (
              <span className="text-xs text-muted-foreground">{timeLabel}</span>
            ) : null}
            {pin.lead_id ? (
              <Badge variant="secondary" className="text-xs">
                Lead linked
              </Badge>
            ) : null}
          </div>
          {streetLine ? (
            <p className="text-sm font-semibold text-foreground">{streetLine}</p>
          ) : null}
          {adminLine ? (
            <p className="text-xs text-muted-foreground">{adminLine}</p>
          ) : null}
          {gpsBadge ? (
            <Badge variant="outline" className="text-xs font-normal">
              {gpsBadge}
            </Badge>
          ) : latitude != null && longitude != null ? (
            <Badge variant="outline" className="text-xs font-normal">
              GPS verified
            </Badge>
          ) : null}
          {pin.notes && pin.notes !== streetLine ? (
            <p
              className={`text-sm text-muted-foreground ${compact ? "line-clamp-2" : ""}`}
            >
              {pin.notes}
            </p>
          ) : null}
          {pin.findings ? (
            <p className={`text-sm ${compact ? "line-clamp-2" : ""}`}>
              {pin.findings}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          {pin.lead_id ? (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/crm/leads/${pin.lead_id}`}>
                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                View lead
              </Link>
            </Button>
          ) : (
            <>
              <Button size="sm" asChild>
                <Link href={`/crm/leads/new?from_pin=${pin.id}`}>
                  Create lead from pin
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onQuickConvert}
                disabled={converting}
              >
                {converting ? "Creating…" : "Quick create lead"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
