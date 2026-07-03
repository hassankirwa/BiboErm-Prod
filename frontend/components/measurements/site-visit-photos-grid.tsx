"use client";

import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { MediaImage } from "@/components/media/media-image";
import { MeasurementPhotoPreviewDialog } from "@/components/measurements/measurement-photo-preview-dialog";
import type { ApiSiteVisit } from "@/lib/api/crm/site-visits";
import type { SiteMeasurementLine } from "@/lib/measurements/types";

type SiteVisitPhotosGridProps = {
  visit: ApiSiteVisit;
};

function findLineForPhoto(
  lines: SiteMeasurementLine[] | undefined,
  photoId: number,
): SiteMeasurementLine | undefined {
  return (lines ?? []).find((line) => line.photo_refs?.includes(photoId));
}

export function SiteVisitPhotosGrid({ visit }: SiteVisitPhotosGridProps) {
  const [preview, setPreview] = useState<{
    src: string;
    unitFloor?: string | null;
    roomLocation?: string | null;
  } | null>(null);

  const lines = visit.measurement_form_data?.lines;
  const photos = useMemo(
    () => (visit.photos ?? []).filter((photo) => photo.url ?? photo.firebase_url),
    [visit.photos],
  );

  if (photos.length === 0) return null;

  return (
    <>
      <div className="space-y-2">
        <Label>Uploaded photos</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo) => {
            const src = photo.url ?? photo.firebase_url;
            if (!src) return null;
            const line = findLineForPhoto(lines, photo.id);

            return (
              <div key={photo.id} className="space-y-1.5">
                <button
                  type="button"
                  className="block w-full overflow-hidden rounded-md border border-border bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  onClick={() =>
                    setPreview({
                      src,
                      unitFloor: line?.unit_floor,
                      roomLocation: line?.room_location,
                    })
                  }
                >
                  <MediaImage
                    src={src}
                    alt={`Site visit photo ${photo.id}`}
                    className="aspect-square w-full object-cover"
                  />
                </button>
                {line?.unit_floor?.trim() || line?.room_location?.trim() ? (
                  <div className="space-y-0.5 text-[11px] leading-tight text-muted-foreground">
                    {line.unit_floor?.trim() ? (
                      <p>
                        <span className="font-medium text-foreground">Unit:</span>{" "}
                        {line.unit_floor.trim()}
                      </p>
                    ) : null}
                    {line.room_location?.trim() ? (
                      <p>
                        <span className="font-medium text-foreground">Room:</span>{" "}
                        {line.room_location.trim()}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <MeasurementPhotoPreviewDialog
        open={preview != null}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        src={preview?.src ?? ""}
        unitFloor={preview?.unitFloor}
        roomLocation={preview?.roomLocation}
      />
    </>
  );
}
