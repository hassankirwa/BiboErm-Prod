"use client";

import { useEffect, useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PermissionGate } from "@/components/auth/permission-gate";
import {
  listCatalogItems,
  type CatalogInventoryItem,
  type CatalogTier,
} from "@/lib/api/warehouse";
import { getApiErrorMessage } from "@/lib/api/errors";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

const TIER_LABELS: Record<CatalogTier, string> = {
  premium: "Premium",
  standard: "Standard",
  balustrade: "Balustrade",
  specialty: "Specialty",
};

const CATEGORY_LABELS: Record<string, string> = {
  aluminium_profile: "Aluminium Profile",
  accessory: "Accessory",
  rubber: "Rubber",
};

type CatalogMasterTableProps = {
  onDeactivate?: (item: CatalogInventoryItem) => void;
  refreshKey?: number;
};

export function CatalogMasterTable({ onDeactivate, refreshKey = 0 }: CatalogMasterTableProps) {
  const [items, setItems] = useState<CatalogInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState<CatalogTier | "all">("all");
  const [category, setCategory] = useState<"all" | "aluminium_profile" | "accessory" | "rubber">("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
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
      page,
      per_page: 20,
    })
      .then((response) => {
        if (cancelled) return;
        setItems(response.data);
        setMeta(response.meta);
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
  }, [category, page, refreshKey, search, tier]);

  const from = meta.total === 0 ? 0 : (meta.current_page - 1) * meta.per_page + 1;
  const to = Math.min(meta.current_page * meta.per_page, meta.total);

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Material Catalog</CardTitle>
          <Badge variant="outline">{meta.total} items</Badge>
        </div>
        <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:flex-wrap">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search SKU, name, description…"
              className="h-9 pl-8"
            />
          </div>
          <Select
            value={category}
            onValueChange={(value) => {
              setCategory(value as typeof category);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-full shrink-0 lg:w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="aluminium_profile">Aluminium Profiles</SelectItem>
              <SelectItem value="accessory">Accessories</SelectItem>
              <SelectItem value="rubber">Rubbers</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={tier}
            onValueChange={(value) => {
              setTier(value as CatalogTier | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-full shrink-0 lg:w-[160px]">
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
      <CardContent className="min-w-0 space-y-4">
        <div className="min-w-0 overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[72px]">Image</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Loading catalog…
                    </span>
                  </TableCell>
                </TableRow>
              ) : loadError ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-destructive">
                    {loadError}
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                    Import a material catalog to browse items.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex size-12 items-center justify-center overflow-hidden rounded border bg-white">
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
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{item.sku}</code>
                    </TableCell>
                    <TableCell className="max-w-[180px] whitespace-normal font-medium">
                      <span className="line-clamp-2 break-words">{item.name}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {CATEGORY_LABELS[item.category] ?? item.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {item.catalog_tier
                          ? (TIER_LABELS[item.catalog_tier as CatalogTier] ?? item.catalog_tier)
                          : "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[280px] whitespace-normal text-sm text-muted-foreground">
                      <span className="line-clamp-2 break-words">{item.description?.trim() || "—"}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(item.quantity_on_hand).toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-warning">
                      {Number(item.quantity_reserved).toFixed(3)}
                    </TableCell>
                    <TableCell>
                      {onDeactivate ? (
                        <PermissionGate permission="warehouse.master_data.manage">
                          <Button size="sm" variant="ghost" onClick={() => onDeactivate(item)}>
                            Deactivate
                          </Button>
                        </PermissionGate>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {meta.total === 0 ? "No items" : `Showing ${from}–${to} of ${meta.total}`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={loading || page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <ChevronLeft className="mr-1 size-4" />
              Prev
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {meta.current_page} of {Math.max(1, meta.last_page)}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={loading || page >= meta.last_page}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
