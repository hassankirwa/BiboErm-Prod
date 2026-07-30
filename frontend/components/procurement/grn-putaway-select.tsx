"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  flattenBinsForItemCategory,
  flattenBinsForWarehouseItem,
  formatPutawayBinLabel,
  formatPutawaySlotTag,
  putawayLocationLabels,
  selectOptionsFromPutawayBins,
  type PutawayOptionsForItem,
  type SelectOption,
  type WarehouseItem,
  type WarehouseLocationTree,
} from "@/lib/api/warehouse";
import { cn } from "@/lib/utils";

type GrnPutawaySelectProps = {
  id: string;
  warehouseItemId: number | null;
  warehouseItemCategory: string | null;
  toBinId: number | null;
  locationTree: WarehouseLocationTree[];
  warehouseItems: WarehouseItem[];
  /** Authoritative Master Data section bins from putaway-options API. */
  putawayOptions?: PutawayOptionsForItem | null;
  locationsLoading?: boolean;
  locationsError?: string | null;
  disabled?: boolean;
  /** Confirmation view: show selected location instead of a dropdown. */
  readOnly?: boolean;
  onChange: (toBinId: number | null) => void;
};

export function GrnPutawaySelect({
  id,
  warehouseItemId,
  warehouseItemCategory,
  toBinId,
  locationTree,
  warehouseItems,
  putawayOptions = null,
  locationsLoading = false,
  locationsError = null,
  disabled = false,
  readOnly = false,
  onChange,
}: GrnPutawaySelectProps) {
  const warehouseItem =
    warehouseItems.find((item) => item.id === warehouseItemId) ?? null;
  const category =
    warehouseItemCategory ??
    putawayOptions?.category ??
    warehouseItem?.category ??
    null;
  const binOptions = useMemo((): SelectOption[] => {
    // Always prefer physical storage bins (CAGE / BIN), never catalog SKUs.
    if (putawayOptions) {
      return selectOptionsFromPutawayBins(putawayOptions);
    }
    if (warehouseItem) {
      return flattenBinsForWarehouseItem(locationTree, warehouseItem, category);
    }
    return flattenBinsForItemCategory(locationTree, category);
  }, [locationTree, warehouseItem, category, putawayOptions]);
  const labels = putawayLocationLabels(category);

  const selectedBin = useMemo(() => {
    if (toBinId == null) return null;
    const fromOptions = putawayOptions?.bins?.find((bin) => bin.id === toBinId);
    if (fromOptions) return fromOptions;
    const option = binOptions.find((bin) => Number(bin.id) === toBinId);
    return option
      ? {
          id: Number(option.id),
          code: "",
          label: option.label,
          tag: null as string | null,
        }
      : null;
  }, [toBinId, putawayOptions, binOptions]);

  const selectValue = toBinId != null ? String(toBinId) : "";

  if (readOnly) {
    const tag =
      selectedBin && "tag" in selectedBin && selectedBin.tag
        ? selectedBin.tag
        : selectedBin
          ? formatPutawaySlotTag(
              (selectedBin as { code?: string }).code,
              putawayOptions?.bins?.find((b) => b.id === toBinId)?.deck_slug ??
                (category === "aluminium_profile" ? "aluminium" : null),
            )
          : null;
    const detail =
      selectedBin && "label" in selectedBin
        ? formatPutawayBinLabel(selectedBin as Parameters<typeof formatPutawayBinLabel>[0]) ||
          selectedBin.label
        : null;

    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{labels.fieldLabel}</Label>
        <div
          id={id}
          className="flex min-h-10 flex-wrap items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm"
        >
          {selectedBin && tag ? (
            <>
              <Badge variant="secondary" className="shrink-0 font-semibold">
                {tag}
              </Badge>
              <span className="min-w-0 break-words text-foreground">
                {detail && detail.startsWith(tag)
                  ? detail.slice(tag.length).replace(/^\s*[·—-]\s*/, "")
                  : detail}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">No location selected</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Confirmed at receiving. Use Edit to change before putaway.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{labels.fieldLabel}</Label>
      <select
        id={id}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
        value={selectValue}
        disabled={disabled || locationsLoading || !warehouseItemId || binOptions.length === 0}
        onChange={(event) => {
          const value = event.target.value;
          if (!value) {
            onChange(null);
            return;
          }

          onChange(Number(value));
        }}
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
          <option key={String(bin.id)} value={String(bin.id)}>
            {bin.label}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">
        {warehouseItemId
          ? putawayOptions?.source === "accessories_deck"
            ? "Choose an accessories storage bin (Handles, Locks, Tracks, etc.)."
            : putawayOptions?.section_code
              ? `Storage cages in ${putawayOptions.section_code}${
                  putawayOptions.catalog_tier
                    ? ` (${putawayOptions.catalog_tier})`
                    : ""
                } — pick Cage 1 / 2 / 3.`
              : labels.hint
          : labels.selectHint}
      </p>
    </div>
  );
}
