"use client";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { ApiFieldDayPin } from "@/lib/api/crm/types";
import {
  formatPinAdminLine,
  formatPinGpsBadge,
  formatPinStreetLine,
  parseCoord,
} from "@/lib/api/crm/field-day";
import { KENYA_COUNTIES } from "@/lib/kenya-locations";
import { MapSearchBox } from "@/components/crm/map-search-box";
import {
  DEFAULT_MAP_CENTER,
  FlyToPosition,
  createMapPinIcon,
} from "@/components/crm/map-pin-picker";
import type { GeocodeResult } from "@/lib/geocoding";
import { cn } from "@/lib/utils";

export type FieldDayMapPin = {
  id: number;
  latitude: number;
  longitude: number;
  label: string;
  adminLine?: string | null;
  streetLine?: string | null;
  gpsBadge?: string | null;
  notes?: string | null;
  findings?: string | null;
  hasLead?: boolean;
  officerName?: string;
};

function FitPins({ pins }: { pins: FieldDayMapPin[] }) {
  const map = useMap();

  useEffect(() => {
    if (pins.length === 0) {
      map.setView(DEFAULT_MAP_CENTER, 6);
      return;
    }

    if (pins.length === 1) {
      map.setView([pins[0].latitude, pins[0].longitude], 14);
      return;
    }

    const bounds = L.latLngBounds(
      pins.map((pin) => [pin.latitude, pin.longitude] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
  }, [map, pins]);

  return null;
}

function createFieldDayPinIcon(hasLead: boolean) {
  return createMapPinIcon(hasLead ? "#059669" : "#2563eb");
}

export function pinsToMapMarkers(
  pins: ApiFieldDayPin[],
  officerName?: string,
): FieldDayMapPin[] {
  return pins
    .map((pin) => {
      const latitude = parseCoord(pin.latitude);
      const longitude = parseCoord(pin.longitude);
      return { pin, latitude, longitude };
    })
    .filter(
      ({ latitude, longitude }) => latitude != null && longitude != null,
    )
    .map(({ pin, latitude, longitude }) => ({
      id: pin.id,
      latitude: latitude!,
      longitude: longitude!,
      label: pin.site_label || pin.notes || `Pin #${pin.id}`,
      adminLine: formatPinAdminLine(pin),
      streetLine: formatPinStreetLine(pin),
      gpsBadge: formatPinGpsBadge(pin),
      notes: pin.notes,
      findings: pin.findings,
      hasLead: Boolean(pin.lead_id),
      officerName,
    }));
}

export function resolvePinMapCenter(
  pins: FieldDayMapPin[],
  countySlug?: string,
): [number, number] {
  if (pins.length > 0) {
    return [pins[pins.length - 1].latitude, pins[pins.length - 1].longitude];
  }

  if (countySlug) {
    const county = KENYA_COUNTIES.find((c) => c.slug === countySlug);
    if (county) {
      return [county.center.lat, county.center.lng];
    }
  }

  return DEFAULT_MAP_CENTER;
}

export function FieldDayMap({
  pins,
  className,
  heightClassName = "h-56",
  showSearch = true,
}: {
  pins: FieldDayMapPin[];
  className?: string;
  heightClassName?: string;
  showSearch?: boolean;
}) {
  const [searchTarget, setSearchTarget] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const center = useMemo(() => resolvePinMapCenter(pins)[0], [pins]);
  const centerLng = useMemo(() => resolvePinMapCenter(pins)[1], [pins]);

  function handleSearchSelect(result: GeocodeResult) {
    setSearchTarget({ lat: result.lat, lng: result.lng });
  }

  return (
    <div className={cn("relative", className)}>
      {showSearch ? (
        <div className="absolute left-2 right-2 top-2 z-[1000] sm:left-3 sm:right-3 sm:top-3">
          <MapSearchBox
            onSelect={handleSearchSelect}
            placeholder="Search area to navigate map"
            className="max-w-md"
          />
        </div>
      ) : null}

      <div
        className={cn(
          "overflow-hidden rounded-lg border border-border",
          heightClassName,
        )}
      >
        <MapContainer
          className="z-0 h-full w-full"
          center={[center, centerLng]}
          zoom={pins.length > 0 ? 13 : 6}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitPins pins={pins} />
          <FlyToPosition
            latitude={searchTarget?.lat ?? null}
            longitude={searchTarget?.lng ?? null}
            zoom={15}
          />
          {pins.map((pin) => (
            <Marker
              key={pin.id}
              position={[pin.latitude, pin.longitude]}
              icon={createFieldDayPinIcon(Boolean(pin.hasLead))}
            >
              <Popup>
                <div className="min-w-[160px] space-y-1 text-sm">
                  <p className="font-semibold">{pin.label}</p>
                  {pin.streetLine ? (
                    <p className="text-sm font-semibold">{pin.streetLine}</p>
                  ) : null}
                  {pin.adminLine ? (
                    <p className="text-xs text-muted-foreground">
                      {pin.adminLine}
                    </p>
                  ) : null}
                  {pin.gpsBadge ? (
                    <p className="text-xs text-muted-foreground">{pin.gpsBadge}</p>
                  ) : null}
                  {pin.officerName ? (
                    <p className="text-xs text-muted-foreground">
                      {pin.officerName}
                    </p>
                  ) : null}
                  {pin.notes && pin.notes !== pin.streetLine ? (
                    <p className="text-xs">{pin.notes}</p>
                  ) : null}
                  {pin.findings ? (
                    <p className="text-xs text-muted-foreground">
                      {pin.findings}
                    </p>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
