"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PermissionGate } from "@/components/auth/permission-gate";
import {
  listCatalogItems,
  type CatalogInventoryItem,
  type CatalogTier,
} from "@/lib/api/warehouse";
import { getApiErrorMessage } from "@/lib/api/errors";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TIER_LABELS: Record<CatalogTier, string> = {
  premium: "Premium",
  standard: "Standard",
  balustrade: "Balustrade",
  specialty: "Specialty",
};

type CatalogItemBrowserProps = {
  title: string;
  category: "aluminium_profile" | "accessory" | "rubber";
  onDeactivate?: (item: CatalogInventoryItem) => void;
  refreshKey?: number;
};

export function CatalogItemBrowser({
  title,
  category,
  onDeactivate,
  refreshKey = 0,
}: CatalogItemBrowserProps) {
  const [items, setItems] = useState<CatalogInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState<CatalogTier | "all">("all");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    listCatalogItems({
      category,
      catalog_tier: tier,
      search: search || undefined,
      page: 1,
      per_page: 50,
    })
      .then((response) => {
        if (cancelled) return;
        setItems(response.data);
        setIndex(0);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = getApiErrorMessage(error, "Failed to load catalog items.");
        setItems([]);
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, refreshKey, search, tier]);

  const current = items[index] ?? null;
  const metadata = (current?.catalog_metadata ?? {}) as Record<string, unknown>;
  const sheet =
    (typeof metadata.sheet_name === "string" && metadata.sheet_name) ||
    current?.profile_family ||
    null;
  const barLength =
    current?.standard_bar_length_mm ??
    (typeof metadata.standard_bar_length_mm === "number"
      ? metadata.standard_bar_length_mm
      : null);

  const positionLabel = useMemo(() => {
    if (items.length === 0) return "0 of 0";
    return `${index + 1} of ${items.length}`;
  }, [index, items.length]);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          <Badge variant="outline">{items.length} items</Badge>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search SKU, name, description…"
            className="h-9"
          />
          <Select value={tier} onValueChange={(value) => setTier(value as CatalogTier | "all")}>
            <SelectTrigger className="h-9 w-full sm:w-[160px]">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tiers</SelectItem>
              {(Object.keys(TIER_LABELS) as CatalogTier[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {TIER_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading catalog…
          </div>
        ) : loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : !current ? (
          <p className="text-sm text-muted-foreground">
            Import a material catalog to browse items.
          </p>
        ) : (
          <>
            <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg border bg-white">
              {current.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.image_url}
                  alt={current.name}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-sm text-muted-foreground">No image</span>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-medium">
                  {current.sku}
                </code>
                {current.catalog_tier ? (
                  <Badge variant="secondary">
                    {TIER_LABELS[current.catalog_tier as CatalogTier] ?? current.catalog_tier}
                  </Badge>
                ) : null}
              </div>
              <p className="text-base font-semibold">{current.name}</p>
              <p className="text-sm text-muted-foreground">
                {current.description?.trim() || "No description"}
              </p>
              <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                <p>Sheet / family: {sheet ?? "—"}</p>
                <p>Bar length: {barLength ? `${barLength} mm` : "—"}</p>
                <p>
                  On hand: {Number(current.quantity_on_hand).toFixed(3)}{" "}
                  {current.unit_of_measure ?? ""}
                </p>
                <p>
                  Reserved: {Number(current.quantity_reserved).toFixed(3)}{" "}
                  {current.unit_of_measure ?? ""}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={index <= 0}
                onClick={() => setIndex((value) => Math.max(0, value - 1))}
              >
                <ChevronLeft className="mr-1 size-4" />
                Prev
              </Button>
              <span className="text-sm text-muted-foreground">{positionLabel}</span>
              <Button
                size="sm"
                variant="outline"
                disabled={index >= items.length - 1}
                onClick={() => setIndex((value) => Math.min(items.length - 1, value + 1))}
              >
                Next
                <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>

            {onDeactivate ? (
              <PermissionGate permission="warehouse.master_data.manage">
                <Button size="sm" variant="ghost" onClick={() => onDeactivate(current)}>
                  Deactivate
                </Button>
              </PermissionGate>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
