"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MeasurementLinePhotoCell } from "@/components/measurements/measurement-line-photo-cell";
import { Plus, Trash2 } from "lucide-react";
import {
  emptyMeasurementLine,
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
  { key: "wall_thickness_mm", label: "Wall thickness", short: "WTk" },
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

export function MeasurementLineGrid({
  lines,
  readOnly,
  photoUrls,
  onChange,
  onLinePhotoUpload,
  onLinePhotoRemove,
}: MeasurementLineGridProps) {
  function addLine() {
    onChange([...lines, emptyMeasurementLine(lines.length)]);
  }

  function removeLine(index: number) {
    onChange(lines.filter((_, lineIndex) => lineIndex !== index));
  }

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
            {lines.map((line, index) => (
              <tr key={index} className="border-t border-border align-top">
                <td className="px-2 py-2">
                  {readOnly ? (
                    line.ref || "—"
                  ) : (
                    <Input
                      className="h-8 min-w-14"
                      value={line.ref ?? ""}
                      onChange={(event) =>
                        onChange(updateLine(lines, index, { ref: event.target.value }))
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
                          updateLine(lines, index, { unit_floor: event.target.value }),
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
                    line.product_type || "—"
                  ) : (
                    <Input
                      className="h-8 min-w-24"
                      value={line.product_type ?? ""}
                      onChange={(event) =>
                        onChange(
                          updateLine(lines, index, {
                            product_type: event.target.value,
                          }),
                        )
                      }
                    />
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
                {DIMENSION_FIELDS.map((field) => (
                  <td key={field.key} className="px-2 py-2">
                    {readOnly ? (
                      (line[field.key] as number | null | undefined) ?? "—"
                    ) : (
                      <Input
                        className="h-8 w-20"
                        type="number"
                        min={0}
                        value={(line[field.key] as number | null | undefined) ?? ""}
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
                ))}
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
                          updateLine(lines, index, { remarks: event.target.value }),
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
                    onRemove={(photoId) => onLinePhotoRemove(index, photoId)}
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
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        WT = Width top · WC = Width centre · WB = Width bottom · HL = Height left ·
        HC = Height centre · HR = Height right · Wall height = finished floor level
        to ceiling/beam/soffit. All dimensions in mm.
      </p>

      {!readOnly && (
        <Button type="button" variant="outline" size="sm" onClick={addLine}>
          <Plus className="mr-1 h-4 w-4" />
          Add line
        </Button>
      )}
    </div>
  );
}
