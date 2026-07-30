"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { PermissionGate } from "@/components/auth/permission-gate";
import { MaterialCodeSearch } from "@/components/warehouse/material-code-search";
import { CatalogMasterTable } from "@/components/warehouse/catalog-master-table";
import { WarehouseMaterialCatalogPanel } from "@/components/warehouse/warehouse-material-catalog-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deactivateAccessory,
  deactivateAluminiumProfile,
  deactivateRubber,
  type CatalogInventoryItem,
  type WarehouseItem,
} from "@/lib/api/warehouse";
import { toast } from "sonner";

export default function WarehouseMasterDataPage() {
  const [searchMatch, setSearchMatch] = useState<WarehouseItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshCatalog = () => setRefreshKey((value) => value + 1);

  const deactivateCatalogItem = async (item: CatalogInventoryItem) => {
    const fn =
      item.category === "accessory"
        ? deactivateAccessory
        : item.category === "rubber"
          ? deactivateRubber
          : deactivateAluminiumProfile;

    try {
      await fn(item.id);
      toast.success("Catalog item deactivated.");
      refreshCatalog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to deactivate record.");
    }
  };

  useEffect(() => {
    refreshCatalog();
  }, []);

  return (
    <div className="flex min-w-0 w-full flex-col overflow-x-hidden">
      <AppHeader title="Master Data" subtitle="Import and browse the material catalog" />
      <div className="grid min-w-0 gap-6 p-4 sm:p-6 xl:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Find Material by Code</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 space-y-3">
            <MaterialCodeSearch
              onSelect={(item) => setSearchMatch(item)}
              placeholder="Search material code (e.g. PC60D11)"
            />
            {searchMatch ? (
              <div className="min-w-0 rounded-lg border px-3 py-2 text-sm">
                <p className="break-words font-medium">
                  {searchMatch.sku} · {searchMatch.name}
                </p>
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{searchMatch.category}</Badge>
                  <span>Use this item in procurement, BOM, and receiving.</span>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
        <PermissionGate permission="warehouse.master_data.manage">
          <WarehouseMaterialCatalogPanel onImported={refreshCatalog} />
        </PermissionGate>
        <div className="min-w-0 xl:col-span-2">
          <CatalogMasterTable
            refreshKey={refreshKey}
            onDeactivate={(item) => void deactivateCatalogItem(item)}
          />
        </div>
      </div>
    </div>
  );
}
