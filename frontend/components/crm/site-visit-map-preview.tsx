"use client";

import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  createMapPinIcon,
  FlyToPosition,
} from "@/components/crm/map-pin-picker";

function InvalidateMapSize() {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => window.clearTimeout(timer);
  }, [map]);

  return null;
}

export function SiteVisitMapPreview({
  latitude,
  longitude,
  className = "h-52 min-h-[13rem]",
}: {
  latitude: number;
  longitude: number;
  className?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/10">
      <MapContainer
        key={`${latitude}-${longitude}`}
        className={`z-0 w-full ${className}`}
        center={[latitude, longitude]}
        zoom={15}
        scrollWheelZoom={false}
        dragging
        doubleClickZoom={false}
        touchZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <InvalidateMapSize />
        <FlyToPosition latitude={latitude} longitude={longitude} zoom={15} />
        <Marker
          position={[latitude, longitude]}
          icon={createMapPinIcon("#0f766e")}
          interactive={false}
        />
      </MapContainer>
    </div>
  );
}
