"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getGoodsReceipt, type GoodsReceipt } from "@/lib/api/procurement";
import { listProjects, type ProjectSummary } from "@/lib/api/projects";
import {
  flattenBinsFromLocationTree,
  getLocationTree,
  listWarehouseItems,
  receiveStock,
  warehouseItemLabel,
  type SelectOption,
  type WarehouseItem,
} from "@/lib/api/warehouse";
import { toast } from "sonner";

type ReceiveLine = {
  item_id: number;
  quantity: number;
  to_bin_id: number | null;
};

const selectClassName =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50";

export default function WarehouseReceivePage() {
  const searchParams = useSearchParams();
  const grnId = Number(searchParams.get("grn") ?? "");
  const [grn, setGrn] = useState<GoodsReceipt | null>(null);
  const [lines, setLines] = useState<ReceiveLine[]>([]);
  const [projectId, setProjectId] = useState("");
  const [notes, setNotes] = useState("");
  const [bins, setBins] = useState<SelectOption[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([getLocationTree(), listProjects({ per_page: 100 }), listWarehouseItems()])
      .then(([locationRes, projectsRes, itemsRes]) => {
        setBins(flattenBinsFromLocationTree(locationRes.data));
        setProjects(projectsRes.data);
        setWarehouseItems(itemsRes);
      })
      .catch((error: Error) => toast.error(error.message || "Failed to load form options."))
      .finally(() => setOptionsLoading(false));
  }, []);

  useEffect(() => {
    if (!Number.isFinite(grnId) || grnId <= 0) {
      return;
    }

    getGoodsReceipt(grnId)
      .then((res) => {
        setGrn(res.data);
        setProjectId(res.data.project_id ? String(res.data.project_id) : "");
        setNotes(`GRN ${res.data.grn_number} putaway`);
        setLines(
          (res.data.lines ?? [])
            .filter((line) => line.warehouse_item_id)
            .map((line) => ({
              item_id: Number(line.warehouse_item_id),
              quantity: Number(line.qty_accepted || line.qty_received),
              to_bin_id: line.to_bin_id,
            })),
        );
      })
      .catch((error: Error) => toast.error(error.message || "Failed to load GRN receive payload."));
  }, [grnId]);

  const submit = async () => {
    setSubmitting(true);
    try {
      await receiveStock({
        goods_receipt_id: grnId || undefined,
        project_id: projectId ? Number(projectId) : undefined,
        reference_type: "goods_receipt",
        notes: notes || undefined,
        lines: lines.map((line) => ({
          item_id: line.item_id,
          to_bin_id: line.to_bin_id ?? undefined,
          quantity: line.quantity,
        })),
      });
      toast.success("Stock received. Project reservations rechecked.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to receive stock.");
    } finally {
      setSubmitting(false);
    }
  };

  const getItemLabel = (itemId: number) => {
    const item = warehouseItems.find((entry) => entry.id === itemId);
    return item ? warehouseItemLabel(item) : `Item #${itemId}`;
  };

  return (
    <PermissionGuard
      permissions={["warehouse.stock.receive"]}
      fallback={
        <div className="flex min-w-0 w-full flex-col">
          <AppHeader title="Receive Stock" subtitle="Put away inbound stock and optionally clear project shortages" />
          <div className="p-6 text-sm text-muted-foreground">
            Stock receiving is only available to warehouse staff with receive permission.
          </div>
        </div>
      }
    >
      <div className="flex min-w-0 w-full flex-col">
        <AppHeader title="Receive Stock" subtitle="Put away inbound stock and optionally clear project shortages" />
        <div className="space-y-6 p-6">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/warehouse/receive/create">Create GRN from PO</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/warehouse/receiving-logs">Receiving logs</Link>
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{grn ? `Receive for ${grn.grn_number}` : "Manual receive"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  placeholder="Goods receipt"
                  value={grn ? grn.grn_number : grnId > 0 ? `GRN #${grnId}` : "No GRN linked"}
                  readOnly
                />
                <select
                  className={selectClassName}
                  value={projectId}
                  disabled={optionsLoading}
                  onChange={(event) => setProjectId(event.target.value)}
                >
                  <option value="">{optionsLoading ? "Loading projects…" : "Project (optional)"}</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.reference} · {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <Textarea placeholder="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
              <div className="space-y-3">
                {lines.map((line, index) => (
                  <div key={`${line.item_id}-${index}`} className="grid gap-3 rounded-lg border p-3 md:grid-cols-3">
                    {grn ? (
                      <Input readOnly value={getItemLabel(line.item_id)} />
                    ) : (
                      <select
                        className={selectClassName}
                        value={line.item_id || ""}
                        disabled={optionsLoading}
                        onChange={(event) =>
                          setLines((current) =>
                            current.map((entry, entryIndex) =>
                              entryIndex === index
                                ? { ...entry, item_id: Number(event.target.value) }
                                : entry,
                            ),
                          )
                        }
                      >
                        <option value="">{optionsLoading ? "Loading items…" : "Select item"}</option>
                        {warehouseItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {warehouseItemLabel(item)}
                          </option>
                        ))}
                      </select>
                    )}
                    <Input
                      type="number"
                      placeholder="Quantity"
                      value={line.quantity}
                      onChange={(event) =>
                        setLines((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, quantity: Number(event.target.value) } : entry,
                          ),
                        )
                      }
                    />
                    <select
                      className={selectClassName}
                      value={line.to_bin_id ?? ""}
                      disabled={optionsLoading}
                      onChange={(event) =>
                        setLines((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, to_bin_id: event.target.value ? Number(event.target.value) : null }
                              : entry,
                          ),
                        )
                      }
                    >
                      <option value="">{optionsLoading ? "Loading bins…" : "Select bin"}</option>
                      {bins.map((bin) => (
                        <option key={bin.id} value={bin.id}>
                          {bin.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              {!grn ? (
                <Button
                  variant="outline"
                  onClick={() => setLines((current) => [...current, { item_id: 0, quantity: 0, to_bin_id: null }])}
                >
                  Add line
                </Button>
              ) : null}
              <Button className="w-full" disabled={submitting || lines.length === 0} onClick={submit}>
                {submitting ? "Receiving..." : "Receive stock"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PermissionGuard>
  );
}
