"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  binsForSection,
  WAREHOUSE_DECK_SLUGS,
  type WarehouseLocationTree,
} from "@/lib/api/warehouse";
import { WarehouseNativeSelect } from "@/components/warehouse/warehouse-native-select";

type WarehouseLocationCascadeProps = {
  locationTree: WarehouseLocationTree[];
  deckSlug: string;
  sectionId: string;
  binId: string;
  onDeckSlugChange: (slug: string) => void;
  onSectionChange: (sectionId: string) => void;
  onBinChange: (binId: string) => void;
  disabled?: boolean;
  showBin?: boolean;
};

export function WarehouseLocationCascade({
  locationTree,
  deckSlug,
  sectionId,
  binId,
  onDeckSlugChange,
  onSectionChange,
  onBinChange,
  disabled,
  showBin = true,
}: WarehouseLocationCascadeProps) {
  const sections = useMemo(() => {
    if (!deckSlug || deckSlug === "all") {
      return locationTree.flatMap((wh) =>
        (wh.decks ?? []).flatMap((deck) =>
          (deck.sections ?? []).map((section) => ({
            id: section.id,
            label: `${deck.name} / ${section.code}`,
          })),
        ),
      );
    }
    return locationTree.flatMap((wh) =>
      (wh.decks ?? [])
        .filter((d) => d.slug === deckSlug)
        .flatMap((deck) =>
          (deck.sections ?? []).map((section) => ({
            id: section.id,
            label: `${section.code} — ${section.name}`,
          })),
        ),
    );
  }, [locationTree, deckSlug]);

  const bins = useMemo(() => {
    if (!sectionId) return [];
    return binsForSection(locationTree, Number(sectionId));
  }, [locationTree, sectionId]);

  const deckOptions = [
    { value: "all", label: "All decks" },
    ...WAREHOUSE_DECK_SLUGS.map((slug) => ({
      value: slug,
      label: slug.charAt(0).toUpperCase() + slug.slice(1),
    })),
  ];

  return (
    <div className="flex flex-wrap gap-3">
      <div className="min-w-[140px] flex-1 space-y-1">
        <Label className="text-xs">Deck</Label>
        <WarehouseNativeSelect
          value={deckSlug || "all"}
          onChange={(v) => {
            onDeckSlugChange(v);
            onSectionChange("");
            onBinChange("");
          }}
          options={deckOptions}
          disabled={disabled}
        />
      </div>
      <div className="min-w-[140px] flex-1 space-y-1">
        <Label className="text-xs">Section</Label>
        <WarehouseNativeSelect
          value={sectionId}
          onChange={(v) => {
            onSectionChange(v);
            onBinChange("");
          }}
          options={sections.map((s) => ({ value: String(s.id), label: s.label }))}
          placeholder="All sections"
          disabled={disabled}
        />
      </div>
      {showBin ? (
        <div className="min-w-[140px] flex-1 space-y-1">
          <Label className="text-xs">Bin</Label>
          <WarehouseNativeSelect
            value={binId}
            onChange={onBinChange}
            options={bins.map((b) => ({ value: String(b.id), label: b.label }))}
            placeholder="All bins"
            disabled={disabled || !sectionId}
          />
        </div>
      ) : null}
    </div>
  );
}
