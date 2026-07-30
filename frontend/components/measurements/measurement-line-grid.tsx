"use client";

import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MeasurementLinePhotoCell } from "@/components/measurements/measurement-line-photo-cell";
import { BalconyMeasurementPanel } from "@/components/measurements/balcony-measurement-panel";
import { ShowerMeasurementPanel } from "@/components/measurements/shower-measurement-panel";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import {
  balconyTypeLabel,
  emptyBalconyDetails,
} from "@/lib/measurements/balcony-types";
import {
  emptyShowerDetails,
  showerTypeLabel,
} from "@/lib/measurements/shower-types";
import {
  emptyMeasurementLine,
  isSpecializedMeasurementProduct,
  MEASUREMENT_PRODUCT_TYPE_OPTIONS,
  type MeasurementProductType,
  type SiteMeasurementLine,
} from "@/lib/measurements/types";

type MeasurementLineGridProps = {
  lines: SiteMeasurementLine[];
  readOnly: boolean;
  photoUrls: Map<number, string>;
  onChange: (lines: SiteMeasurementLine[]) => void;
  onLinePhotoUpload: (lineIndex: number, file: File) => Promise<void>;
  onLinePhotoRemove: (lineIndex: number, photoId: number) => void;
};

const DIMENSION_FIELDS: Array<{
  key: keyof SiteMeasurementLine;
  label: string;
  short: string;
}> = [
  { key: "width_top_mm", label: "Width top", short: "WT" },
  { key: "width_centre_mm", label: "Width centre", short: "WC" },
  { key: "width_bottom_mm", label: "Width bottom", short: "WB" },
  { key: "height_left_mm", label: "Height left", short: "HL" },
  { key: "height_centre_mm", label: "Height centre", short: "HC" },
  { key: "height_right_mm", label: "Height right", short: "HR" },
  { key: "wall_height_mm", label: "Wall height", short: "WH" },
  { key: "wall_thickness_mm", label: "Wall thickness", short: "WTK" },
];

function updateLine(
  lines: SiteMeasurementLine[],
  index: number,
  patch: Partial<SiteMeasurementLine>,
): SiteMeasurementLine[] {
  return lines.map((line, lineIndex) =>
    lineIndex === index ? { ...line, ...patch } : line,
  );
}

function specializedSummary(line: SiteMeasurementLine): string {
  if (line.product_type === "Balcony") {
    const details = line.balcony_details;
    const type = balconyTypeLabel(details?.balcony_type);
    const width = details?.overall_width_mm;
    const depth = details?.overall_projection_mm;
    const dims =
      width || depth
        ? ` · ${width ?? "—"} × ${depth ?? "—"} mm`
        : "";
    return `${type}${dims}`;
  }

  if (line.product_type === "Bathroom") {
    const details = line.shower_details;
    const type = showerTypeLabel(details?.shower_type);
    const width = details?.overall_width_mm;
    const depth = details?.overall_depth_mm;
    const height = details?.overall_height_mm;
    const dims =
      width || depth || height
        ? ` · ${width ?? "—"} × ${depth ?? "—"} × ${height ?? "—"} mm`
        : "";
    return `${type}${dims}`;
  }

  return "—";
}

export function MeasurementLineGrid({
  lines,
  readOnly,
  photoUrls,
  onChange,
  onLinePhotoUpload,
  onLinePhotoRemove,
}: MeasurementLineGridProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  function addLine() {
    onChange([...lines, emptyMeasurementLine(lines.length)]);
  }

  function removeLine(index: number) {
    onChange(lines.filter((_, lineIndex) => lineIndex !== index));
  }

  function toggleExpanded(index: number) {
    setExpanded((current) => ({
      ...current,
      [index]: !current[index],
    }));
  }

  function setProductType(index: number, productType: MeasurementProductType) {
    const patch: Partial<SiteMeasurementLine> = {
      product_type: productType,
    };

    if (productType === "Balcony") {
      patch.balcony_details =
        lines[index]?.balcony_details ?? emptyBalconyDetails();
      patch.shower_details = null;
    } else if (productType === "Bathroom") {
      patch.shower_details =
        lines[index]?.shower_details ?? emptyShowerDetails();
      patch.balcony_details = null;
    } else {
      patch.balcony_details = null;
      patch.shower_details = null;
    }

    onChange(updateLine(lines, index, patch));
    if (isSpecializedMeasurementProduct(productType)) {
      setExpanded((current) => ({ ...current, [index]: true }));
    }
  }

  const colSpan =
    5 + DIMENSION_FIELDS.length + 2 + (readOnly ? 0 : 1);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="min-w-[1200px] w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-2 py-2 text-left font-medium">Ref</th>
              <th className="px-2 py-2 text-left font-medium">Unit/Floor</th>
              <th className="px-2 py-2 text-left font-medium">Room</th>
              <th className="px-2 py-2 text-left font-medium">Product</th>
              <th className="px-2 py-2 text-left font-medium">Qty</th>
              {DIMENSION_FIELDS.map((field) => (
                <th key={field.key} className="px-2 py-2 text-left font-medium">
                  {field.short}
                </th>
              ))}
              <th className="px-2 py-2 text-left font-medium">Remarks</th>
              <th className="px-2 py-2 text-left font-medium">Photo</th>
              {!readOnly && <th className="px-2 py-2" />}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const specialized = isSpecializedMeasurementProduct(
                line.product_type,
              );
              const isOpen = Boolean(expanded[index]) || (readOnly && specialized);

              return (
                <Fragment key={index}>
                  <tr className="border-t border-border align-top">
                    <td className="px-2 py-2">
                      {readOnly ? (
                        line.ref || "—"
                      ) : (
                        <Input
                          className="h-8 min-w-14"
                          value={line.ref ?? ""}
                          onChange={(event) =>
                            onChange(
                              updateLine(lines, index, {
                                ref: event.target.value,
                              }),
                            )
                          }
                        />
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {readOnly ? (
                        line.unit_floor || "—"
                      ) : (
                        <Input
                          className="h-8 min-w-20"
                          value={line.unit_floor ?? ""}
                          onChange={(event) =>
                            onChange(
                              updateLine(lines, index, {
                                unit_floor: event.target.value,
                              }),
                            )
                          }
                        />
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {readOnly ? (
                        line.room_location || "—"
                      ) : (
                        <Input
                          className="h-8 min-w-28"
                          value={line.room_location ?? ""}
                          onChange={(event) =>
                            onChange(
                              updateLine(lines, index, {
                                room_location: event.target.value,
                              }),
                            )
                          }
                        />
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {readOnly ? (
                        MEASUREMENT_PRODUCT_TYPE_OPTIONS.find(
                          (option) => option.value === line.product_type,
                        )?.label ||
                        line.product_type ||
                        "—"
                      ) : (
                        <Select
                          value={line.product_type ?? undefined}
                          onValueChange={(value) =>
                            setProductType(
                              index,
                              value as MeasurementProductType,
                            )
                          }
                        >
                          <SelectTrigger className="h-8 min-w-36">
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {MEASUREMENT_PRODUCT_TYPE_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {readOnly ? (
                        line.quantity ?? 1
                      ) : (
                        <Input
                          className="h-8 w-16"
                          type="number"
                          min={1}
                          value={line.quantity ?? 1}
                          onChange={(event) =>
                            onChange(
                              updateLine(lines, index, {
                                quantity: Number(event.target.value) || 1,
                              }),
                            )
                          }
                        />
                      )}
                    </td>
                    {specialized ? (
                      <td
                        className="px-2 py-2"
                        colSpan={DIMENSION_FIELDS.length}
                      >
                        <div className="flex min-w-[220px] items-start gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-10 shrink-0 sm:h-8"
                            onClick={() => toggleExpanded(index)}
                          >
                            {isOpen ? (
                              <ChevronDown className="mr-1 h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="mr-1 h-3.5 w-3.5" />
                            )}
                            {isOpen ? "Hide details" : "Edit details"}
                          </Button>
                          <p className="pt-1.5 text-muted-foreground">
                            {specializedSummary(line)}
                          </p>
                        </div>
                      </td>
                    ) : (
                      DIMENSION_FIELDS.map((field) => (
                        <td key={field.key} className="px-2 py-2">
                          {readOnly ? (
                            (line[field.key] as number | null | undefined) ??
                            "—"
                          ) : (
                            <Input
                              className="h-8 w-20"
                              type="number"
                              min={0}
                              value={
                                (line[field.key] as
                                  | number
                                  | null
                                  | undefined) ?? ""
                              }
                              onChange={(event) =>
                                onChange(
                                  updateLine(lines, index, {
                                    [field.key]: event.target.value
                                      ? Number(event.target.value)
                                      : null,
                                  }),
                                )
                              }
                            />
                          )}
                        </td>
                      ))
                    )}
                    <td className="px-2 py-2">
                      {readOnly ? (
                        line.remarks || "—"
                      ) : (
                        <Textarea
                          className="min-h-8 min-w-32"
                          rows={2}
                          value={line.remarks ?? ""}
                          onChange={(event) =>
                            onChange(
                              updateLine(lines, index, {
                                remarks: event.target.value,
                              }),
                            )
                          }
                        />
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <MeasurementLinePhotoCell
                        photoIds={line.photo_refs ?? []}
                        photoUrls={photoUrls}
                        readOnly={readOnly}
                        unitFloor={line.unit_floor}
                        roomLocation={line.room_location}
                        onUpload={(file) => onLinePhotoUpload(index, file)}
                        onRemove={(photoId) =>
                          onLinePhotoRemove(index, photoId)
                        }
                      />
                    </td>
                    {!readOnly && (
                      <td className="px-2 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeLine(index)}
                          disabled={lines.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                  {specialized && isOpen && (
                    <tr className="border-t border-border">
                      <td colSpan={colSpan} className="p-0">
                        {line.product_type === "Balcony" ? (
                          <BalconyMeasurementPanel
                            value={line.balcony_details}
                            readOnly={readOnly}
                            onChange={(balcony_details) =>
                              onChange(
                                updateLine(lines, index, { balcony_details }),
                              )
                            }
                          />
                        ) : (
                          <ShowerMeasurementPanel
                            value={line.shower_details}
                            readOnly={readOnly}
                            onChange={(shower_details) =>
                              onChange(
                                updateLine(lines, index, { shower_details }),
                              )
                            }
                          />
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Door/Window: WT = Width top · WC = Width centre · WB = Width bottom · HL
        = Height left · HC = Height centre · HR = Height right · WH = wall height
        · WTK = wall thickness (mm). Balcony and Shower Enclosure use the detail
        form instead of these columns.
      </p>

      {!readOnly && (
        <Button type="button" variant="destructive" size="sm" className="h-10 w-full sm:h-8 sm:w-auto" onClick={addLine}>
          <Plus className="mr-1 h-4 w-4" />
          Add line
        </Button>
      )}
    </div>
  );
}
