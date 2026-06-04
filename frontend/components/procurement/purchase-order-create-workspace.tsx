"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createPurchaseOrdersBatch,
  getPurchaseOrderDraft,
  listDrivers,
  type Driver,
  type PurchaseOrderDraftGroup,
  type PurchaseOrderDraftLine,
} from "@/lib/api/procurement";
import { toast } from "sonner";

type EditableLine = PurchaseOrderDraftLine & {
  unit_price: string;
  quantity: string;
};

type EditableGroup = Omit<PurchaseOrderDraftGroup, "lines"> & {
  lines: EditableLine[];
  expected_delivery: string;
  tax: string;
  transport_type: string;
  driver_id: string;
  vehicle: string;
  driver_name: string;
  driver_phone: string;
  expected_arrival: string;
};

function parseQty(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function lineTotal(line: EditableLine) {
  return parseQty(line.quantity) * parseQty(line.unit_price);
}

function groupSubtotal(group: EditableGroup) {
  return group.lines.reduce((sum, line) => sum + lineTotal(line), 0);
}

export function PurchaseOrderCreateWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [groups, setGroups] = useState<EditableGroup[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("0");

  const totalPoCount = useMemo(
    () => groups.reduce((sum, group) => sum + group.requisition_ids.length, 0),
    [groups],
  );

  const requisitionIds = useMemo(() => {
    const raw = searchParams.get("requisition_ids") ?? searchParams.get("requisition_id") ?? "";
    return raw
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);
  }, [searchParams]);

  useEffect(() => {
    if (requisitionIds.length === 0) {
      setLoading(false);
      return;
    }

    Promise.all([
      getPurchaseOrderDraft(requisitionIds),
      listDrivers({ active_only: true, per_page: 100 }),
    ])
      .then(([draftRes, driversRes]) => {
        const editableGroups = draftRes.data.groups.map((group) => ({
          ...group,
          expected_delivery: "",
          tax: "0",
          transport_type: "supplier_delivery",
          driver_id: "",
          vehicle: "",
          driver_name: "",
          driver_phone: "",
          expected_arrival: "",
          lines: group.lines.map((line) => ({
            ...line,
            quantity: line.quantity,
            unit_price: line.unit_price,
          })),
        }));
        setGroups(editableGroups);
        setDrivers(driversRes.data);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load PO draft.");
      })
      .finally(() => setLoading(false));
  }, [requisitionIds]);

  const updateGroup = (index: number, patch: Partial<EditableGroup>) => {
    setGroups((current) =>
      current.map((group, groupIndex) => (groupIndex === index ? { ...group, ...patch } : group)),
    );
  };

  const updateLine = (groupIndex: number, lineIndex: number, patch: Partial<EditableLine>) => {
    setGroups((current) =>
      current.map((group, gi) =>
        gi !== groupIndex
          ? group
          : {
              ...group,
              lines: group.lines.map((line, li) =>
                li !== lineIndex ? line : { ...line, ...patch },
              ),
            },
      ),
    );
  };

  const applyDriver = (groupIndex: number, driverId: string) => {
    const driver = drivers.find((item) => String(item.id) === driverId);
    updateGroup(groupIndex, {
      driver_id: driverId,
      driver_name: driver?.name ?? "",
      driver_phone: driver?.phone ?? "",
      vehicle: driver?.vehicle_registration ?? "",
    });
  };

  const submit = async () => {
    if (groups.length === 0) {
      toast.error("No purchase order groups to create.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        groups: groups.map((group) => ({
          requisition_ids: group.requisition_ids,
          supplier_id: group.supplier_id,
          project_id: group.project_id ?? undefined,
          expected_delivery: group.expected_delivery || undefined,
          tax: parseQty(group.tax),
          lines: group.lines.map((line) => ({
            requisition_id: line.requisition_id,
            requisition_line_id: line.requisition_line_id,
            description: line.description,
            quantity: parseQty(line.quantity),
            unit_price: parseQty(line.unit_price),
            warehouse_item_id: line.warehouse_item_id ?? undefined,
            sku: line.sku ?? undefined,
          })),
          transport: group.transport_type
            ? {
                transport_type: group.transport_type,
                driver_id: group.driver_id ? Number(group.driver_id) : undefined,
                vehicle: group.vehicle || undefined,
                driver_name: group.driver_name || undefined,
                driver_phone: group.driver_phone || undefined,
                expected_arrival: group.expected_arrival || undefined,
              }
            : undefined,
        })),
      };

      const res = await createPurchaseOrdersBatch(payload);
      const created = res.data ?? [];
      toast.success(
        created.length === 1
          ? `Purchase order ${created[0].reference} created.`
          : `${created.length} purchase orders created (one per supplier).`,
      );

      if (created.length === 1) {
        router.push(`/procurement/orders/${created[0].id}`);
      } else {
        router.push("/procurement/orders");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create purchase orders.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading purchase order draft…</p>;
  }

  if (requisitionIds.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Select approved requisitions from the queue to create purchase orders.
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href="/procurement/requisitions">Back to requisitions</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Could not build a purchase order draft from the selected requisitions.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {groups.length > 1 ? (
        <div className="rounded-md border border-border bg-muted/30 p-4 text-sm">
          <strong>{groups.length} suppliers detected.</strong> Requisitions were grouped by supplier for shared
          transport details. Submitting will create {totalPoCount} purchase order
          {totalPoCount === 1 ? "" : "s"} (one per requisition).
        </div>
      ) : totalPoCount > 1 ? (
        <div className="rounded-md border border-border bg-muted/30 p-4 text-sm">
          <strong>{totalPoCount} requisitions selected.</strong> Submitting will create {totalPoCount} purchase orders
          with the same supplier and transport settings.
        </div>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {groups.length > 1 ? (
          <TabsList>
            {groups.map((group, index) => (
              <TabsTrigger key={group.supplier_id} value={String(index)}>
                {group.supplier?.name ?? `Supplier #${group.supplier_id}`}
              </TabsTrigger>
            ))}
          </TabsList>
        ) : null}

        {groups.map((group, groupIndex) => {
          const subtotal = groupSubtotal(group);
          const tax = parseQty(group.tax);
          const total = subtotal + tax;

          return (
            <TabsContent key={group.supplier_id} value={String(groupIndex)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    {group.supplier?.name ?? `Supplier #${group.supplier_id}`}
                    <Badge variant="secondary">{group.requisition_references.join(", ")}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Expected delivery</Label>
                    <Input
                      type="date"
                      value={group.expected_delivery}
                      onChange={(event) =>
                        updateGroup(groupIndex, { expected_delivery: event.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax (KES)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={group.tax}
                      onChange={(event) => updateGroup(groupIndex, { tax: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Project</Label>
                    <Input
                      readOnly
                      value={
                        group.project
                          ? `${group.project.reference} · ${group.project.name}`
                          : "Stock order"
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Supplier contact</Label>
                    <Input
                      readOnly
                      value={[group.supplier?.phone, group.supplier?.email].filter(Boolean).join(" · ") || "—"}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Line items</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Requisition</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit price</TableHead>
                        <TableHead className="text-right">Line total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.lines.map((line, lineIndex) => (
                        <TableRow key={`${line.requisition_line_id}-${lineIndex}`}>
                          <TableCell>
                            <span>{line.description}</span>
                            {line.warehouse_item_id ? (
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                Warehouse item #{line.warehouse_item_id}
                                {line.sku ? ` · ${line.sku}` : ""}
                              </span>
                            ) : (
                              <span className="mt-0.5 block text-xs font-medium text-destructive">
                                Not linked to warehouse catalog — link on project BOM before receiving
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{line.sku ?? "—"}</TableCell>
                          <TableCell>
                            <code className="text-xs">{line.requisition_reference}</code>
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              className="ml-auto w-24 text-right"
                              type="number"
                              min="0.001"
                              step="0.001"
                              value={line.quantity}
                              onChange={(event) =>
                                updateLine(groupIndex, lineIndex, { quantity: event.target.value })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              className="ml-auto w-28 text-right"
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.unit_price}
                              onChange={(event) =>
                                updateLine(groupIndex, lineIndex, { unit_price: event.target.value })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            KES {lineTotal(line).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 flex justify-end gap-6 text-sm">
                    <div>Subtotal: <strong>KES {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></div>
                    <div>Total: <strong>KES {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Transport / driver</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Transport type</Label>
                    <Select
                      value={group.transport_type}
                      onValueChange={(value) => updateGroup(groupIndex, { transport_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select transport type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supplier_delivery">Supplier delivery</SelectItem>
                        <SelectItem value="own_collection">Own collection</SelectItem>
                        <SelectItem value="third_party">Third party haulier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Driver</Label>
                    <Select
                      value={group.driver_id || undefined}
                      onValueChange={(value) => applyDriver(groupIndex, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select driver (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.map((driver) => (
                          <SelectItem key={driver.id} value={String(driver.id)}>
                            {driver.code} · {driver.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Vehicle</Label>
                    <Input
                      value={group.vehicle}
                      onChange={(event) => updateGroup(groupIndex, { vehicle: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Driver name</Label>
                    <Input
                      value={group.driver_name}
                      onChange={(event) => updateGroup(groupIndex, { driver_name: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Driver phone</Label>
                    <Input
                      value={group.driver_phone}
                      onChange={(event) => updateGroup(groupIndex, { driver_phone: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expected arrival</Label>
                    <Input
                      type="date"
                      value={group.expected_arrival}
                      onChange={(event) =>
                        updateGroup(groupIndex, { expected_arrival: event.target.value })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/procurement/requisitions">Cancel</Link>
        </Button>
        <Button disabled={submitting} onClick={() => void submit()}>
          {submitting
            ? "Creating…"
            : totalPoCount > 1
              ? `Create ${totalPoCount} purchase orders`
              : "Create purchase order"}
        </Button>
      </div>
    </div>
  );
}
