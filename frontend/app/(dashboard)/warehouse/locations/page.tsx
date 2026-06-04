"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { useWarehouseFormOptions } from "@/components/warehouse/use-warehouse-form-options";
import { WarehouseNativeSelect } from "@/components/warehouse/warehouse-native-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createBin,
  createSection,
  flattenDecksFromLocationTree,
  SECTION_TYPES,
  type SectionType,
} from "@/lib/api/warehouse";
import { WarehouseAuditLauncher } from "@/components/qc/warehouse-audit-launcher";
import { toast } from "sonner";

function LocationsPageContent() {
  const { locationTree, doorTypes, loading } = useWarehouseFormOptions();
  const decks = flattenDecksFromLocationTree(locationTree);

  const [sectionForm, setSectionForm] = useState({
    deck_id: "",
    code: "",
    name: "",
    section_type: "door_accessories" as SectionType,
    door_type_id: "",
  });

  const [binForm, setBinForm] = useState({
    section_id: "",
    code: "",
    name: "",
  });

  const allSections = locationTree.flatMap((wh) =>
    (wh.decks ?? []).flatMap((deck) =>
      (deck.sections ?? []).map((s) => ({
        value: String(s.id),
        label: `${deck.name} / ${s.code}`,
      })),
    ),
  );

  const submitSection = async () => {
    try {
      await createSection({
        deck_id: Number(sectionForm.deck_id),
        code: sectionForm.code,
        name: sectionForm.name,
        section_type: sectionForm.section_type,
        door_type_id: sectionForm.door_type_id
          ? Number(sectionForm.door_type_id)
          : null,
      });
      toast.success("Section created.");
      setSectionForm({
        deck_id: "",
        code: "",
        name: "",
        section_type: "door_accessories",
        door_type_id: "",
      });
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create section.");
    }
  };

  const submitBin = async () => {
    try {
      await createBin({
        section_id: Number(binForm.section_id),
        code: binForm.code,
        name: binForm.name || undefined,
      });
      toast.success("Bin created.");
      setBinForm({ section_id: "", code: "", name: "" });
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create bin.");
    }
  };

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Warehouse locations"
        subtitle="Sections and bins within decks"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/warehouse/master-data">Master data</Link>
          </Button>
        }
      />
      <div className="space-y-6 p-6">
        <WarehouseAuditLauncher
          context="warehouse_aluminium_audit"
          title="Aluminium deck audit"
          description="Periodic QC audit for profile grouping, aisle access, and section layout."
        />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <WarehouseNativeSelect
              value={sectionForm.deck_id}
              onChange={(v) => setSectionForm((c) => ({ ...c, deck_id: v }))}
              options={decks.map((d) => ({ value: String(d.id), label: d.label }))}
              placeholder="Deck"
              disabled={loading}
            />
            <Input
              placeholder="Section code (e.g. SEC-SLD)"
              value={sectionForm.code}
              onChange={(e) => setSectionForm((c) => ({ ...c, code: e.target.value }))}
            />
            <Input
              placeholder="Section name"
              value={sectionForm.name}
              onChange={(e) => setSectionForm((c) => ({ ...c, name: e.target.value }))}
            />
            <div className="space-y-1">
              <Label>Section type</Label>
              <WarehouseNativeSelect
                value={sectionForm.section_type}
                onChange={(v) =>
                  setSectionForm((c) => ({ ...c, section_type: v as SectionType }))
                }
                options={SECTION_TYPES.map((t) => ({
                  value: t,
                  label: t.replaceAll("_", " "),
                }))}
              />
            </div>
            <WarehouseNativeSelect
              value={sectionForm.door_type_id}
              onChange={(v) => setSectionForm((c) => ({ ...c, door_type_id: v }))}
              options={doorTypes.map((d) => ({
                value: String(d.id),
                label: `${d.code} · ${d.name}`,
              }))}
              placeholder="Door type (optional)"
              disabled={loading}
            />
            <Button
              className="w-full"
              disabled={!sectionForm.deck_id || !sectionForm.code || !sectionForm.name}
              onClick={submitSection}
            >
              Create section
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add bin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <WarehouseNativeSelect
              value={binForm.section_id}
              onChange={(v) => setBinForm((c) => ({ ...c, section_id: v }))}
              options={allSections}
              placeholder="Section"
              disabled={loading}
            />
            <Input
              placeholder="Bin code (e.g. BIN1)"
              value={binForm.code}
              onChange={(e) => setBinForm((c) => ({ ...c, code: e.target.value }))}
            />
            <Input
              placeholder="Bin label (optional)"
              value={binForm.name}
              onChange={(e) => setBinForm((c) => ({ ...c, name: e.target.value }))}
            />
            <Button
              className="w-full"
              disabled={!binForm.section_id || !binForm.code}
              onClick={submitBin}
            >
              Create bin
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Location tree</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 max-h-[400px] overflow-y-auto">
            {locationTree.map((wh) => (
              <div key={wh.id}>
                <p className="font-semibold">{wh.name}</p>
                {(wh.decks ?? []).map((deck) => (
                  <div key={deck.id} className="ml-3 mt-1">
                    <p className="text-muted-foreground">{deck.name}</p>
                    {(deck.sections ?? []).map((section) => (
                      <div key={section.id} className="ml-3">
                        <p>
                          {section.code} — {section.name}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({section.section_type})
                          </span>
                        </p>
                        <ul className="ml-3 list-disc text-muted-foreground">
                          {(section.bins ?? []).map((bin) => (
                            <li key={bin.id}>
                              {bin.code}
                              {bin.name ? ` — ${bin.name}` : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}

export default function WarehouseLocationsPage() {
  return (
    <PermissionGuard
      permissions={["warehouse.locations.manage", "warehouse.master_data.manage"]}
      fallback={
        <div className="p-6 text-sm text-muted-foreground">
          You do not have permission to manage locations.
        </div>
      }
    >
      <LocationsPageContent />
    </PermissionGuard>
  );
}
