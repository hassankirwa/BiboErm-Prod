"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createLowStockRequisition,
  createProjectMaterialsRequisition,
  getLowStockRequisitionSource,
  listSuppliers,
  type LowStockRequisitionSourceItem,
  type Supplier,
} from "@/lib/api/procurement";
import {
  getProjectMaterialShortages,
  type ProjectMaterialLine,
  type ProjectMaterialShortageEntry,
} from "@/lib/api/projects";
import { toast } from "sonner";

type DraftLine = {
  key: string;
  source: "low_stock" | "project_material";
  label: string;
  sku?: string | null;
  requiredQty: string;
  orderQty: string;
  unit?: string | null;
  warehouseItemId?: number;
  projectBomLineId?: number;
  projectId?: number;
};

function parseQty(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatOverage(requiredQty: string, orderQty: string) {
  const required = parseQty(requiredQty);
  const order = parseQty(orderQty);
  const overage = order - required;
  if (overage <= 0) {
    return "—";
  }
  return overage.toFixed(3).replace(/\.?0+$/, "");
}

export function RequisitionCreateWorkspace() {
  const [activeTab, setActiveTab] = useState<"low-stock" | "project-materials">("low-stock");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [lowStockItems, setLowStockItems] = useState<LowStockRequisitionSourceItem[]>([]);
  const [projectEntries, setProjectEntries] = useState<ProjectMaterialShortageEntry[]>([]);
  const [loadingLowStock, setLoadingLowStock] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const [selectedLowStockIds, setSelectedLowStockIds] = useState<number[]>([]);
  const [selectedProjectLines, setSelectedProjectLines] = useState<
    Array<{ projectId: number; bomLineId: number }>
  >([]);
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);

  useEffect(() => {
    void listSuppliers({ per_page: 100 })
      .then((res) => setSuppliers(res.data.filter((supplier) => supplier.is_active)))
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load suppliers.");
      });
  }, []);

  useEffect(() => {
    void getLowStockRequisitionSource()
      .then((res) => setLowStockItems(res.data ?? []))
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load low-stock items.");
      })
      .finally(() => setLoadingLowStock(false));
  }, []);

  useEffect(() => {
    void getProjectMaterialShortages()
      .then((res) => setProjectEntries(res.data ?? []))
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : "Failed to load project material shortages.",
        );
      })
      .finally(() => setLoadingProjects(false));
  }, []);

  const actionableLowStock = useMemo(
    () => lowStockItems.filter((item) => item.can_create_requisition),
    [lowStockItems],
  );

  const actionableProjectLines = useMemo(() => {
    return projectEntries.flatMap((entry) =>
      (entry.actionable_lines ?? []).map((line) => ({
        project: entry.project,
        line,
      })),
    );
  }, [projectEntries]);

  const syncDraftFromSelection = () => {
    const lowStockDraft: DraftLine[] = selectedLowStockIds.flatMap((itemId) => {
      const item = actionableLowStock.find((entry) => entry.warehouse_item_id === itemId);
      if (!item) {
        return [];
      }

      const existing = draftLines.find(
        (line) => line.source === "low_stock" && line.warehouseItemId === itemId,
      );

      return [
        {
          key: `low-${itemId}`,
          source: "low_stock" as const,
          label: item.name,
          sku: item.sku,
          requiredQty: item.quantity_to_requisition,
          orderQty: existing?.orderQty ?? item.quantity_to_requisition,
          unit: item.unit_of_measure,
          warehouseItemId: itemId,
        },
      ];
    });

    const projectDraft: DraftLine[] = selectedProjectLines.flatMap(({ projectId, bomLineId }) => {
      const match = actionableProjectLines.find(
        (entry) => entry.project.id === projectId && entry.line.bom_line_id === bomLineId,
      );
      if (!match) {
        return [];
      }

      const existing = draftLines.find(
        (line) =>
          line.source === "project_material" &&
          line.projectBomLineId === bomLineId &&
          line.projectId === projectId,
      );

      return [
        {
          key: `project-${projectId}-${bomLineId}`,
          source: "project_material" as const,
          label: match.line.material_name,
          sku: match.line.material_code,
          requiredQty: match.line.quantity_to_requisition,
          orderQty: existing?.orderQty ?? match.line.quantity_to_requisition,
          projectBomLineId: bomLineId,
          projectId,
        },
      ];
    });

    setDraftLines([...lowStockDraft, ...projectDraft]);
  };

  useEffect(() => {
    syncDraftFromSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLowStockIds, selectedProjectLines, actionableLowStock, actionableProjectLines]);

  const toggleLowStock = (itemId: number, checked: boolean) => {
    setSelectedLowStockIds((current) =>
      checked ? [...new Set([...current, itemId])] : current.filter((id) => id !== itemId),
    );
  };

  const toggleProjectLine = (projectId: number, line: ProjectMaterialLine, checked: boolean) => {
    setSelectedProjectLines((current) => {
      if (checked) {
        return [...current, { projectId, bomLineId: line.bom_line_id }];
      }
      return current.filter(
        (entry) => !(entry.projectId === projectId && entry.bomLineId === line.bom_line_id),
      );
    });
  };

  const updateOrderQty = (key: string, value: string) => {
    setDraftLines((current) =>
      current.map((line) => (line.key === key ? { ...line, orderQty: value } : line)),
    );
  };

  const invalidLines = draftLines.filter(
    (line) => parseQty(line.orderQty) < parseQty(line.requiredQty),
  );

  const handleSubmit = async () => {
    if (!supplierId) {
      toast.error("Select a supplier before submitting.");
      return;
    }

    if (draftLines.length === 0) {
      toast.error("Select at least one material line.");
      return;
    }

    if (invalidLines.length > 0) {
      toast.error("Order quantity cannot be less than the calculated need.");
      return;
    }

    setSubmitting(true);
    try {
      const lowStockLines = draftLines.filter((line) => line.source === "low_stock");
      const projectLines = draftLines.filter((line) => line.source === "project_material");

      if (lowStockLines.length > 0) {
        await createLowStockRequisition({
          supplier_id: Number(supplierId),
          warehouse_item_ids: lowStockLines.map((line) => line.warehouseItemId!),
          notes: notes.trim() || undefined,
          lines: lowStockLines.map((line) => ({
            warehouse_item_id: line.warehouseItemId!,
            quantity: parseQty(line.orderQty),
          })),
        });
      }

      const projectGroups = projectLines.reduce<Record<number, DraftLine[]>>((groups, line) => {
        const projectId = line.projectId!;
        groups[projectId] = groups[projectId] ?? [];
        groups[projectId].push(line);
        return groups;
      }, {});

      for (const [projectId, lines] of Object.entries(projectGroups)) {
        await createProjectMaterialsRequisition({
          project_id: Number(projectId),
          supplier_id: Number(supplierId),
          project_bom_line_ids: lines.map((line) => line.projectBomLineId!),
          notes: notes.trim() || undefined,
          lines: lines.map((line) => ({
            project_bom_line_id: line.projectBomLineId!,
            quantity: parseQty(line.orderQty),
          })),
        });
      }

      toast.success("Requisition submitted for admin approval.");
      setSelectedLowStockIds([]);
      setSelectedProjectLines([]);
      setDraftLines([]);
      setNotes("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create requisition.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Requisition details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger id="supplier">
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={String(supplier.id)}>
                    {supplier.name}
                    {supplier.is_preferred ? " (Preferred)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Optional context for approvers"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="low-stock">Low stock</TabsTrigger>
          <TabsTrigger value="project-materials">Project materials</TabsTrigger>
        </TabsList>

        <TabsContent value="low-stock" className="space-y-4">
          {loadingLowStock ? (
            <p className="text-sm text-muted-foreground">Loading low-stock items…</p>
          ) : actionableLowStock.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No low-stock items are waiting for a requisition.
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Pick</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Minimum</TableHead>
                    <TableHead className="text-right">Required</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actionableLowStock.map((item) => (
                    <TableRow key={item.warehouse_item_id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedLowStockIds.includes(item.warehouse_item_id)}
                          onCheckedChange={(checked) =>
                            toggleLowStock(item.warehouse_item_id, Boolean(checked))
                          }
                        />
                      </TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell className="text-right">{item.available_qty}</TableCell>
                      <TableCell className="text-right">{item.min_stock_qty}</TableCell>
                      <TableCell className="text-right font-medium">
                        {item.quantity_to_requisition}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="project-materials" className="space-y-4">
          {loadingProjects ? (
            <p className="text-sm text-muted-foreground">Loading project materials…</p>
          ) : actionableProjectLines.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No project material lines are waiting for a requisition.
              </CardContent>
            </Card>
          ) : (
            projectEntries
              .filter((entry) => (entry.actionable_lines ?? []).length > 0)
              .map((entry) => (
                <Card key={entry.project.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      <Link
                        href={`/projects/${entry.project.id}`}
                        className="text-primary hover:underline"
                      >
                        {entry.project.name}
                      </Link>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{entry.project.reference}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">Pick</TableHead>
                            <TableHead>Material</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead className="text-right">Required</TableHead>
                            <TableHead className="text-right">To Requisition</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(entry.actionable_lines ?? []).map((line) => {
                            const selected = selectedProjectLines.some(
                              (item) =>
                                item.projectId === entry.project.id &&
                                item.bomLineId === line.bom_line_id,
                            );

                            return (
                              <TableRow key={line.bom_line_id}>
                                <TableCell>
                                  <Checkbox
                                    checked={selected}
                                    onCheckedChange={(checked) =>
                                      toggleProjectLine(entry.project.id, line, Boolean(checked))
                                    }
                                  />
                                </TableCell>
                                <TableCell>{line.material_name}</TableCell>
                                <TableCell>{line.material_code ?? "—"}</TableCell>
                                <TableCell className="text-right">{line.required_qty}</TableCell>
                                <TableCell className="text-right font-medium">
                                  {line.quantity_to_requisition}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Review quantities</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Increase order quantity above the calculated need to stock extra for future use.
            </p>
          </div>
          <Badge variant="secondary">{draftLines.length} line(s)</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {draftLines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Select materials above to configure order quantities and overage.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Required</TableHead>
                    <TableHead className="text-right">Order qty</TableHead>
                    <TableHead className="text-right">Overage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draftLines.map((line) => {
                    const isInvalid = parseQty(line.orderQty) < parseQty(line.requiredQty);

                    return (
                      <TableRow key={line.key}>
                        <TableCell>
                          <div className="space-y-1">
                            <div>{line.label}</div>
                            {line.sku ? (
                              <div className="text-xs text-muted-foreground">{line.sku}</div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {line.source === "low_stock" ? "Low stock" : "Project material"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{line.requiredQty}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={parseQty(line.requiredQty)}
                            step="any"
                            className="ml-auto w-28 text-right"
                            value={line.orderQty}
                            onChange={(event) => updateOrderQty(line.key, event.target.value)}
                          />
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${isInvalid ? "text-destructive" : ""}`}
                        >
                          {formatOverage(line.requiredQty, line.orderQty)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Requisitions from low stock and project materials are submitted for admin approval.
            </p>
            <Button
              disabled={
                submitting || draftLines.length === 0 || !supplierId || invalidLines.length > 0
              }
              onClick={() => void handleSubmit()}
            >
              {submitting ? "Submitting…" : "Submit requisition"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
