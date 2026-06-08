"use client";

import { useEffect, useMemo } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type CrmSitePhotoPickerProps = {
  files: File[];
  onChange: (files: File[]) => void;
  label?: string;
  hint?: string;
  maxFiles?: number;
  className?: string;
};

export function CrmSitePhotoPicker({
  files,
  onChange,
  label = "Site images",
  hint = "JPEG, PNG, or WebP — up to 10 MB each",
  maxFiles = 8,
  className,
}: CrmSitePhotoPickerProps) {
  const previewUrls = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files],
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  function handleSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length === 0) return;
    const merged = [...files, ...selected].slice(0, maxFiles);
    onChange(merged);
    event.target.value = "";
  }

  function removeAt(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  const inputId = "crm-site-photo-input";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="space-y-1">
        <Label className="text-sm font-medium">{label}</Label>
        {hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>

      {files.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="group relative aspect-[4/3] overflow-hidden rounded-md border border-border bg-muted/30"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrls[index]}
                alt={file.name}
                className="h-full w-full object-cover"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-1 top-1 h-6 w-6 opacity-90 shadow-sm"
                onClick={() => removeAt(index)}
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-2 py-1 text-[10px] text-white">
                {file.name}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div>
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={handleSelect}
          disabled={files.length >= maxFiles}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={files.length >= maxFiles}
          onClick={() => document.getElementById(inputId)?.click()}
        >
          <ImagePlus className="h-4 w-4" />
          {files.length > 0 ? "Add more photos" : "Add site photos"}
        </Button>
      </div>
    </div>
  );
}
