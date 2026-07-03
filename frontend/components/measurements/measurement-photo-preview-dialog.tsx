"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MediaImage } from "@/components/media/media-image";

type MeasurementPhotoPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  alt?: string;
  unitFloor?: string | null;
  roomLocation?: string | null;
};

export function MeasurementPhotoPreviewDialog({
  open,
  onOpenChange,
  src,
  alt = "Measurement photo",
  unitFloor,
  roomLocation,
}: MeasurementPhotoPreviewDialogProps) {
  const hasLocation = Boolean(unitFloor?.trim() || roomLocation?.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-4">
        <DialogHeader>
          <DialogTitle>Photo preview</DialogTitle>
          {hasLocation ? (
            <p className="text-sm text-muted-foreground">
              {[unitFloor?.trim(), roomLocation?.trim()].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </DialogHeader>
        <MediaImage
          src={src}
          alt={alt}
          className="max-h-[70vh] w-full rounded-md object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}
