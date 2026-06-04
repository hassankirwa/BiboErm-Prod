"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  flattenBinsForItemCategory,
  putawayLocationLabels,
  type WarehouseItem,
  type WarehouseLocationTree,
} from "@/lib/api/warehouse";

type GrnPutawaySelectProps = {
  id: string;
  warehouseItemId: number | null;
  warehouseItemCategory: string | null;
  toBinId: number | null;
  locationTree: WarehouseLocationTree[];
  warehouseItems: WarehouseItem[];
  locationsLoading?: boolean;
  locationsError?: string | null;
  disabled?: boolean;
  onChange: (toBinId: number | null) => void;
};

export function GrnPutawaySelect({
  id,
  warehouseItemId,
  warehouseItemCategory,
  toBinId,
  locationTree,
  warehouseItems,
  locationsLoading = false,
  locationsError = null,
  disabled = false,
  onChange,
}: GrnPutawaySelectProps) {
  const category =
    warehouseItemCategory ??
    warehouseItems.find((item) => item.id === warehouseItemId)?.category ??
    null;
  const binOptions = useMemo(
    () => flattenBinsForItemCategory(locationTree, category),
    [locationTree, category],
  );
  const labels = putawayLocationLabels(category);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{labels.fieldLabel}</Label>
      <select
        id={id}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs disabled:cursor-not-allowed disabled:opacity-50"
        value={toBinId ?? ""}
        disabled={disabled || locationsLoading || !warehouseItemId || binOptions.length === 0}
        onChange={(event) =>
          onChange(event.target.value ? Number(event.target.value) : null)
        }
      >
        <option value="">
          {locationsLoading
            ? "Loading storage locations…"
            : !warehouseItemId
              ? "Link item first…"
              : locationsError
                ? "Could not load locations"
                : binOptions.length === 0
                  ? "No locations for this type"
                  : labels.placeholder}
        </option>
        {binOptions.map((bin) => (
          <option key={bin.id} value={bin.id}>
            {bin.label}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">
        {warehouseItemId ? labels.hint : labels.selectHint}
      </p>
    </div>
  );
}
