"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapSearchBox } from "@/components/crm/map-search-box";
import {
  DEFAULT_MAP_CENTER,
  FlyToPosition,
} from "@/components/crm/map-pin-picker";
import type { GeocodeResult } from "@/lib/geocoding";
import {
  getLeadsMapMarkers,
  getMapBounds,
  type LeadMapMarker,
} from "@/lib/leads-map-data";

const FOCUS_ZOOM = 16;

function FitBounds({
  markers,
  focusedLeadId,
}: {
  markers: LeadMapMarker[];
  focusedLeadId: string | null;
}) {
  const map = useMap();
  const bounds = useMemo(() => getMapBounds(markers), [markers]);

  useEffect(() => {
    if (focusedLeadId) return;
    if (markers.length === 0) {
      map.setView(DEFAULT_MAP_CENTER, 6);
      return;
    }
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }, [map, markers, bounds, focusedLeadId]);

  return null;
}

function FocusLead({
  focusedLeadId,
  markers,
}: {
  focusedLeadId: string | null;
  markers: LeadMapMarker[];
}) {
  const map = useMap();

  useEffect(() => {
    if (!focusedLeadId) return;
    const marker = markers.find((item) => item.id === focusedLeadId);
    if (!marker) return;

    map.flyTo([marker.lat, marker.lng], FOCUS_ZOOM, {
      duration: 0.75,
      easeLinearity: 0.25,
    });
  }, [map, focusedLeadId, markers]);

  return null;
}

function LeadMarker({
  marker,
  isFocused,
}: {
  marker: LeadMapMarker;
  isFocused: boolean;
}) {
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    if (isFocused && markerRef.current) {
      const timer = window.setTimeout(() => markerRef.current?.openPopup(), 400);
      return () => window.clearTimeout(timer);
    }
    markerRef.current?.closePopup();
  }, [isFocused]);

  return (
    <Marker
      ref={markerRef}
      position={[marker.lat, marker.lng]}
      icon={createLeadIcon(marker, isFocused)}
      zIndexOffset={isFocused ? 1000 : 0}
    >
      <Popup>
        <div className="min-w-[180px] space-y-1 text-sm">
          <p className="font-semibold text-foreground">{marker.title}</p>
          <p className="text-xs text-muted-foreground">{marker.company}</p>
          <p className="text-xs text-muted-foreground">{marker.location}</p>
          <p className="text-xs">
            <span className="font-medium">Stage:</span> {marker.stage}
          </p>
          <p className="text-xs">
            <span className="font-medium">Owner:</span> {marker.owner}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}

function createLeadIcon(marker: LeadMapMarker, isFocused: boolean) {
  const color = stagePinColor(marker.stageClassName);
  const size = isFocused ? 34 : 28;
  const pinSize = isFocused ? 26 : 22;

  return L.divIcon({
    className: "lead-map-marker",
    html: `<span class="lead-map-marker-pin${isFocused ? " lead-map-marker-pin--focused" : ""}" style="background-color: ${color}; width: ${pinSize}px; height: ${pinSize}px;" aria-hidden="true"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

function stagePinColor(stageClassName: string): string {
  if (stageClassName.includes("blue")) return "#2563eb";
  if (stageClassName.includes("green") && !stageClassName.includes("emerald"))
    return "#16a34a";
  if (stageClassName.includes("emerald")) return "#059669";
  if (stageClassName.includes("orange")) return "#ea580c";
  if (stageClassName.includes("violet")) return "#7c3aed";
  if (stageClassName.includes("amber")) return "#d97706";
  return "#ec2024";
}

function LeadsMapCanvas({
  markers,
  focusedLeadId,
  searchTarget,
}: {
  markers: LeadMapMarker[];
  focusedLeadId: string | null;
  searchTarget: { lat: number; lng: number } | null;
}) {
  return (
    <MapContainer
      className="z-0 h-full w-full"
      center={DEFAULT_MAP_CENTER}
      zoom={7}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds markers={markers} focusedLeadId={focusedLeadId} />
      <FocusLead focusedLeadId={focusedLeadId} markers={markers} />
      <FlyToPosition
        latitude={searchTarget?.lat ?? null}
        longitude={searchTarget?.lng ?? null}
        zoom={14}
      />
      {markers.map((marker) => (
        <LeadMarker
          key={marker.id}
          marker={marker}
          isFocused={focusedLeadId === marker.id}
        />
      ))}
    </MapContainer>
  );
}

export function LeadsMap({
  focusedLeadId = null,
  markers: markersProp,
  onSearchSelect,
}: {
  focusedLeadId?: string | null;
  markers?: LeadMapMarker[];
  onSearchSelect?: (result: GeocodeResult) => void;
}) {
  const markers = useMemo(
    () => markersProp ?? getLeadsMapMarkers(),
    [markersProp],
  );
  const [searchTarget, setSearchTarget] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  function handleSearchSelect(result: GeocodeResult) {
    setSearchTarget({ lat: result.lat, lng: result.lng });
    onSearchSelect?.(result);
  }

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-3 right-3 top-3 z-[1000] sm:right-auto sm:max-w-sm">
        <MapSearchBox
          onSelect={handleSearchSelect}
          placeholder="Search area or navigate map"
        />
      </div>
      <LeadsMapCanvas
        markers={markers}
        focusedLeadId={focusedLeadId}
        searchTarget={searchTarget}
      />
    </div>
  );
}
