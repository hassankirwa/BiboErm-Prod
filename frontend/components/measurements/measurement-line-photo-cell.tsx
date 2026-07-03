"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MediaImage } from "@/components/media/media-image";
import { MeasurementPhotoPreviewDialog } from "@/components/measurements/measurement-photo-preview-dialog";
import { ImagePlus, Loader2, X } from "lucide-react";

type MeasurementLinePhotoCellProps = {
  photoIds: number[];
  photoUrls: Map<number, string>;
  readOnly: boolean;
  unitFloor?: string | null;
  roomLocation?: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove: (photoId: number) => void;
};

export function MeasurementLinePhotoCell({
  photoIds,
  photoUrls,
  readOnly,
  unitFloor,
  roomLocation,
  onUpload,
  onRemove,
}: MeasurementLinePhotoCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  if (readOnly && photoIds.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <>
      <div className="flex min-w-24 flex-col gap-1.5">
        {photoIds.map((photoId) => {
          const url = photoUrls.get(photoId);
          if (!url) return null;

          return (
            <div key={photoId} className="relative">
              <button
                type="button"
                className="block rounded border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                onClick={() => setPreviewUrl(url)}
                aria-label="Preview photo"
              >
                <MediaImage
                  src={url}
                  alt="Line photo"
                  className="h-14 w-14 rounded object-cover"
                />
              </button>
              {!readOnly && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-background shadow"
                  onClick={() => onRemove(photoId)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        })}

        {photoIds.length > 0 && (unitFloor?.trim() || roomLocation?.trim()) ? (
          <div className="space-y-0.5 text-[11px] leading-tight text-muted-foreground">
            {unitFloor?.trim() ? (
              <p>
                <span className="font-medium text-foreground">Unit:</span>{" "}
                {unitFloor.trim()}
              </p>
            ) : null}
            {roomLocation?.trim() ? (
              <p>
                <span className="font-medium text-foreground">Room:</span>{" "}
                {roomLocation.trim()}
              </p>
            ) : null}
          </div>
        ) : null}

        {!readOnly && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <ImagePlus className="mr-1 h-3.5 w-3.5" />
                  Photo
                </>
              )}
            </Button>
          </>
        )}
      </div>

      <MeasurementPhotoPreviewDialog
        open={previewUrl != null}
        onOpenChange={(open) => {
          if (!open) setPreviewUrl(null);
        }}
        src={previewUrl ?? ""}
        unitFloor={unitFloor}
        roomLocation={roomLocation}
      />
    </>
  );
}
