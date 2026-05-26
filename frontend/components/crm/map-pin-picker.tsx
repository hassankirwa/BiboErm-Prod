"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { AlertCircle, Crosshair, MapPinOff, Navigation } from "lucide-react";
import { toast } from "sonner";
import { MapSearchBox } from "@/components/crm/map-search-box";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  geolocationErrorMessage,
  getCurrentPosition,
  reverseGeocodeDetails,
  type GeocodeResult,
} from "@/lib/geocoding";
import {
  resolveKenyaAdminFromNominatimAddress,
  type KenyaAdminResolution,
} from "@/lib/kenya-locations";
import { cn } from "@/lib/utils";

export const DEFAULT_MAP_CENTER: [number, number] = [-1.2864, 36.8172];

export type MapPinPickerMode = "full" | "gps-only";

export type GeolocationCapture = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
};

function MapClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export function FlyToPosition({
  latitude,
  longitude,
  zoom,
}: {
  latitude: number | null;
  longitude: number | null;
  zoom?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (latitude == null || longitude == null) return;
    map.flyTo([latitude, longitude], zoom ?? Math.max(map.getZoom(), 14), {
      duration: 0.6,
    });
  }, [map, latitude, longitude, zoom]);

  return null;
}

export function createMapPinIcon(color = "#2563eb") {
  return L.divIcon({
    className: "lead-map-marker",
    html: `<span class="lead-map-marker-pin" style="background-color: ${color}; width: 22px; height: 22px;" aria-hidden="true"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

function DraggablePin({
  latitude,
  longitude,
  onDragEnd,
  pinColor,
}: {
  latitude: number;
  longitude: number;
  onDragEnd: (lat: number, lng: number) => void;
  pinColor?: string;
}) {
  return (
    <Marker
      draggable
      position={[latitude, longitude]}
      icon={createMapPinIcon(pinColor)}
      eventHandlers={{
        dragend(event) {
          const { lat, lng } = event.target.getLatLng();
          onDragEnd(lat, lng);
        },
      }}
    />
  );
}

function StaticPin({
  latitude,
  longitude,
  pinColor,
}: {
  latitude: number;
  longitude: number;
  pinColor?: string;
}) {
  return (
    <Marker
      position={[latitude, longitude]}
      icon={createMapPinIcon(pinColor)}
    />
  );
}

function formatCaptureTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function MapPinPicker({
  latitude,
  longitude,
  countySlug,
  gpsAccuracy,
  gpsCapturedAt,
  mode = "full",
  onChange,
  onAddressSuggest,
  onKenyaAdminSuggest,
  onKenyaAdminResolveEnd,
  onGeolocationCapture,
  showGeolocation = true,
  className,
  mapHeightClassName = "h-52",
  pinColor,
}: {
  latitude: number | null;
  longitude: number | null;
  countySlug?: string;
  gpsAccuracy?: number | null;
  gpsCapturedAt?: string | null;
  mode?: MapPinPickerMode;
  onChange: (lat: number | null, lng: number | null) => void;
  onAddressSuggest?: (address: string) => void;
  onKenyaAdminSuggest?: (admin: KenyaAdminResolution) => void;
  onKenyaAdminResolveEnd?: () => void;
  onGeolocationCapture?: (coords: GeolocationCapture) => void;
  showGeolocation?: boolean;
  className?: string;
  mapHeightClassName?: string;
  pinColor?: string;
}) {
  const reverseGeocodeTimer = useRef<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [suggestedAddress, setSuggestedAddress] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const isGpsOnly = mode === "gps-only";
  const hasPin = latitude != null && longitude != null;

  const center: [number, number] =
    hasPin ? [latitude, longitude] : DEFAULT_MAP_CENTER;

  const scheduleReverseGeocode = useCallback(
    (lat: number, lng: number) => {
      if (reverseGeocodeTimer.current != null) {
        window.clearTimeout(reverseGeocodeTimer.current);
      }

      reverseGeocodeTimer.current = window.setTimeout(async () => {
        setReverseLoading(true);
        try {
          const details = await reverseGeocodeDetails(lat, lng, { zoom: 18 });
          if (!details) return;

          setSuggestedAddress(details.label);
          onAddressSuggest?.(details.label);

          const admin = resolveKenyaAdminFromNominatimAddress(details.address);
          onKenyaAdminSuggest?.({
            ...admin,
            addressLabel: details.label,
            hasStreetDetail: details.hasStreetDetail,
          });
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not resolve address for this pin.",
          );
        } finally {
          setReverseLoading(false);
        }
      }, 700);
    },
    [onAddressSuggest, onKenyaAdminSuggest],
  );

  const resolveAdminFromGps = useCallback(
    async (lat: number, lng: number) => {
      if (!onKenyaAdminSuggest && !onKenyaAdminResolveEnd && !onAddressSuggest) {
        return;
      }

      setReverseLoading(true);
      try {
        const details = await reverseGeocodeDetails(lat, lng, { zoom: 18 });
        if (!details) return;

        setSuggestedAddress(details.label);
        onAddressSuggest?.(details.label);

        const admin = resolveKenyaAdminFromNominatimAddress(details.address);
        onKenyaAdminSuggest?.({
          ...admin,
          addressLabel: details.label,
          hasStreetDetail: details.hasStreetDetail,
        });
      } catch {
        // Admin autofill is best-effort for field day GPS capture.
      } finally {
        setReverseLoading(false);
        onKenyaAdminResolveEnd?.();
      }
    },
    [onAddressSuggest, onKenyaAdminResolveEnd, onKenyaAdminSuggest],
  );

  useEffect(
    () => () => {
      if (reverseGeocodeTimer.current != null) {
        window.clearTimeout(reverseGeocodeTimer.current);
      }
    },
    [],
  );

  function setPin(lat: number, lng: number, fromGeolocation = false) {
    onChange(lat, lng);
    if (!fromGeolocation) {
      scheduleReverseGeocode(lat, lng);
    }
  }

  function handleSearchSelect(result: GeocodeResult) {
    setPin(result.lat, result.lng);
    setSuggestedAddress(result.label);
    onAddressSuggest?.(result.label);
  }

  async function handleUseMyLocation() {
    setLocating(true);
    setGpsError(null);
    try {
      const position = await getCurrentPosition();
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const capturedAt = new Date(position.timestamp).toISOString();
      onChange(lat, lng);
      onGeolocationCapture?.({
        latitude: lat,
        longitude: lng,
        accuracy: position.coords.accuracy,
        capturedAt,
      });
      if (isGpsOnly) {
        void resolveAdminFromGps(lat, lng);
      } else {
        scheduleReverseGeocode(lat, lng);
      }
      toast.success("Live GPS location captured.");
    } catch (error) {
      const message = geolocationErrorMessage(error);
      setGpsError(message);
      toast.error(message);
    } finally {
      setLocating(false);
    }
  }

  function handleClearPin() {
    onChange(null, null);
    setSuggestedAddress(null);
    setGpsError(null);
  }

  if (isGpsOnly) {
    const captureLabel = formatCaptureTime(gpsCapturedAt);

    return (
      <div className={className}>
        <div className="mb-3 space-y-2">
          <Button
            type="button"
            size="default"
            className="w-full gap-2 sm:w-auto"
            onClick={handleUseMyLocation}
            disabled={locating}
          >
            {locating ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            {locating
              ? "Capturing GPS…"
              : hasPin
                ? "Log my location again"
                : "Log my location"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Allow location when prompted, then tap to record your live device
            position. Map search, manual coordinates, and map clicks are
            disabled for field day integrity.
          </p>
        </div>

        {gpsError ? (
          <div
            role="alert"
            className="mb-3 flex gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">GPS required</p>
              <p className="mt-0.5 text-destructive/90">{gpsError}</p>
              <p className="mt-1 text-xs text-destructive/80">
                You cannot save a field day pin without live GPS from this
                device.
              </p>
            </div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-border">
          <MapContainer
            className={cn("z-0 w-full", mapHeightClassName)}
            center={center}
            zoom={hasPin ? 15 : 6}
            scrollWheelZoom={hasPin}
            dragging={hasPin}
            doubleClickZoom={hasPin}
            touchZoom={hasPin}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FlyToPosition latitude={latitude} longitude={longitude} />
            {hasPin ? (
              <StaticPin
                latitude={latitude}
                longitude={longitude}
                pinColor={pinColor}
              />
            ) : null}
          </MapContainer>
        </div>

        {hasPin ? (
          <div className="mt-2 space-y-1.5">
            {gpsAccuracy != null ? (
              <p className="text-sm text-muted-foreground">
                GPS accuracy: ±{Math.round(gpsAccuracy)} m
                {gpsAccuracy > 100 ? (
                  <span className="text-amber-600 dark:text-amber-500">
                    {" "}
                    (move outdoors for better signal)
                  </span>
                ) : null}
              </p>
            ) : null}
            {captureLabel ? (
              <p className="text-sm text-muted-foreground">
                Captured: {captureLabel}
              </p>
            ) : null}
            {suggestedAddress ? (
              <p className="text-sm font-medium text-foreground">
                {suggestedAddress}
              </p>
            ) : reverseLoading ? (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Spinner className="h-3.5 w-3.5" />
                Looking up address…
              </p>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleClearPin}
            >
              <MapPinOff className="h-4 w-4" />
              Clear capture
            </Button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No GPS capture yet. The map will show your pin after you log your
            location.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <MapSearchBox
        onSelect={handleSearchSelect}
        placeholder="Search location or click map to pin"
        className="mb-2"
      />

      <div className="overflow-hidden rounded-lg border border-border">
        <MapContainer
          className={cn("z-0 w-full", mapHeightClassName)}
          center={center}
          zoom={latitude != null && longitude != null ? 14 : 6}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onPick={(lat, lng) => setPin(lat, lng)} />
          <FlyToPosition latitude={latitude} longitude={longitude} />
          {latitude != null && longitude != null ? (
            <DraggablePin
              latitude={latitude}
              longitude={longitude}
              pinColor={pinColor}
              onDragEnd={(lat, lng) => setPin(lat, lng)}
            />
          ) : null}
        </MapContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {showGeolocation ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="gap-1.5"
            onClick={handleUseMyLocation}
            disabled={locating}
          >
            {locating ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <Crosshair className="h-4 w-4" />
            )}
            {locating ? "Locating…" : "Use my location"}
          </Button>
        ) : null}
        {latitude != null && longitude != null ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={handleClearPin}
          >
            <MapPinOff className="h-4 w-4" />
            Clear pin
          </Button>
        ) : null}
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground">
        Search for a place, click the map, or drag the pin to adjust. Leave
        empty to use county/sub-county for map placement.
      </p>

      {reverseLoading ? (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Spinner className="h-3 w-3" />
          Looking up address…
        </p>
      ) : suggestedAddress ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Suggested address: {suggestedAddress}
        </p>
      ) : null}

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1">
          <label className="text-xs text-muted-foreground">Latitude</label>
          <input
            type="number"
            step="any"
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={latitude ?? ""}
            onChange={(event) => {
              const val = event.target.value;
              const nextLat = val === "" ? null : Number(val);
              onChange(nextLat, longitude);
              if (nextLat != null && longitude != null) {
                scheduleReverseGeocode(nextLat, longitude);
              }
            }}
            placeholder="-1.2864"
          />
        </div>
        <div className="grid gap-1">
          <label className="text-xs text-muted-foreground">Longitude</label>
          <input
            type="number"
            step="any"
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={longitude ?? ""}
            onChange={(event) => {
              const val = event.target.value;
              const nextLng = val === "" ? null : Number(val);
              onChange(latitude, nextLng);
              if (latitude != null && nextLng != null) {
                scheduleReverseGeocode(latitude, nextLng);
              }
            }}
            placeholder="36.8172"
          />
        </div>
      </div>

      {gpsAccuracy != null ? (
        <p className="mt-1 text-xs text-muted-foreground">
          GPS accuracy: ±{Math.round(gpsAccuracy)}m
        </p>
      ) : null}

      {countySlug ? (
        <p className="mt-1 text-xs text-muted-foreground">
          County selected: {countySlug.replace(/-/g, " ")}
        </p>
      ) : null}
    </div>
  );
}
