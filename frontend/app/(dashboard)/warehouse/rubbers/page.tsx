"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { WarehouseNativeSelect } from "@/components/warehouse/warehouse-native-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listAluminiumProfiles,
  listInventory,
  listRubbers,
  suggestRubbers,
  warehouseItemLabel,
  type StockLevel,
  type WarehouseItem,
} from "@/lib/api/warehouse";
import { WarehouseAuditLauncher } from "@/components/qc/warehouse-audit-launcher";
import { toast } from "sonner";

function RubbersPageContent() {
  const [rubbers, setRubbers] = useState<WarehouseItem[]>([]);
  const [profiles, setProfiles] = useState<WarehouseItem[]>([]);
  const [profileId, setProfileId] = useState("");
  const [suggested, setSuggested] = useState<WarehouseItem[]>([]);
  const [stock, setStock] = useState<StockLevel[]>([]);

  useEffect(() => {
    Promise.all([
      listRubbers(),
      listAluminiumProfiles(),
      listInventory({ deck: "rubbers", per_page: 200 }),
    ])
      .then(([rubRes, profRes, invRes]) => {
        setRubbers(rubRes.data);
        setProfiles(profRes.data);
        setStock(invRes.data);
      })
      .catch((error: Error) => toast.error(error.message || "Failed to load rubbers."));
  }, []);

  useEffect(() => {
    if (!profileId) {
      setSuggested([]);
      return;
    }
    suggestRubbers(Number(profileId))
      .then((res) => setSuggested(res.data))
      .catch(() => setSuggested([]));
  }, [profileId]);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Rubbers & gaskets"
        subtitle="Rubber catalog and profile compatibility suggestions"
      />
      <div className="space-y-6 p-6">
        <WarehouseAuditLauncher
          context="warehouse_rubbers_audit"
          title="Rubbers deck audit"
          description="Periodic QC audit for rubber grouping, storage safety, and compatibility labels."
        />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>All rubbers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[360px] overflow-y-auto text-sm">
            {rubbers.map((item) => (
              <div key={item.id} className="rounded border px-3 py-2">
                {warehouseItemLabel(item)}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Suggest for profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <WarehouseNativeSelect
              value={profileId}
              onChange={setProfileId}
              options={profiles.map((p) => ({
                value: String(p.id),
                label: warehouseItemLabel(p),
              }))}
              placeholder="Select aluminium profile"
            />
            <div className="space-y-2">
              {suggested.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {profileId ? "No suggestions." : "Choose a profile."}
                </p>
              ) : (
                suggested.map((item) => (
                  <div key={item.id} className="rounded border px-3 py-2 text-sm">
                    {warehouseItemLabel(item)}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Stock on rubbers deck</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[240px] overflow-y-auto text-sm">
            {stock.map((level) => (
              <div key={level.id} className="flex justify-between border-b py-2">
                <span>
                  {level.item?.sku} · {level.bin?.code}
                </span>
                <span>{level.quantity_available}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}

export default function WarehouseRubbersPage() {
  return (
    <PermissionGuard permissions={["warehouse.stock.view"]}>
      <RubbersPageContent />
    </PermissionGuard>
  );
}
