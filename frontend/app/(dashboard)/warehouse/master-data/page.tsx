"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listAccessories,
  listAluminiumProfiles,
  listDoorTypes,
  listRubbers,
  type DoorType,
  type WarehouseItem,
} from "@/lib/api/warehouse";
import { toast } from "sonner";

function MasterDataList({
  title,
  items,
  getLabel,
}: {
  title: string;
  items: Array<DoorType | WarehouseItem>;
  getLabel: (item: DoorType | WarehouseItem) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border px-3 py-2 text-sm">
            {getLabel(item)}
          </div>
        ))}
        {items.length === 0 ? <p className="text-sm text-muted-foreground">No records yet.</p> : null}
      </CardContent>
    </Card>
  );
}

export default function WarehouseMasterDataPage() {
  const [doorTypes, setDoorTypes] = useState<DoorType[]>([]);
  const [profiles, setProfiles] = useState<WarehouseItem[]>([]);
  const [accessories, setAccessories] = useState<WarehouseItem[]>([]);
  const [rubbers, setRubbers] = useState<WarehouseItem[]>([]);

  useEffect(() => {
    Promise.all([
      listDoorTypes(),
      listAluminiumProfiles(),
      listAccessories(),
      listRubbers(),
    ])
      .then(([doorTypesRes, profilesRes, accessoriesRes, rubbersRes]) => {
        setDoorTypes(doorTypesRes.data);
        setProfiles(profilesRes.data);
        setAccessories(accessoriesRes.data);
        setRubbers(rubbersRes.data);
      })
      .catch((error: Error) => toast.error(error.message || "Failed to load master data."));
  }, []);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader title="Master Data" subtitle="Review door types, profiles, accessories, and rubbers" />
      <div className="grid gap-6 p-6 xl:grid-cols-2">
        <MasterDataList
          title="Door Types"
          items={doorTypes}
          getLabel={(item) => {
            const doorType = item as DoorType;
            return `${doorType.code} · ${doorType.name}`;
          }}
        />
        <MasterDataList
          title="Aluminium Profiles"
          items={profiles}
          getLabel={(item) => {
            const profile = item as WarehouseItem;
            return `${profile.sku} · ${profile.name}`;
          }}
        />
        <MasterDataList
          title="Accessories"
          items={accessories}
          getLabel={(item) => {
            const accessory = item as WarehouseItem;
            return `${accessory.sku} · ${accessory.name}`;
          }}
        />
        <MasterDataList
          title="Rubbers"
          items={rubbers}
          getLabel={(item) => {
            const rubber = item as WarehouseItem;
            return `${rubber.sku} · ${rubber.name}`;
          }}
        />
      </div>
    </div>
  );
}
