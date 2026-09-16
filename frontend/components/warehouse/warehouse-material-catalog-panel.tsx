"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  discardMaterialCatalogExtract,
  extractMaterialCatalog,
  extractMaterialMaster,
  importMaterialCatalog,
  importMaterialMaster,
  listMaterialCatalog,
  type BinCatalogCode,
  type CatalogTier,
  type MaterialBinOption,
  type MaterialMasterMappingItem,
  type StoredCatalogItem,
} from "@/lib/api/warehouse";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const TIER_LABELS: Record<CatalogTier, string> = {
  premium: "Premium",
  standard: "Standard",
  balustrade: "Balustrade",
  specialty: "Aluminium tubes, louvers, shower & net",
};

function tierFromFilename(filename: string): CatalogTier | null {
  const name = filename.toLowerCase();
  if (name.includes("premium")) return "premium";
  if (name.includes("standard")) return "standard";
  if (name.includes("balustrade") || name.includes("balcony")) return "balustrade";
  if (
    name.includes("aluminium") ||
    name.includes("louver") ||
    name.includes("shower") ||
    name.includes("tube") ||
    name.includes("net")
  ) {
    return "specialty";
  }
  return null;
}

function mappingBadge(item: MaterialMasterMappingItem) {
  if (item.mapping_method === "exact_code") {
    return <Badge className="bg-emerald-600">Code match</Badge>;
  }
  if (item.mapping_method === "description_match") {
    return <Badge className="bg-blue-600">Description match</Badge>;
  }
  if (item.mapping_method === "manual") {
    return <Badge variant="secondary">Manual</Badge>;
  }
  return <Badge variant="destructive">Unmapped</Badge>;
}

function syncBadge(status?: "new" | "changed" | "unchanged", fields?: string[]) {
  if (status === "new") return <Badge className="bg-emerald-600">New</Badge>;
  if (status === "changed") {
    return (
      <Badge className="max-w-full whitespace-normal break-words bg-amber-600">
        Updated{fields?.length ? `: ${fields.join(", ")}` : ""}
      </Badge>
    );
  }
  return <Badge variant="outline">Unchanged</Badge>;
}

export function WarehouseMaterialCatalogPanel({ onImported }: { onImported?: () => void }) {
  const binInputRef = useRef<HTMLInputElement>(null);
  const materialInputRef = useRef<HTMLInputElement>(null);
  const [tier, setTier] = useState<CatalogTier>("premium");
  const [binPreview, setBinPreview] = useState<BinCatalogCode[]>([]);
  const [binPreviewItems, setBinPreviewItems] = useState<Array<Record<string, unknown>>>([]);
  const [extractToken, setExtractToken] = useState<string | null>(null);
  const extractTokenRef = useRef<string | null>(null);
  const [storedCodes, setStoredCodes] = useState<StoredCatalogItem[]>([]);
  const [materials, setMaterials] = useState<MaterialMasterMappingItem[]>([]);
  const [bins, setBins] = useState<MaterialBinOption[]>([]);
  const [materialFilter, setMaterialFilter] = useState("");
  const [showOnlyUnmapped, setShowOnlyUnmapped] = useState(false);
  const [bulkBinId, setBulkBinId] = useState<string>("");
  const [busy, setBusy] = useState<"bin-extract" | "bin-import" | "material-extract" | "material-import" | null>(null);

  const clearBinPreview = async (discard = true) => {
    const token = extractTokenRef.current;
    setBinPreview([]);
    setBinPreviewItems([]);
    extractTokenRef.current = null;
    setExtractToken(null);
    if (binInputRef.current) binInputRef.current.value = "";
    if (discard && token) {
      try {
        await discardMaterialCatalogExtract(token);
      } catch {
        // Best-effort cleanup; scheduled job will remove leftovers.
      }
    }
  };

  useEffect(() => {
    extractTokenRef.current = extractToken;
  }, [extractToken]);

  useEffect(() => {
    return () => {
      const token = extractTokenRef.current;
      if (token) {
        void discardMaterialCatalogExtract(token).catch(() => undefined);
      }
    };
  }, []);

  const loadStored = async () => {
    try {
      const response = await listMaterialCatalog();
      setStoredCodes(response.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load imported bin mappings."));
    }
  };

  useEffect(() => {
    void loadStored();
  }, []);

  const extractBins = async (file: File) => {
    const detectedTier = tierFromFilename(file.name);
    const selectedTier = detectedTier ?? tier;
    setTier(selectedTier);
    setBusy("bin-extract");
    if (extractTokenRef.current) {
      await clearBinPreview(true);
    }
    try {
      const response = await extractMaterialCatalog(file, selectedTier);
      setBinPreview(response.data.codes);
      setBinPreviewItems(response.data.items ?? []);
      const token = response.meta?.extract_token ?? response.data.extract_token ?? null;
      extractTokenRef.current = token;
      setExtractToken(token);
      toast.success(
        `Found ${response.data.summary.total_codes} entries: ${response.data.summary.new ?? 0} new, ${response.data.summary.changed ?? 0} changed, ${response.data.summary.unchanged ?? 0} unchanged.`,
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not read the bin workbook."));
    } finally {
      setBusy(null);
    }
  };

  const importBins = async () => {
    if (binPreview.length === 0) return;
    setBusy("bin-import");
    try {
      const response = await importMaterialCatalog({
        codes: binPreview,
        catalog_tier: tier,
        items: binPreviewItems.length > 0 ? binPreviewItems : undefined,
        extract_token: extractToken,
      });
      const itemSummary = response.data.warehouse_items;
      toast.success(
        `${response.data.added} added, ${response.data.updated} updated, ${response.data.unchanged} unchanged; ${response.data.images_added} new images saved.` +
          (itemSummary
            ? ` Catalog items: ${itemSummary.added ?? 0} added, ${itemSummary.updated ?? 0} updated.`
            : ""),
      );
      extractTokenRef.current = null;
      setExtractToken(null);
      setBinPreview([]);
      setBinPreviewItems([]);
      if (binInputRef.current) binInputRef.current.value = "";
      await loadStored();
      onImported?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not import the bin workbook."));
    } finally {
      setBusy(null);
    }
  };

  const extractMaterials = async (file: File) => {
    setBusy("material-extract");
    try {
      const response = await extractMaterialMaster(file);
      setMaterials(response.data.items);
      setBins(response.data.bins);
      toast.success(
        `Mapped ${response.data.summary.mapped_items} of ${response.data.summary.total_items} materials. Review ${response.data.summary.unmapped_items} unmapped rows.`,
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not read the material master."));
    } finally {
      setBusy(null);
    }
  };

  const setMaterialBin = (index: number, selectedBinId: number | null) => {
    const selectedBin = bins.find((bin) => bin.id === selectedBinId);
    setMaterials((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              bin_id: selectedBinId,
              bin_label: selectedBin?.label ?? null,
              section_code: selectedBin?.section_code ?? null,
              mapping_method: selectedBinId ? "manual" : "unmapped",
              mapping_confidence: selectedBinId ? 1 : 0,
            }
          : item,
      ),
    );
  };

  const assignUnmapped = () => {
    const selectedBinId = Number(bulkBinId);
    const selectedBin = bins.find((bin) => bin.id === selectedBinId);
    if (!selectedBin) return;
    setMaterials((current) =>
      current.map((item) =>
        item.bin_id
          ? item
          : {
              ...item,
              bin_id: selectedBin.id,
              bin_label: selectedBin.label,
              section_code: selectedBin.section_code,
              mapping_method: "manual",
              mapping_confidence: 1,
            },
      ),
    );
  };

  const unresolvedCount = materials.filter((item) => !item.bin_id).length;
  const filteredMaterials = useMemo(() => {
    const query = materialFilter.trim().toLowerCase();
    return materials
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => {
        if (showOnlyUnmapped && item.bin_id) return false;
        return (
          query === "" ||
          item.code.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.bin_label?.toLowerCase().includes(query)
        );
      });
  }, [materialFilter, materials, showOnlyUnmapped]);

  const importMaterials = async () => {
    if (materials.length === 0) return;
    setBusy("material-import");
    try {
      const response = await importMaterialMaster({ items: materials });
      toast.success(
        `Imported ${response.data.added + response.data.updated + response.data.unchanged} materials; ${response.data.mapped} assigned to bins.`,
      );
      setMaterials([]);
      if (materialInputRef.current) materialInputRef.current.value = "";
      onImported?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not import the material master."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-w-0 space-y-6 xl:col-span-2">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>Step 1 · Upload warehouse bin data</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload PREMIUM, BALUSTRADE, or ALUMINIUM tubes/louvers/shower/net first.
            STANDARD remains available when that workbook is used. Workbook codes and names become
            mapping rules for each physical warehouse bin.
          </p>
          <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] md:items-end xl:grid-cols-[minmax(0,240px)_minmax(0,1fr)_auto]">
            <div className="min-w-0 space-y-2">
              <Label>Destination bin group</Label>
              <Select value={tier} onValueChange={(value) => setTier(value as CatalogTier)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIER_LABELS) as CatalogTier[]).map((key) => (
                    <SelectItem key={key} value={key}>{TIER_LABELS[key]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="bin-workbook">Bin workbook</Label>
              <Input
                ref={binInputRef}
                id="bin-workbook"
                type="file"
                accept=".xlsx,.xls,.csv"
                disabled={busy !== null}
                className="max-w-full"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void extractBins(file);
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-1">
              <Button disabled={binPreview.length === 0 || busy !== null} onClick={() => void importBins()}>
                {busy === "bin-import" ? <><Loader2 className="mr-2 size-4 animate-spin" />Importing…</> : "Import bin mappings"}
              </Button>
              {binPreview.length > 0 ? (
                <Button
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() => void clearBinPreview(true)}
                >
                  Clear preview
                </Button>
              ) : null}
            </div>
          </div>

          {busy === "bin-extract" ? (
            <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
              <Loader2 className="size-5 animate-spin text-primary" />
              <div>
                <p className="font-medium">Extracting workbook data…</p>
                <p className="text-muted-foreground">
                  Reading descriptions and embedded images. Large workbooks can take a moment.
                </p>
              </div>
            </div>
          ) : null}

          {binPreview.length > 0 ? (
            <div className="min-w-0 rounded-lg border p-3">
              <p className="mb-2 text-sm font-medium">
                Preview · {binPreview.length} entries → {TIER_LABELS[tier]} ·{" "}
                {binPreview.filter((row) => row.image_url).length} images
              </p>
              <div className="max-h-96 min-w-0 overflow-auto text-sm">
                {binPreview.slice(0, 100).map((row, index) => (
                  <div
                    key={`${row.code}-${index}`}
                    className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 border-t py-2 first:border-0 sm:grid-cols-[64px_minmax(0,160px)_minmax(0,1fr)]"
                  >
                    <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded border bg-white">
                      {row.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.image_url}
                          alt={row.name ?? row.source_name ?? row.code}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">No image</span>
                      )}
                    </div>
                    <span className="min-w-0 break-all font-mono font-medium">{row.code}</span>
                    <div className="min-w-0 col-span-2 sm:col-span-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="min-w-0 break-words font-medium">{row.name ?? row.source_name ?? "—"}</p>
                        {syncBadge(row._sync_status, row._changed_fields)}
                      </div>
                      <p className="break-words text-xs text-muted-foreground">
                        {row.description ?? row.source_description ?? "No description"}
                      </p>
                      <p className="mt-1 break-words text-xs text-muted-foreground">
                        {row.sheet ?? row.source_sheet ?? "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="min-w-0">
            <p className="mb-2 text-sm font-medium">Imported bin mapping rules</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TIER_LABELS) as CatalogTier[]).map((key) => {
                const sectionCode = `SEC-ALU-${key === "specialty" ? "SPECIALTY" : key.toUpperCase()}`;
                const count = storedCodes.filter((row) => row.section_code === sectionCode).length;
                return <Badge key={key} variant={count ? "secondary" : "outline"}>{TIER_LABELS[key]}: {count}</Badge>;
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>Step 2 · Map Completed Inventory Materials to bins</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload Completed_Inventory_Materials.xlsx. Exact material codes are mapped
            automatically. Unmatched materials may be assigned manually or imported without a
            default bin so they keep their normal category-based putaway flow.
          </p>
          <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="material-master">Material master workbook</Label>
              <Input
                ref={materialInputRef}
                id="material-master"
                type="file"
                accept=".xlsx,.xls,.csv"
                disabled={busy !== null}
                className="max-w-full"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void extractMaterials(file);
                }}
              />
            </div>
            <Button
              disabled={materials.length === 0 || busy !== null}
              onClick={() => void importMaterials()}
            >
              {busy === "material-import" ? <><Loader2 className="mr-2 size-4 animate-spin" />Importing…</> : "Import mapped materials"}
            </Button>
          </div>

          {busy === "material-extract" ? (
            <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
              <Loader2 className="size-5 animate-spin text-primary" />
              <div>
                <p className="font-medium">Extracting and mapping materials…</p>
                <p className="text-muted-foreground">Matching material codes against imported bin catalogs.</p>
              </div>
            </div>
          ) : null}

          {materials.length > 0 ? (
            <>
              <div className="flex min-w-0 flex-wrap items-end gap-3 rounded-lg border p-3">
                <Badge variant="secondary">Total: {materials.length}</Badge>
                <Badge className="bg-emerald-600">
                  New: {materials.filter((item) => item._sync_status === "new").length}
                </Badge>
                <Badge className="bg-amber-600">
                  Updated: {materials.filter((item) => item._sync_status === "changed").length}
                </Badge>
                <Badge variant="outline">
                  Unchanged: {materials.filter((item) => item._sync_status === "unchanged").length}
                </Badge>
                <Badge className="bg-emerald-600">Mapped: {materials.length - unresolvedCount}</Badge>
                <Badge variant={unresolvedCount ? "destructive" : "secondary"}>Unmapped: {unresolvedCount}</Badge>
                <div className="min-w-0 w-full flex-1 sm:min-w-[220px]">
                  <Label htmlFor="material-filter">Find code or description</Label>
                  <Input
                    id="material-filter"
                    value={materialFilter}
                    onChange={(event) => setMaterialFilter(event.target.value)}
                    placeholder="e.g. GL-95M16"
                  />
                </div>
                <Button
                  type="button"
                  variant={showOnlyUnmapped ? "default" : "outline"}
                  onClick={() => setShowOnlyUnmapped((value) => !value)}
                >
                  Unmapped only
                </Button>
              </div>

              {unresolvedCount > 0 ? (
                <div className="flex min-w-0 flex-wrap items-end gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:bg-amber-950/20">
                  <div className="min-w-0 w-full flex-1 sm:min-w-[280px]">
                    <Label>Assign all {unresolvedCount} unmapped materials</Label>
                    <Select value={bulkBinId} onValueChange={setBulkBinId}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Choose destination bin" /></SelectTrigger>
                      <SelectContent>
                        {bins.map((bin) => <SelectItem key={bin.id} value={String(bin.id)}>{bin.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" variant="outline" disabled={!bulkBinId} onClick={assignUnmapped}>
                    Apply to unmapped
                  </Button>
                </div>
              ) : null}

              <div className="max-h-[560px] min-w-0 overflow-auto rounded-lg border">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="sticky top-0 bg-background text-left shadow-sm">
                    <tr>
                      <th className="px-3 py-2">Image</th>
                      <th className="px-3 py-2">Code</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2">Match</th>
                      <th className="min-w-[220px] px-3 py-2 sm:min-w-[300px]">Warehouse bin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMaterials.map(({ item, index }) => (
                      <tr key={`${item.code}-${index}`} className="border-t align-top">
                        <td className="px-3 py-2">
                          <div className="flex size-12 items-center justify-center overflow-hidden rounded border bg-white">
                            {item.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.image_url}
                                alt={item.description}
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <span className="text-[10px] text-muted-foreground">No image</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono font-medium whitespace-nowrap">{item.code}</td>
                        <td className="max-w-md break-words px-3 py-2">
                          <p>{item.description}</p>
                          {item.matched_catalog_description &&
                          item.matched_catalog_description !== item.description ? (
                            <p className="mt-1 break-words text-xs text-muted-foreground">
                              Catalog: {item.matched_catalog_description}
                            </p>
                          ) : null}
                        </td>
                        <td className="space-y-1 px-3 py-2">
                          {mappingBadge(item)}
                          <div>{syncBadge(item._sync_status, item._changed_fields)}</div>
                        </td>
                        <td className="min-w-0 px-3 py-2">
                          <Select
                            value={item.bin_id ? String(item.bin_id) : "unmapped"}
                            onValueChange={(value) => setMaterialBin(index, value === "unmapped" ? null : Number(value))}
                          >
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unmapped">Unmapped</SelectItem>
                              {bins.map((bin) => <SelectItem key={bin.id} value={String(bin.id)}>{bin.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {item.matched_catalog_name ? (
                            <p className="mt-1 break-words text-xs text-muted-foreground">Matched: {item.matched_catalog_name}</p>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
