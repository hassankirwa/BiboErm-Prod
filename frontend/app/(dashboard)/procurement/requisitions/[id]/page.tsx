"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  approveRequisition,
  getRequisition,
  rejectRequisition,
  type PurchaseRequisition,
} from "@/lib/api/procurement";
import { printRequisitionDocument } from "@/lib/procurement/requisition-pdf";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_approval: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

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

function hasPurchaseOrder(requisition: PurchaseRequisition) {
  return (requisition.purchase_orders_count ?? 0) > 0;
}

export default function RequisitionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const [requisition, setRequisition] = useState<PurchaseRequisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    if (!Number.isFinite(id)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    return getRequisition(id)
      .then((res) => setRequisition(res.data))
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load requisition.");
        setRequisition(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
  }, [id]);

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
  const canCreatePo = requisition.status === "approved" && !hasPurchaseOrder(requisition);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title={requisition.reference}
        subtitle="Requisition detail and approval"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/procurement/requisitions">Back to queue</Link>
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              Print / PDF
            </Button>
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
            {hasPurchaseOrder(requisition) ? (
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
            Supplier: <strong>{requisition.supplier?.name ?? "—"}</strong>
          </span>
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

        {requisition.notes ? (
          <div className="rounded-lg border bg-card p-4 text-sm">
            <p className="font-medium">Notes</p>
            <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{requisition.notes}</p>
          </div>
        ) : null}

        {requisition.rejection_reason ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <p className="font-medium text-destructive">Rejection reason</p>
            <p className="mt-1 whitespace-pre-wrap">{requisition.rejection_reason}</p>
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
                <TableHead>UoM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(requisition.lines ?? []).map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.description}</TableCell>
                  <TableCell>{line.sku ?? line.warehouse_item?.sku ?? "—"}</TableCell>
                  <TableCell className="text-right">{line.required_quantity ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">{line.quantity}</TableCell>
                  <TableCell className="text-right">{line.overage_quantity ?? "—"}</TableCell>
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
