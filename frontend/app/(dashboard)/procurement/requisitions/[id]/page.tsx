"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  approveRequisition,
  getRequisition,
  listSuppliers,
  rejectRequisition,
  submitRequisition,
  updateRequisition,
  type PurchaseRequisition,
  type Supplier,
} from "@/lib/api/procurement";
import { printRequisitionDocument } from "@/lib/procurement/requisition-pdf";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_approval: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

const NONE_SUPPLIER = "__none__";

function formatStatus(status: string) {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatTrigger(trigger?: string | null) {
  if (!trigger) {
    return "Manual";
  }
  return trigger
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function createPoHref(requisitionId: number) {
  return `/procurement/orders/create?requisition_ids=${requisitionId}`;
}

function parseQty(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatOverage(requiredQty: string, orderQty: string) {
  const overage = parseQty(orderQty) - parseQty(requiredQty);
  if (overage <= 0) {
    return "—";
  }
  return overage.toFixed(3).replace(/\.?0+$/, "");
}

type EditableLine = {
  id: number;
  description: string;
  sku: string;
  requiredQty: string;
  orderQty: string;
  unit: string;
  preferredSupplierId: string;
};

export default function RequisitionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const [requisition, setRequisition] = useState<PurchaseRequisition | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [supplierId, setSupplierId] = useState<string>(NONE_SUPPLIER);
  const [requiredBy, setRequiredBy] = useState("");
  const [notes, setNotes] = useState("");
  const [editableLines, setEditableLines] = useState<EditableLine[]>([]);

  const isEditable = requisition?.is_editable ?? requisition?.status === "draft";

  const syncForm = (data: PurchaseRequisition) => {
    setSupplierId(data.supplier_id ? String(data.supplier_id) : NONE_SUPPLIER);
    setRequiredBy(data.required_by ?? "");
    setNotes(data.notes ?? "");
    setEditableLines(
      (data.lines ?? []).map((line) => ({
        id: line.id,
        description: line.description,
        sku: line.sku ?? line.warehouse_item?.sku ?? "—",
        requiredQty: line.required_quantity ?? line.quantity,
        orderQty: line.quantity,
        unit: line.unit_of_measure ?? line.warehouse_item?.unit_of_measure ?? "—",
        preferredSupplierId: line.preferred_supplier_id
          ? String(line.preferred_supplier_id)
          : NONE_SUPPLIER,
      })),
    );
  };

  const load = () => {
    if (!Number.isFinite(id)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    return getRequisition(id)
      .then((res) => {
        setRequisition(res.data);
        syncForm(res.data);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load requisition.");
        setRequisition(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
  }, [id]);

  useEffect(() => {
    void listSuppliers({ per_page: 100 })
      .then((res) => setSuppliers(res.data.filter((supplier) => supplier.is_active)))
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load suppliers.");
      });
  }, []);

  const supplierOptions = useMemo(() => suppliers, [suppliers]);

  const updateLine = (lineId: number, patch: Partial<EditableLine>) => {
    setEditableLines((current) =>
      current.map((line) => (line.id === lineId ? { ...line, ...patch } : line)),
    );
  };

  const handleSave = async () => {
    if (!requisition || !isEditable) {
      return;
    }

    const invalidQty = editableLines.some((line) => parseQty(line.orderQty) <= 0);
    if (invalidQty) {
      toast.error("Order quantity must be greater than zero for every line.");
      return;
    }

    setSaving(true);
    try {
      const res = await updateRequisition(requisition.id, {
        supplier_id: supplierId === NONE_SUPPLIER ? null : Number(supplierId),
        required_by: requiredBy || null,
        notes: notes || null,
        lines: editableLines.map((line) => ({
          id: line.id,
          quantity: parseQty(line.orderQty),
          preferred_supplier_id:
            line.preferredSupplierId === NONE_SUPPLIER
              ? null
              : Number(line.preferredSupplierId),
        })),
      });
      setRequisition(res.data);
      syncForm(res.data);
      toast.success("Requisition saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save requisition.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!requisition) {
      return;
    }

    const invalidQty = editableLines.some((line) => parseQty(line.orderQty) <= 0);
    if (isEditable && invalidQty) {
      toast.error("Order quantity must be greater than zero for every line.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEditable) {
        await updateRequisition(requisition.id, {
          supplier_id: supplierId === NONE_SUPPLIER ? null : Number(supplierId),
          required_by: requiredBy || null,
          notes: notes || null,
          lines: editableLines.map((line) => ({
            id: line.id,
            quantity: parseQty(line.orderQty),
            preferred_supplier_id:
              line.preferredSupplierId === NONE_SUPPLIER
                ? null
                : Number(line.preferredSupplierId),
          })),
        });
      }

      const res = await submitRequisition(requisition.id);
      setRequisition(res.data);
      syncForm(res.data);
      toast.success("Requisition submitted for approval.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit requisition.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveAndCreatePo = async () => {
    if (!requisition) {
      return;
    }

    setSubmitting(true);
    try {
      await approveRequisition(requisition.id);
      toast.success("Requisition approved. Continue to purchase order creation.");
      router.push(createPoHref(requisition.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve requisition.");
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!requisition) {
      return;
    }

    const reason = window.prompt("Enter a rejection reason:");
    if (!reason) {
      return;
    }

    setSubmitting(true);
    try {
      await rejectRequisition(requisition.id, reason);
      toast.success("Requisition rejected.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reject requisition.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    if (!requisition) {
      return;
    }

    try {
      printRequisitionDocument(requisition);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open print view.");
    }
  };

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading requisition…</p>;
  }

  if (!requisition) {
    return <p className="p-6 text-sm text-destructive">Requisition not found.</p>;
  }

  const isPending = requisition.status === "pending_approval";
  const canCreatePo =
    requisition.can_create_purchase_order ??
    (requisition.status === "approved" && (requisition.purchase_orders_count ?? 0) === 0);
  const hasPurchaseOrders = (requisition.purchase_orders_count ?? 0) > 0;

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title={requisition.reference}
        subtitle={
          isEditable
            ? "Edit supplier, required-by date, and order quantities before submitting"
            : "Requisition detail and approval"
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/procurement/requisitions">Back to queue</Link>
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              Print / PDF
            </Button>
            {isEditable ? (
              <>
                <Button variant="secondary" disabled={saving || submitting} onClick={() => void handleSave()}>
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button disabled={saving || submitting} onClick={() => void handleSubmit()}>
                  Submit for approval
                </Button>
              </>
            ) : null}
            {isPending ? (
              <>
                <Button variant="outline" disabled={submitting} onClick={() => void handleReject()}>
                  Reject
                </Button>
                <Button disabled={submitting} onClick={() => void handleApproveAndCreatePo()}>
                  Approve &amp; Create PO
                </Button>
              </>
            ) : null}
            {canCreatePo ? (
              <Button asChild>
                <Link href={createPoHref(requisition.id)}>Create PO</Link>
              </Button>
            ) : null}
            {hasPurchaseOrders ? (
              <Button variant="secondary" asChild>
                <Link href="/procurement/orders">View POs</Link>
              </Button>
            ) : null}
          </div>
        }
      />
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant="secondary" className={statusColors[requisition.status] ?? ""}>
            {formatStatus(requisition.status)}
          </Badge>
          <span>
            Project:{" "}
            {requisition.project
              ? `${requisition.project.reference} · ${requisition.project.name}`
              : "General procurement"}
          </span>
          <Badge variant="outline">{formatTrigger(requisition.trigger_type)}</Badge>
          {requisition.requester ? (
            <span className="text-muted-foreground">Requested by {requisition.requester.name}</span>
          ) : null}
        </div>

        {isEditable ? (
          <div className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="default-supplier">Default supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger id="default-supplier">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_SUPPLIER}>No default supplier</SelectItem>
                  {supplierOptions.map((supplier) => (
                    <SelectItem key={supplier.id} value={String(supplier.id)}>
                      {supplier.name}
                      {supplier.is_preferred ? " · Preferred" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used for lines without a preferred supplier. Different line suppliers create one PO
                each.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="required-by">Required by</Label>
              <Input
                id="required-by"
                type="date"
                value={requiredBy}
                onChange={(event) => setRequiredBy(event.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span>
                Supplier: <strong>{requisition.supplier?.name ?? "—"}</strong>
              </span>
              <span>
                Required by: <strong>{requisition.required_by ?? "—"}</strong>
              </span>
            </div>
            {requisition.notes ? (
              <div className="rounded-lg border bg-card p-4 text-sm">
                <p className="font-medium">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{requisition.notes}</p>
              </div>
            ) : null}
          </>
        )}

        {requisition.rejection_reason ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <p className="font-medium text-destructive">Rejection reason</p>
            <p className="mt-1 whitespace-pre-wrap">{requisition.rejection_reason}</p>
          </div>
        ) : null}

        {(requisition.purchase_orders?.length ?? 0) > 0 ? (
          <div className="rounded-lg border bg-card p-4 text-sm">
            <p className="font-medium">Purchase orders</p>
            <ul className="mt-2 space-y-1">
              {requisition.purchase_orders?.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/procurement/orders/${order.id}`}
                    className="text-primary hover:underline"
                  >
                    {order.reference}
                  </Link>{" "}
                  <span className="text-muted-foreground">({formatStatus(order.status)})</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Required</TableHead>
                <TableHead className="text-right">Order qty</TableHead>
                <TableHead className="text-right">Overage</TableHead>
                <TableHead>Preferred supplier</TableHead>
                <TableHead>UoM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isEditable
                ? editableLines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.description}</TableCell>
                      <TableCell>{line.sku}</TableCell>
                      <TableCell className="text-right">{line.requiredQty}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          className="ml-auto h-8 w-24 text-right"
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={line.orderQty}
                          onChange={(event) =>
                            updateLine(line.id, { orderQty: event.target.value })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatOverage(line.requiredQty, line.orderQty)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={line.preferredSupplierId}
                          onValueChange={(value) =>
                            updateLine(line.id, { preferredSupplierId: value })
                          }
                        >
                          <SelectTrigger className="h-8 min-w-[180px]">
                            <SelectValue placeholder="Use default" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE_SUPPLIER}>Use default supplier</SelectItem>
                            {supplierOptions.map((supplier) => (
                              <SelectItem key={supplier.id} value={String(supplier.id)}>
                                {supplier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{line.unit}</TableCell>
                    </TableRow>
                  ))
                : (requisition.lines ?? []).map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.description}</TableCell>
                      <TableCell>{line.sku ?? line.warehouse_item?.sku ?? "—"}</TableCell>
                      <TableCell className="text-right">{line.required_quantity ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium">{line.quantity}</TableCell>
                      <TableCell className="text-right">{line.overage_quantity ?? "—"}</TableCell>
                      <TableCell>
                        {line.preferred_supplier?.name ??
                          requisition.supplier?.name ??
                          "—"}
                      </TableCell>
                      <TableCell>
                        {line.unit_of_measure ?? line.warehouse_item?.unit_of_measure ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
