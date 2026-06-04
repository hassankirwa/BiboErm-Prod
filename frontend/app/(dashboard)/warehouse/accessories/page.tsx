"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  listAccessories,
  listDoorTypes,
  listInventory,
  type DoorType,
  type StockLevel,
  type WarehouseItem,
} from "@/lib/api/warehouse";
import { WarehouseAuditLauncher } from "@/components/qc/warehouse-audit-launcher";
import { toast } from "sonner";

function AccessoriesPageContent() {
  const [doorTypes, setDoorTypes] = useState<DoorType[]>([]);
  const [activeDoorType, setActiveDoorType] = useState<string>("all");
  const [accessories, setAccessories] = useState<WarehouseItem[]>([]);
  const [stock, setStock] = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listDoorTypes()
      .then((res) => setDoorTypes(res.data))
      .catch(() => setDoorTypes([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const doorTypeId =
      activeDoorType !== "all" ? Number(activeDoorType) : undefined;

    Promise.all([
      listAccessories(doorTypeId ? { door_type_id: doorTypeId } : undefined),
      listInventory({
        deck: "accessories",
        per_page: 200,
      }),
    ])
      .then(([accRes, invRes]) => {
        setAccessories(accRes.data);
        setStock(invRes.data);
      })
      .catch((error: Error) => toast.error(error.message || "Failed to load."))
      .finally(() => setLoading(false));
  }, [activeDoorType]);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Accessories browser"
        subtitle="Browse accessories by door type and stock on accessories deck"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/warehouse/inventory?deck=accessories">Full inventory</Link>
          </Button>
        }
      />
      <div className="space-y-6 p-6">
        <WarehouseAuditLauncher
          context="warehouse_accessories_audit"
          title="Accessories deck audit"
          description="Periodic QC audit for accessories bins, labels, and FIFO visibility."
        />
        <Tabs value={activeDoorType} onValueChange={setActiveDoorType}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            {doorTypes.map((dt) => (
              <TabsTrigger key={dt.id} value={String(dt.id)}>
                {dt.code}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={activeDoorType} className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Catalog items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : (
                  accessories.map((item) => (
                    <div key={item.id} className="rounded border px-3 py-2 text-sm">
                      <span className="font-medium">{item.sku}</span> — {item.name}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Stock on accessories deck</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[400px] overflow-y-auto text-sm">
                {stock.map((level) => (
                  <div key={level.id} className="flex justify-between border-b py-2">
                    <span>
                      {level.item?.sku} · {level.location?.section?.code}/{level.bin?.code}
                    </span>
                    <span className="text-muted-foreground">{level.quantity_available}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function WarehouseAccessoriesPage() {
  return (
    <PermissionGuard permissions={["warehouse.stock.view"]}>
      <AccessoriesPageContent />
    </PermissionGuard>
  );
}
