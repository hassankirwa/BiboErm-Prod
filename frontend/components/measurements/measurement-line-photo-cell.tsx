"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MediaImage } from "@/components/media/media-image";
import { ImagePlus, Loader2, X } from "lucide-react";

type MeasurementLinePhotoCellProps = {
  photoIds: number[];
  photoUrls: Map<number, string>;
  readOnly: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: (photoId: number) => void;
};

export function MeasurementLinePhotoCell({
  photoIds,
  photoUrls,
  readOnly,
  onUpload,
  onRemove,
}: MeasurementLinePhotoCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

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
    <div className="flex min-w-24 flex-col gap-1">
      {photoIds.map((photoId) => {
        const url = photoUrls.get(photoId);
        if (!url) return null;

        return (
          <div key={photoId} className="relative">
            <MediaImage
              src={url}
              alt="Line photo"
              className="h-14 w-14 rounded border border-border object-cover"
            />
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
  );
}
