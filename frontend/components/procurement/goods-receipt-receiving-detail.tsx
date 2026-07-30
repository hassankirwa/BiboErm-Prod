"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  Camera,
  CheckCircle2,
  ExternalLink,
  FileText,
  ImageIcon,
  Loader2,
  SwitchCamera,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { GoodsReceipt, GoodsReceiptAttachment } from "@/lib/api/procurement";
import { MaterialCodeSearch } from "@/components/warehouse/material-code-search";
import { GrnPutawaySelect } from "@/components/procurement/grn-putaway-select";
import {
  flattenBinsForWarehouseItem,
  suggestedPutawayBinId,
  warehouseItemLabel,
  type PutawayOptionsForItem,
  type WarehouseItem,
  type WarehouseLocationTree,
} from "@/lib/api/warehouse";

export type EditableGrnLine = {
  id: number;
  purchase_order_line_id: number;
  warehouse_item_id: number | null;
  warehouse_item_category: string | null;
  is_procurement_only: boolean;
  description: string;
  qty_received: number;
  qty_accepted: number;
  qty_rejected: number;
  rejection_reason: string;
  to_bin_id: number | null;
  notes: string;
};

export type GrnAttachmentType =
  | "receipt_photo"
  | "invoice_photo"
  | "delivery_note"
  | "other_document";

const attachmentLabels: Record<GrnAttachmentType, string> = {
  receipt_photo: "Receipt photo",
  invoice_photo: "Invoice photo",
  delivery_note: "Delivery note",
  other_document: "Other document",
};

const attachmentHints: Record<GrnAttachmentType, string> = {
  receipt_photo: "Photo of goods as delivered (required for verification).",
  invoice_photo: "Supplier invoice or delivery invoice (required).",
  delivery_note: "Signed delivery note or packing slip (optional).",
  other_document: "Any other supporting document (optional).",
};

function isImageUrl(url: string, filename?: string | null) {
  const probe = (filename ?? url).toLowerCase();
  if (/\.(pdf)$/i.test(probe)) return false;
  return /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(probe) || probe.includes("image");
}

function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function CameraCaptureDialog({
  open,
  onOpenChange,
  title,
  disabled,
  onCapture,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  disabled?: boolean;
  onCapture: (file: File) => Promise<void>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [starting, setStarting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const releaseCamera = () => {
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setReady(false);
  };

  useEffect(() => {
    if (!open) {
      releaseCamera();
      setError(null);
      setCapturing(false);
      setStarting(false);
      return;
    }

    let cancelled = false;

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera is not supported in this browser.");
        return;
      }

      setStarting(true);
      setError(null);
      setReady(false);
      releaseCamera();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });

        if (cancelled) {
          stopMediaStream(stream);
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        setReady(true);
      } catch (err) {
        if (cancelled) {
          return;
        }
        const message =
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access and try again."
            : err instanceof Error
              ? err.message
              : "Could not open the camera.";
        setError(message);
      } finally {
        if (!cancelled) {
          setStarting(false);
        }
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      releaseCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when dialog opens or facing mode flips
  }, [open, facingMode]);

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video || !ready || capturing || disabled) {
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      toast.error("Camera is still starting. Try again in a moment.");
      return;
    }

    setCapturing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Could not capture snapshot.");
      }
      context.drawImage(video, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.92);
      });
      if (!blob) {
        throw new Error("Could not create image from camera.");
      }

      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const file = new File([blob], `grn-${stamp}.jpg`, { type: "image/jpeg" });

      try {
        await onCapture(file);
        onOpenChange(false);
      } catch {
        // Parent upload handler already surfaces the error toast.
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to capture photo.");
    } finally {
      setCapturing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Take photo — {title}</DialogTitle>
          <DialogDescription>
            Point the camera at the goods or document, then capture a snapshot. It uploads
            automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={cn(
              "h-full w-full object-cover",
              (!ready || error) && "opacity-0",
            )}
          />
          {starting ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Opening camera…</span>
            </div>
          ) : null}
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted p-4 text-center text-sm text-muted-foreground">
              {error}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={starting || capturing || Boolean(error)}
            onClick={() =>
              setFacingMode((current) => (current === "environment" ? "user" : "environment"))
            }
          >
            <SwitchCamera className="h-4 w-4" />
            Flip camera
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={capturing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleCapture()}
              disabled={!ready || capturing || disabled || Boolean(error)}
            >
              {capturing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              {capturing ? "Saving…" : "Take snapshot"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LabeledField({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function ChecklistRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
      )}
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

function AttachmentPreview({
  url,
  filename,
  className,
}: {
  url: string;
  filename?: string | null;
  className?: string;
}) {
  if (isImageUrl(url, filename)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "group relative block overflow-hidden rounded-lg border bg-muted/40",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={filename ?? "Uploaded document"}
          className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
        />
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/50 py-1.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
          <ExternalLink className="h-3 w-3" />
          Open full size
        </span>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "flex h-full min-h-[120px] flex-col items-center justify-center gap-2 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        className,
      )}
    >
      <FileText className="h-8 w-8" />
      <span className="text-center font-medium">{filename ?? "View document"}</span>
      <span className="text-xs">Open PDF / file</span>
    </a>
  );
}

function GrnAttachmentCard({
  type,
  attachments,
  uploading,
  onFileSelected,
  compact = false,
}: {
  type: GrnAttachmentType;
  attachments: GoodsReceiptAttachment[];
  uploading: boolean;
  onFileSelected: (file: File) => Promise<void>;
  compact?: boolean;
}) {
  const uploaded = attachments.filter((entry) => entry.type === type);
  const [uploadPreview, setUploadPreview] = useState<{
    objectUrl: string | null;
    isImage: boolean;
    name: string;
  } | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (uploadPreview?.objectUrl) {
        URL.revokeObjectURL(uploadPreview.objectUrl);
      }
    };
  }, [uploadPreview?.objectUrl]);

  const label = attachmentLabels[type];
  const inputId = `grn-attachment-${type}`;

  const clearUploadPreview = () => {
    setUploadPreview((previous) => {
      if (previous?.objectUrl) {
        URL.revokeObjectURL(previous.objectUrl);
      }
      return null;
    });
  };

  const handleFileChange = async (file: File | undefined) => {
    if (!file || uploading) {
      return;
    }

    const isImage = file.type.startsWith("image/");
    const objectUrl = isImage ? URL.createObjectURL(file) : null;
    setUploadPreview((previous) => {
      if (previous?.objectUrl) {
        URL.revokeObjectURL(previous.objectUrl);
      }
      return { objectUrl, isImage, name: file.name };
    });

    try {
      await onFileSelected(file);
    } finally {
      clearUploadPreview();
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const showUploading = uploading && uploadPreview;

  return (
    <Card className={cn("overflow-hidden", compact && "h-full shadow-sm")}>
      <CardHeader className={cn(compact && "space-y-1 p-4 pb-2")}>
        <CardTitle
          className={cn(
            "flex items-center gap-2",
            compact ? "text-sm font-semibold" : "text-base",
          )}
        >
          <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{label}</span>
          {uploading ? (
            <Loader2 className="ml-auto h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
          ) : null}
        </CardTitle>
        {!compact ? <CardDescription>{attachmentHints[type]}</CardDescription> : null}
      </CardHeader>
      <CardContent className={cn("space-y-3", compact && "p-4 pt-0")}>
        {uploaded.length > 0 && !showUploading ? (
          <div className="space-y-2">
            {uploaded.map((attachment) => {
              const previewUrl = attachment.url ?? attachment.firebase_url;
              if (!previewUrl) {
                return (
                  <p key={attachment.id} className="text-xs text-muted-foreground">
                    {attachment.original_filename ?? attachment.path}
                  </p>
                );
              }
              return (
                <div key={attachment.id} className="space-y-1">
                  <AttachmentPreview
                    url={previewUrl}
                    filename={attachment.original_filename}
                    className={compact ? "aspect-[3/2] w-full" : "aspect-[4/3] w-full"}
                  />
                  <p className="truncate text-xs text-muted-foreground">
                    {attachment.original_filename ?? "Uploaded"}
                  </p>
                </div>
              );
            })}
          </div>
        ) : showUploading ? (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border">
            {uploadPreview.isImage && uploadPreview.objectUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uploadPreview.objectUrl}
                  alt="Uploading preview"
                  className="h-full w-full object-cover opacity-60"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/50">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-sm font-medium">Uploading…</span>
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 bg-muted/20 p-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <p className="max-w-full truncate text-sm font-medium">{uploadPreview.name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading…
                </div>
              </div>
            )}
          </div>
        ) : (
          <p
            className={cn(
              "rounded-md border border-dashed bg-muted/20 text-center text-sm text-muted-foreground",
              compact ? "px-2 py-8" : "px-3 py-6",
            )}
          >
            No file yet
          </p>
        )}

        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            disabled={uploading}
            onClick={() => setCameraOpen(true)}
          >
            <Camera className="h-4 w-4" />
            Open camera
          </Button>
          <LabeledField
            label={uploaded.length > 0 ? "Or replace from files" : "Or upload from files"}
            htmlFor={inputId}
            hint={compact ? "Auto-saves on select" : "Choose a photo or PDF — it saves automatically."}
          >
            <Input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="image/*,application/pdf"
              disabled={uploading}
              onChange={(event) => void handleFileChange(event.target.files?.[0])}
            />
          </LabeledField>
        </div>

        <CameraCaptureDialog
          open={cameraOpen}
          onOpenChange={setCameraOpen}
          title={label}
          disabled={uploading}
          onCapture={async (file) => {
            await handleFileChange(file);
          }}
        />
      </CardContent>
    </Card>
  );
}

function ReceivedLineCard({
  line,
  index,
  locationTree,
  locationsLoading,
  locationsError,
  warehouseItems,
  itemsLoading,
  putawayOptions,
  onChange,
}: {
  line: EditableGrnLine;
  index: number;
  locationTree: WarehouseLocationTree[];
  locationsLoading: boolean;
  locationsError: string | null;
  warehouseItems: WarehouseItem[];
  itemsLoading: boolean;
  putawayOptions?: PutawayOptionsForItem | null;
  onChange: (line: EditableGrnLine) => void;
}) {
  const balanced = line.qty_accepted + line.qty_rejected === line.qty_received;
  const needsRejectionReason = line.qty_rejected > 0 && !line.rejection_reason.trim();
  const procurementOnly = line.is_procurement_only;
  const requiresWarehouseLink =
    !procurementOnly && line.qty_accepted > 0 && !line.warehouse_item_id;
  const prefix = `grn-line-${line.id}`;
  const linkedItem = warehouseItems.find((item) => item.id === line.warehouse_item_id);
  const itemCategory =
    line.warehouse_item_category ??
    putawayOptions?.category ??
    linkedItem?.category ??
    null;

  const applyWarehouseItem = (warehouseItemId: number | null) => {
    const item = warehouseItems.find((entry) => entry.id === warehouseItemId);
    const category = item?.category ?? null;
    const nextBins = flattenBinsForWarehouseItem(locationTree, item, category);
    const suggested = suggestedPutawayBinId(item, locationTree);
    const toBinId =
      line.to_bin_id && nextBins.some((bin) => bin.id === line.to_bin_id)
        ? line.to_bin_id
        : suggested && nextBins.some((bin) => bin.id === suggested)
          ? suggested
          : null;

    onChange({
      ...line,
      warehouse_item_id: warehouseItemId,
      warehouse_item_category: category,
      to_bin_id: toBinId,
    });
  };

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium leading-snug">{line.description}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {procurementOnly
              ? "Procurement-only (not warehoused)"
              : line.warehouse_item_id
                ? `Warehouse item #${line.warehouse_item_id}`
                : "Warehouse item not linked"}{" "}
            · PO line #{line.purchase_order_line_id}
          </p>
          {procurementOnly ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Glass, doors, or other add-ons go straight to the project — no catalog item or putaway
              bin. Record quantities and verify for procurement audit only.
            </p>
          ) : requiresWarehouseLink ? (
            <p className="mt-1 text-xs font-medium text-destructive">
              No catalog link on the PO or project BOM. Pick a warehouse item below and save — it will
              update this GRN, PO, requisition, and BOM.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Line {index + 1}</Badge>
          <Badge variant={balanced ? "default" : "destructive"} className="font-normal">
            {balanced ? "Qty balanced" : "Accepted + rejected ≠ received"}
          </Badge>
          {procurementOnly ? (
            <Badge variant="outline" className="font-normal">
              Not warehoused
            </Badge>
          ) : requiresWarehouseLink ? (
            <Badge variant="destructive" className="font-normal">
              No warehouse item
            </Badge>
          ) : null}
        </div>
      </div>

      {!procurementOnly && !line.warehouse_item_id ? (
        <LabeledField
          label="Warehouse catalog item"
          htmlFor={`${prefix}-item`}
          hint="Required before verify if any quantity is accepted. Saves back to the PO and project BOM."
          className="mb-4"
        >
          <div className="space-y-2">
            <MaterialCodeSearch
              value={line.description}
              category={itemCategory}
              onSelect={(item) => applyWarehouseItem(item.id)}
              placeholder="Find material by code"
            />
            <select
              id={`${prefix}-item`}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs"
              value={line.warehouse_item_id ?? ""}
              disabled={itemsLoading}
              onChange={(event) =>
                applyWarehouseItem(event.target.value ? Number(event.target.value) : null)
              }
            >
              <option value="">
                {itemsLoading ? "Loading items…" : "Select warehouse item…"}
              </option>
              {warehouseItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {warehouseItemLabel(item)}
                </option>
              ))}
            </select>
          </div>
        </LabeledField>
      ) : !procurementOnly && line.warehouse_item_id ? (
        <p className="mb-4 text-xs text-muted-foreground">
          Linked to warehouse item #{line.warehouse_item_id} (from purchase order / requisition).
        </p>
      ) : null}

      <div
        className={cn(
          "grid gap-4 sm:grid-cols-2",
          procurementOnly ? "lg:grid-cols-3" : "lg:grid-cols-4",
        )}
      >
        <LabeledField
          label="Quantity received"
          htmlFor={`${prefix}-qty-received`}
          hint="Total units delivered on this GRN line."
        >
          <Input
            id={`${prefix}-qty-received`}
            type="number"
            min={0}
            step="any"
            value={line.qty_received}
            onChange={(event) =>
              onChange({ ...line, qty_received: Number(event.target.value) })
            }
          />
        </LabeledField>
        <LabeledField
          label="Quantity accepted"
          htmlFor={`${prefix}-qty-accepted`}
          hint="Good stock to put away into the warehouse."
        >
          <Input
            id={`${prefix}-qty-accepted`}
            type="number"
            min={0}
            step="any"
            value={line.qty_accepted}
            onChange={(event) =>
              onChange({ ...line, qty_accepted: Number(event.target.value) })
            }
          />
        </LabeledField>
        <LabeledField
          label="Quantity rejected"
          htmlFor={`${prefix}-qty-rejected`}
          hint="Damaged or failed QC — will not be stocked."
        >
          <Input
            id={`${prefix}-qty-rejected`}
            type="number"
            min={0}
            step="any"
            value={line.qty_rejected}
            onChange={(event) =>
              onChange({ ...line, qty_rejected: Number(event.target.value) })
            }
          />
        </LabeledField>
        {procurementOnly ? null : (
          <GrnPutawaySelect
            id={`${prefix}-bin`}
            warehouseItemId={line.warehouse_item_id}
            warehouseItemCategory={itemCategory}
            toBinId={line.to_bin_id}
            locationTree={locationTree}
            warehouseItems={warehouseItems}
            putawayOptions={putawayOptions}
            locationsLoading={locationsLoading || itemsLoading}
            locationsError={locationsError}
            onChange={(toBinId) => onChange({ ...line, to_bin_id: toBinId })}
          />
        )}
      </div>

      <Separator className="my-4" />

      <div className="grid gap-4 md:grid-cols-2">
        <LabeledField
          label="Rejection reason"
          htmlFor={`${prefix}-rejection`}
          hint={
            line.qty_rejected > 0
              ? "Required when any quantity is rejected."
              : "Only needed if quantity rejected is greater than zero."
          }
        >
          <Input
            id={`${prefix}-rejection`}
            value={line.rejection_reason}
            disabled={line.qty_rejected === 0}
            aria-invalid={needsRejectionReason}
            onChange={(event) =>
              onChange({ ...line, rejection_reason: event.target.value })
            }
            placeholder={
              line.qty_rejected > 0 ? "e.g. Damaged in transit" : "Not applicable"
            }
          />
        </LabeledField>
        <LabeledField
          label="Line notes"
          htmlFor={`${prefix}-notes`}
          hint="Optional QC or receiving notes for this line only."
        >
          <Input
            id={`${prefix}-notes`}
            value={line.notes}
            onChange={(event) => onChange({ ...line, notes: event.target.value })}
            placeholder="e.g. Batch label checked"
          />
        </LabeledField>
      </div>
    </div>
  );
}

type GoodsReceiptReceivingDetailProps = {
  grn: GoodsReceipt;
  lines: EditableGrnLine[];
  setLines: Dispatch<SetStateAction<EditableGrnLine[]>>;
  locationTree: WarehouseLocationTree[];
  locationsLoading: boolean;
  locationsError: string | null;
  notes: string;
  setNotes: (value: string) => void;
  qualityNotes: string;
  setQualityNotes: (value: string) => void;
  warehouseItems: WarehouseItem[];
  itemsLoading: boolean;
  putawayByItemId?: Record<number, PutawayOptionsForItem>;
  uploadingAttachment: GrnAttachmentType | null;
  saving: boolean;
  verifying: boolean;
  canVerify: boolean;
  onSave: () => void;
  onAttachmentUpload: (type: GrnAttachmentType, file: File) => Promise<void>;
  onVerify: () => void;
};

export function GoodsReceiptReceivingDetail({
  grn,
  lines,
  setLines,
  locationTree,
  locationsLoading,
  locationsError,
  notes,
  setNotes,
  qualityNotes,
  setQualityNotes,
  warehouseItems,
  itemsLoading,
  putawayByItemId = {},
  uploadingAttachment,
  saving,
  verifying,
  canVerify,
  onSave,
  onAttachmentUpload,
  onVerify,
}: GoodsReceiptReceivingDetailProps) {
  const attachmentTypes = useMemo(
    () => new Set((grn.attachments ?? []).map((attachment) => attachment.type)),
    [grn],
  );

  const qtyBalancesValid = lines.every(
    (line) => line.qty_accepted + line.qty_rejected === line.qty_received,
  );
  const rejectionReasonsComplete = lines.every(
    (line) => line.qty_rejected === 0 || line.rejection_reason.trim().length > 0,
  );
  const warehouseItemsLinked = lines.every(
    (line) =>
      line.qty_accepted <= 0 ||
      line.is_procurement_only ||
      Boolean(line.warehouse_item_id),
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge variant="secondary">{grn.status}</Badge>
        <span>
          PO: <strong>{grn.purchaseOrder?.reference ?? `#${grn.purchase_order_id}`}</strong>
        </span>
        <span>
          Supplier: <strong>{grn.purchaseOrder?.supplier?.name ?? "—"}</strong>
        </span>
        <span>Received: {new Date(grn.received_at).toLocaleString()}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6 min-w-0">
          <Card>
            <CardHeader>
              <CardTitle>Received lines</CardTitle>
              <CardDescription>
                Enter quantities for each PO line. Accepted plus rejected must equal received.
                Assign a putaway bin or cage for warehoused stock. Procurement-only lines (glass,
                add-ons) only need quantities — they are not put into warehouse storage.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {locationsError ? (
                <p className="text-sm text-destructive">{locationsError}</p>
              ) : null}
              {lines.map((line, index) => (
                <ReceivedLineCard
                  key={line.id}
                  line={line}
                  index={index}
                  locationTree={locationTree}
                  locationsLoading={locationsLoading}
                  locationsError={locationsError}
                  warehouseItems={warehouseItems}
                  itemsLoading={itemsLoading}
                  putawayOptions={
                    line.warehouse_item_id
                      ? putawayByItemId[line.warehouse_item_id] ?? null
                      : null
                  }
                  onChange={(updated) =>
                    setLines((current) =>
                      current.map((entry) => (entry.id === updated.id ? updated : entry)),
                    )
                  }
                />
              ))}

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <LabeledField
                  label="General receiving notes"
                  htmlFor="grn-notes"
                  hint="Visible on the GRN for warehouse and procurement."
                >
                  <Textarea
                    id="grn-notes"
                    rows={4}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Delivery condition, carrier, unloading notes…"
                  />
                </LabeledField>
                <LabeledField
                  label="Quality inspection notes"
                  htmlFor="grn-quality-notes"
                  hint="Summary of QC checks performed at receiving."
                >
                  <Textarea
                    id="grn-quality-notes"
                    rows={4}
                    value={qualityNotes}
                    onChange={(event) => setQualityNotes(event.target.value)}
                    placeholder="Visual inspection, sampling, hold status…"
                  />
                </LabeledField>
              </div>

              <Button onClick={onSave} disabled={saving} className="min-w-[140px]">
                {saving ? "Saving…" : "Save line updates"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Supporting documents</CardTitle>
              <CardDescription>
                Take a camera snapshot or upload receipt, invoice, and delivery documents.
                Each file saves automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {(Object.keys(attachmentLabels) as GrnAttachmentType[]).map((type) => (
                  <GrnAttachmentCard
                    key={type}
                    type={type}
                    compact
                    attachments={grn.attachments ?? []}
                    uploading={uploadingAttachment === type}
                    onFileSelected={(file) => onAttachmentUpload(type, file)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Verification checklist</CardTitle>
              <CardDescription>
                Complete all items before verifying — stock updates on putaway after verify.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ChecklistRow
                ok={attachmentTypes.has("receipt_photo")}
                label="Receipt photo uploaded"
              />
              <ChecklistRow
                ok={attachmentTypes.has("invoice_photo")}
                label="Invoice photo uploaded"
              />
              <ChecklistRow ok={qtyBalancesValid} label="Quantity balances valid on all lines" />
              <ChecklistRow
                ok={warehouseItemsLinked}
                label="Stock lines linked to warehouse (procurement-only lines exempt)"
              />
              <ChecklistRow
                ok={rejectionReasonsComplete}
                label="Rejection reasons provided where needed"
              />
              <Separator />
              <Button
                className="w-full"
                disabled={!canVerify || verifying || grn.status === "verified"}
                onClick={onVerify}
              >
                {verifying ? "Verifying…" : "Verify & update stock"}
              </Button>
              {grn.status === "verified" ? (
                <p className="text-center text-xs text-muted-foreground">
                  This GRN is already verified.
                </p>
              ) : null}
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={`/warehouse/receive?grn=${grn.id}`}>Continue to putaway</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
