"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MediaImage } from "@/components/media/media-image";
import { Eraser, ImagePlus, Loader2 } from "lucide-react";

type RoughSketchPanelProps = {
  sketchUrl?: string | null;
  readOnly: boolean;
  onUpload: (file: File) => Promise<void>;
};

export function RoughSketchPanel({
  sketchUrl,
  readOnly,
  onUpload,
}: RoughSketchPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || readOnly) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#111827";
    context.lineWidth = 2;
    context.lineCap = "round";
  }, [readOnly]);

  function getPoint(event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in event) {
      const touch = event.touches[0];
      if (!touch) return null;
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function startDraw(
    event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) {
    if (readOnly) return;
    event.preventDefault();
    drawing.current = true;
  }

  function draw(
    event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) {
    if (!drawing.current || readOnly) return;
    event.preventDefault();

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const point = getPoint(event);
    if (!canvas || !context || !point) return;

    context.lineTo(point.x, point.y);
    context.stroke();
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function endDraw() {
    drawing.current = false;
    const context = canvasRef.current?.getContext("2d");
    context?.beginPath();
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.beginPath();
  }

  async function saveCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setUploading(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((result) => resolve(result), "image/png"),
      );
      if (!blob) return;
      const file = new File([blob], "rough-sketch.png", { type: "image/png" });
      await onUpload(file);
    } finally {
      setUploading(false);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
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

  if (readOnly && sketchUrl) {
    return (
      <div className="rounded-md border border-border p-3">
        <MediaImage
          src={sketchUrl}
          alt="Rough sketch"
          className="max-h-80 w-full rounded object-contain"
        />
      </div>
    );
  }

  if (readOnly) {
    return (
      <p className="text-sm text-muted-foreground">No rough sketch captured.</p>
    );
  }

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        className="w-full touch-none rounded-md border border-border bg-white"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clearCanvas}>
          <Eraser className="mr-1 h-4 w-4" />
          Clear
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={saveCanvas}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="mr-1 h-4 w-4" />
          )}
          Save sketch
        </Button>
        <label className="inline-flex">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button type="button" variant="outline" size="sm" asChild>
            <span>
              <ImagePlus className="mr-1 h-4 w-4" />
              Upload image
            </span>
          </Button>
        </label>
      </div>
      {sketchUrl && (
        <div className="rounded-md border border-border p-2">
          <p className="mb-2 text-xs text-muted-foreground">Saved sketch</p>
          <MediaImage
            src={sketchUrl}
            alt="Saved rough sketch"
            className="max-h-48 w-full rounded object-contain"
          />
        </div>
      )}
    </div>
  );
}
