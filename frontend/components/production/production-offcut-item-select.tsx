"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listAluminiumProfiles, warehouseItemLabel, type WarehouseItem } from "@/lib/api/warehouse";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { CuttingSheetLine } from "@/lib/api/production";
import { toast } from "sonner";

type SheetOption = { id: number; label: string };

type Props = {
  cuttingSheetLines: CuttingSheetLine[];
  value: string;
  onValueChange: (value: string) => void;
};

export function ProductionOffcutItemSelect({
  cuttingSheetLines,
  value,
  onValueChange,
}: Props) {
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const sheetOptions: SheetOption[] = useMemo(() => {
    const seen = new Set<number>();
    return cuttingSheetLines
      .filter((line) => {
        if (seen.has(line.warehouse_item_id)) return false;
        seen.add(line.warehouse_item_id);
        return true;
      })
      .map((line) => ({
        id: line.warehouse_item_id,
        label: `${line.profile_code} (${line.cut_length_mm} mm cut)`,
      }));
  }, [cuttingSheetLines]);

  const profileOptions: SheetOption[] = useMemo(
    () =>
      warehouseItems.map((item) => ({
        id: item.id,
        label: warehouseItemLabel(item),
      })),
    [warehouseItems],
  );

  const options = sheetOptions.length > 0 ? sheetOptions : profileOptions;

  useEffect(() => {
    if (sheetOptions.length > 0) {
      return;
    }
    setLoadingItems(true);
    listAluminiumProfiles()
      .then((res) => setWarehouseItems(res.data))
      .catch((err) =>
        toast.error(getApiErrorMessage(err, "Failed to load aluminium profiles")),
      )
      .finally(() => setLoadingItems(false));
  }, [sheetOptions.length]);

  if (options.length === 0 && loadingItems) {
    return (
      <p className="text-xs text-muted-foreground">Loading profile items…</p>
    );
  }

  if (options.length === 0) {
    return (
      <p className="text-xs text-amber-700 dark:text-amber-400">
        Generate the cutting sheet from BOM first, or ensure aluminium profiles exist in
        warehouse master data.
      </p>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue
          placeholder={
            sheetOptions.length > 0 ? "Select from cutting sheet" : "Select aluminium profile"
          }
        />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.id} value={String(opt.id)}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
