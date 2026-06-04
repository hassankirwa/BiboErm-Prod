"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PermissionGate } from "@/components/auth/permission-gate";
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
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  getGlassOrder,
  listSuppliers,
  markGlassOrderDelivered,
  markGlassOrderOrdered,
  updateGlassOrder,
  type GlassOrder,
  type GlassOrderPane,
  type GlassOrderSpecs,
  type Supplier,
} from "@/lib/api/procurement";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  ordered: "bg-info/10 text-info",
  in_transit: "bg-warning/10 text-warning",
  delivered: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

function formatStatus(status: string) {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function emptyPane(): GlassOrderPane {
  return {
    name: "",
    width_mm: null,
    height_mm: null,
    quantity: 1,
    glass_type: "",
    tint: "",
    notes: "",
  };
}

function normalizePanes(panes?: GlassOrderPane[]): GlassOrderPane[] {
  if (!panes?.length) {
    return [emptyPane()];
  }
  return panes.map((pane) => ({
    name: pane.name ?? "",
    width_mm: pane.width_mm ?? null,
    height_mm: pane.height_mm ?? null,
    quantity: pane.quantity ?? 1,
    glass_type: pane.glass_type ?? "",
    tint: pane.tint ?? "",
    notes: pane.notes ?? "",
    bom_line_id: pane.bom_line_id ?? null,
  }));
}

function paneHasDimensions(pane: GlassOrderPane) {
  return (
    Number(pane.width_mm) > 0 &&
    Number(pane.height_mm) > 0 &&
    Number(pane.quantity) > 0
  );
}

type Props = {
  orderId: number;
  returnTo?: string | null;
};

export function GlassOrderDetailWorkspace({ orderId, returnTo }: Props) {
  const [order, setOrder] = useState<GlassOrder | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [supplierId, setSupplierId] = useState<string>("");
  const [requirements, setRequirements] = useState("");
  const [panes, setPanes] = useState<GlassOrderPane[]>([emptyPane()]);
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [notes, setNotes] = useState("");

  const isDraft = order?.status === "draft";
  const canEdit = isDraft;

  const load = useCallback(() => {
    if (!Number.isFinite(orderId)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    return Promise.all([
      getGlassOrder(orderId),
      listSuppliers({ category: "glass", per_page: 100 }),
    ])
      .then(([orderRes, supplierRes]) => {
        const row = orderRes.data;
        setOrder(row);
        setSupplierId(row.supplier_id ? String(row.supplier_id) : "");
        setRequirements(row.specs?.requirements ?? "");
        setPanes(normalizePanes(row.specs?.panes));
        setExpectedDelivery(row.expected_delivery ?? "");
        setDeliveryLocation(row.delivery_location ?? "");
        setNotes(row.notes ?? "");
        setSuppliers(supplierRes.data);
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Failed to load glass order"));
        setOrder(null);
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const specsPayload = useMemo<GlassOrderSpecs>(
    () => ({
      ...(order?.specs?.source ? { source: order.specs.source } : {}),
      requirements: requirements.trim(),
      panes: panes.map((pane) => ({
        ...pane,
        width_mm: pane.width_mm === null || pane.width_mm === "" ? null : Number(pane.width_mm),
        height_mm: pane.height_mm === null || pane.height_mm === "" ? null : Number(pane.height_mm),
        quantity: pane.quantity === null || pane.quantity === "" ? null : Number(pane.quantity),
      })),
    }),
    [order?.specs?.source, panes, requirements],
  );

  const validationHints = useMemo(() => {
    const hints: string[] = [];
    if (!supplierId) hints.push("Select a glass supplier.");
    if (!requirements.trim()) hints.push("Enter glass requirements (type, tint, processing).");
    if (!panes.some(paneHasDimensions)) {
      hints.push("Add at least one pane with width, height, and quantity.");
    }
    return hints;
  }, [panes, requirements, supplierId]);

  async function handleSave() {
    if (!order || !canEdit) return;
    setSaving(true);
    try {
      const res = await updateGlassOrder(order.id, {
        supplier_id: supplierId ? Number(supplierId) : null,
        specs: specsPayload,
        expected_delivery: expectedDelivery || null,
        delivery_location: deliveryLocation || null,
        notes: notes || null,
      });
      setOrder(res.data);
      toast.success("Glass order saved");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save glass order"));
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkOrdered() {
    if (!order) return;
    setSubmitting(true);
    try {
      await updateGlassOrder(order.id, {
        supplier_id: supplierId ? Number(supplierId) : null,
        specs: specsPayload,
        expected_delivery: expectedDelivery || null,
        delivery_location: deliveryLocation || null,
        notes: notes || null,
      });
      const res = await markGlassOrderOrdered(order.id);
      setOrder(res.data);
      toast.success("Glass order marked as ordered");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Complete required fields before ordering"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkDelivered() {
    if (!order) return;
    setSubmitting(true);
    try {
      const res = await markGlassOrderDelivered(order.id);
      setOrder(res.data);
      toast.success("Glass marked as delivered");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to mark delivered"));
    } finally {
      setSubmitting(false);
    }
  }

  function updatePane(index: number, patch: Partial<GlassOrderPane>) {
    setPanes((current) =>
      current.map((pane, i) => (i === index ? { ...pane, ...patch } : pane)),
    );
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading glass order…</p>;
  }

  if (!order) {
    return <p className="text-sm text-muted-foreground">Glass order not found.</p>;
  }

  const projectLabel = order.project?.name ?? `Project #${order.project_id}`;
  const projectReference = order.project?.reference;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{order.order_number}</h2>
            <Badge variant="secondary" className={statusColors[order.status] ?? ""}>
              {formatStatus(order.status)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Linked project:{" "}
            <Link
              href={`/projects/${order.project_id}?tab=procurement`}
              className="font-medium text-primary hover:underline"
            >
              {projectReference ? `${projectLabel} · ${projectReference}` : projectLabel}
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {returnTo ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={returnTo}>Back to production order</Link>
            </Button>
          ) : null}
          <Button variant="outline" size="sm" asChild>
            <Link href="/procurement/dashboard">Procurement dashboard</Link>
          </Button>
        </div>
      </div>

      {isDraft && validationHints.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="pt-4 text-sm">
            <p className="font-medium text-amber-900 dark:text-amber-200">
              Complete before ordering
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              {validationHints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="glass-supplier">Glass supplier</Label>
            <Select
              value={supplierId || undefined}
              onValueChange={setSupplierId}
              disabled={!canEdit}
            >
              <SelectTrigger id="glass-supplier">
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={String(supplier.id)}>
                    {supplier.code} · {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expected-delivery">Expected delivery</Label>
            <Input
              id="expected-delivery"
              type="date"
              value={expectedDelivery}
              onChange={(e) => setExpectedDelivery(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="requirements">Glass requirements</Label>
            <Textarea
              id="requirements"
              rows={3}
              placeholder="e.g. 6mm clear tempered, low-E coating, polished edges"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="delivery-location">Delivery location</Label>
            <Input
              id="delivery-location"
              placeholder="Factory / site address"
              value={deliveryLocation}
              onChange={(e) => setDeliveryLocation(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="order-notes">Notes</Label>
            <Textarea
              id="order-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!canEdit}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Pane dimensions</CardTitle>
          {canEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPanes((current) => [...current, emptyPane()])}
            >
              Add pane
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Width (mm)</TableHead>
                <TableHead>Height (mm)</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Tint</TableHead>
                <TableHead>Notes</TableHead>
                {canEdit ? <TableHead className="w-[80px]" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {panes.map((pane, index) => (
                <TableRow key={`pane-${index}`}>
                  <TableCell>
                    <Input
                      value={pane.name ?? ""}
                      onChange={(e) => updatePane(index, { name: e.target.value })}
                      disabled={!canEdit}
                      placeholder="Opening label"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={pane.width_mm ?? ""}
                      onChange={(e) =>
                        updatePane(index, {
                          width_mm: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      disabled={!canEdit}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={pane.height_mm ?? ""}
                      onChange={(e) =>
                        updatePane(index, {
                          height_mm: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      disabled={!canEdit}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={pane.quantity ?? ""}
                      onChange={(e) =>
                        updatePane(index, {
                          quantity: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      disabled={!canEdit}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={pane.glass_type ?? ""}
                      onChange={(e) => updatePane(index, { glass_type: e.target.value })}
                      disabled={!canEdit}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={pane.tint ?? ""}
                      onChange={(e) => updatePane(index, { tint: e.target.value })}
                      disabled={!canEdit}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={pane.notes ?? ""}
                      onChange={(e) => updatePane(index, { notes: e.target.value })}
                      disabled={!canEdit}
                    />
                  </TableCell>
                  {canEdit ? (
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={panes.length <= 1}
                        onClick={() =>
                          setPanes((current) => current.filter((_, i) => i !== index))
                        }
                      >
                        Remove
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {order.specs?.source === "project_bom" ||
          order.specs?.source === "production_fabrication_complete" ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Pane rows were seeded from the project BOM. Confirm dimensions before ordering.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <PermissionGate anyOf={["procurement.glass.manage", "procurement.manage"]}>
        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <>
              <Button type="button" variant="outline" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save draft"}
              </Button>
              <Button type="button" onClick={handleMarkOrdered} disabled={submitting || saving}>
                {submitting ? "Submitting…" : "Mark as ordered"}
              </Button>
            </>
          ) : null}
          {order.status === "ordered" || order.status === "in_transit" ? (
            <Button type="button" onClick={handleMarkDelivered} disabled={submitting}>
              {submitting ? "Updating…" : "Mark delivered"}
            </Button>
          ) : null}
        </div>
      </PermissionGate>
    </div>
  );
}
