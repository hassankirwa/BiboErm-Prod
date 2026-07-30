"use client";

import { Fragment, useCallback, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  getItemLocationLegend,
  type CatalogInventoryItem,
  type CatalogTier,
  type ItemLocationLegendRow,
} from "@/lib/api/warehouse";
import { AlertTriangle, ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { toast } from "sonner";

const categoryLabels: Record<string, string> = {
  aluminium_profile: "Aluminium Profile",
  accessory: "Accessory",
  rubber: "Rubber/Gasket",
};

const categoryColors: Record<string, string> = {
  aluminium_profile: "bg-primary/10 text-primary",
  accessory: "bg-info/10 text-info",
  rubber: "bg-warning/10 text-warning",
};

const tierLabels: Record<CatalogTier, string> = {
  premium: "Premium",
  standard: "Standard",
  balustrade: "Balustrade",
  specialty: "Specialty",
};

type LocationCache = Record<
  number,
  { rows: ItemLocationLegendRow[]; sectionCode: string | null; loading: boolean; error?: string }
>;

function formatQty(value: string | number, unit?: string | null) {
  const n = Number(value);
  const formatted = Number.isFinite(n) ? n.toFixed(3) : "0.000";
  return unit ? `${formatted} ${unit}` : formatted;
}

function LocationLegendPanel({
  rows,
  sectionCode,
  unit,
  loading,
  error,
}: {
  rows: ItemLocationLegendRow[];
  sectionCode: string | null;
  unit?: string | null;
  loading: boolean;
  error?: string;
}) {
  if (loading) {
    return (
      <p className="px-4 py-3 text-sm text-muted-foreground">Loading cage quantities…</p>
    );
  }

  if (error) {
    return <p className="px-4 py-3 text-sm text-destructive">{error}</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="px-4 py-3 text-sm text-muted-foreground">
        No storage cages mapped for this material yet.
      </p>
    );
  }

  return (
    <div className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" />
        <span>
          Storage section{" "}
          <span className="font-medium text-foreground">{sectionCode ?? "—"}</span>
          {" · "}
          quantity per cage
        </span>
      </div>
      <div className="overflow-x-auto rounded-md border border-border/80 bg-background">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Cage / Bin</TableHead>
              <TableHead>Section</TableHead>
              <TableHead className="text-right">On Hand</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead className="text-right">Available</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((loc) => {
              const onHand = Number(loc.quantity_on_hand);
              const available = Number(loc.quantity_available);
              const empty = onHand <= 0;

              return (
                <TableRow
                  key={loc.bin_id}
                  className={empty ? "text-muted-foreground" : undefined}
                >
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground">
                        {loc.display_bin_code || loc.bin_code}
                      </code>
                      {loc.is_default ? (
                        <Badge variant="outline" className="text-[10px]">
                          Default
                        </Badge>
                      ) : null}
                      {loc.bin_name ? (
                        <span className="text-xs text-muted-foreground">{loc.bin_name}</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {loc.section_code ?? "—"}
                    {loc.deck_name ? (
                      <span className="block text-[10px] text-muted-foreground">
                        {loc.deck_name}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right font-medium text-foreground">
                    {formatQty(loc.quantity_on_hand, unit)}
                  </TableCell>
                  <TableCell className="text-right text-warning">
                    {formatQty(loc.quantity_reserved, unit)}
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      available <= 0 ? "text-destructive" : "text-success"
                    }`}
                  >
                    {formatQty(loc.quantity_available, unit)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function InventoryTable({ items }: { items: CatalogInventoryItem[] }) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [locationsByItem, setLocationsByItem] = useState<LocationCache>({});

  const loadLocations = useCallback(async (itemId: number) => {
    setLocationsByItem((prev) => ({
      ...prev,
      [itemId]: {
        rows: prev[itemId]?.rows ?? [],
        sectionCode: prev[itemId]?.sectionCode ?? null,
        loading: true,
      },
    }));

    try {
      const res = await getItemLocationLegend(itemId);
      setLocationsByItem((prev) => ({
        ...prev,
        [itemId]: {
          rows: res.data,
          sectionCode: res.meta.section_code,
          loading: false,
        },
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load location legend.";
      setLocationsByItem((prev) => ({
        ...prev,
        [itemId]: {
          rows: [],
          sectionCode: null,
          loading: false,
          error: message,
        },
      }));
      toast.error(message);
    }
  }, []);

  const toggleExpand = (itemId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });

    setLocationsByItem((prev) => {
      const cached = prev[itemId];
      if (!cached || cached.error) {
        void loadLocations(itemId);
      }
      return prev;
    });
  };

  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10" />
            <TableHead>Item</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead className="text-right">On Hand</TableHead>
            <TableHead className="text-right">Reserved</TableHead>
            <TableHead className="text-right">Available</TableHead>
            <TableHead>Stock Level</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const available = Number(item.quantity_available);
            const current = Number(item.quantity_on_hand);
            const reserved = Number(item.quantity_reserved);
            const minStock = Number(item.min_stock_qty ?? 0);
            const unit = item.unit_of_measure ?? "";
            const isLowStock = item.stock_status === "low_stock" || available < minStock;
            const stockPercent = Math.min(
              100,
              Math.round((available / Math.max(minStock, 1)) * 100),
            );
            const isOpen = expandedIds.has(item.id);
            const locationState = locationsByItem[item.id];

            return (
              <Fragment key={item.id}>
                <TableRow className="group">
                  <TableCell className="pr-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-expanded={isOpen}
                      aria-label={
                        isOpen
                          ? `Hide locations for ${item.sku}`
                          : `Show locations for ${item.sku}`
                      }
                      onClick={() => toggleExpand(item.id)}
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded border bg-white">
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] text-muted-foreground">No img</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground flex items-center gap-2">
                          {item.name}
                          {isLowStock && (
                            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.description?.trim() || "No description"}
                        </p>
                        <button
                          type="button"
                          className="mt-1 text-[11px] text-primary hover:underline"
                          onClick={() => toggleExpand(item.id)}
                        >
                          {isOpen ? "Hide cages" : "Show cages & qty"}
                        </button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{item.sku}</code>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={categoryColors[item.category] ?? ""}
                    >
                      {categoryLabels[item.category] ?? item.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {item.catalog_tier
                        ? (tierLabels[item.catalog_tier as CatalogTier] ?? item.catalog_tier)
                        : "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {current.toFixed(3)} {unit}
                  </TableCell>
                  <TableCell className="text-right text-warning">
                    {reserved.toFixed(3)} {unit}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        isLowStock || available <= 0
                          ? "text-destructive font-medium"
                          : "text-success"
                      }
                    >
                      {available.toFixed(3)} {unit}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="w-24">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-muted-foreground">Min: {minStock.toFixed(3)}</span>
                        <span
                          className={
                            isLowStock ? "text-destructive" : "text-muted-foreground"
                          }
                        >
                          {stockPercent}%
                        </span>
                      </div>
                      <Progress
                        value={stockPercent}
                        className={`h-1.5 ${isLowStock ? "[&>div]:bg-destructive" : ""}`}
                      />
                    </div>
                  </TableCell>
                </TableRow>
                {isOpen ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={9} className="bg-muted/40 p-0">
                      <LocationLegendPanel
                        rows={locationState?.rows ?? []}
                        sectionCode={locationState?.sectionCode ?? null}
                        unit={unit}
                        loading={Boolean(locationState?.loading) || !locationState}
                        error={locationState?.error}
                      />
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            );
          })}
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                No inventory records found.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
