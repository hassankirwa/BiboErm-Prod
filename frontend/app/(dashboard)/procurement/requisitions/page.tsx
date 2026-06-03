"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  listRequisitions,
  rejectRequisition,
  type PurchaseRequisition,
} from "@/lib/api/procurement";
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
  if (!trigger) return "Manual";
  return trigger
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function lineOverageSummary(requisition: PurchaseRequisition) {
  const lines = requisition.lines ?? [];
  const withOverage = lines.filter(
    (line) =>
      line.overage_quantity !== null &&
      line.overage_quantity !== undefined &&
      Number(line.overage_quantity) > 0,
  );

  if (withOverage.length === 0) {
    return "—";
  }

  return `${withOverage.length} line${withOverage.length === 1 ? "" : "s"}`;
}

function hasPurchaseOrder(requisition: PurchaseRequisition) {
  return (requisition.purchase_orders_count ?? 0) > 0;
}

function createPoHref(requisitionIds: number[]) {
  return `/procurement/orders/create?requisition_ids=${requisitionIds.join(",")}`;
}

export default function RequisitionsPage() {
  const router = useRouter();
  const [items, setItems] = useState<PurchaseRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [selectedApprovedIds, setSelectedApprovedIds] = useState<number[]>([]);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const res = await listRequisitions({ per_page: 50 });
      setItems(res.data);
      setSelectedApprovedIds((current) =>
        current.filter((id) => {
          const item = res.data.find((entry) => entry.id === id);
          return item?.status === "approved" && !hasPurchaseOrder(item);
        }),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load requisitions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQueue();
  }, []);

  const approvableApproved = useMemo(
    () => items.filter((item) => item.status === "approved" && !hasPurchaseOrder(item)),
    [items],
  );

  const handleApproveAndCreatePo = async (id: number) => {
    setSubmittingId(id);
    try {
      await approveRequisition(id);
      toast.success("Requisition approved. Continue to purchase order creation.");
      router.push(createPoHref([id]));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve requisition.");
      setSubmittingId(null);
    }
  };

  const handleReject = async (id: number) => {
    const reason = window.prompt("Enter a rejection reason:");

    if (!reason) {
      return;
    }

    setSubmittingId(id);
    try {
      await rejectRequisition(id, reason);
      toast.success("Requisition rejected.");
      loadQueue();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reject requisition.");
    } finally {
      setSubmittingId(null);
    }
  };

  const toggleApprovedSelection = (id: number, checked: boolean) => {
    setSelectedApprovedIds((current) =>
      checked ? [...current, id] : current.filter((entry) => entry !== id),
    );
  };

  const handleBulkCreatePo = () => {
    if (selectedApprovedIds.length === 0) {
      toast.error("Select approved requisitions without purchase orders.");
      return;
    }
    router.push(createPoHref(selectedApprovedIds));
  };

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Requisitions"
        subtitle="Review submitted requisitions, approve, and create supplier purchase orders"
        actions={
          <div className="flex gap-2">
            {selectedApprovedIds.length > 0 ? (
              <Button variant="secondary" onClick={handleBulkCreatePo}>
                Create POs ({selectedApprovedIds.length})
              </Button>
            ) : null}
            <Button asChild>
              <Link href="/procurement/requisitions/create">Create requisition</Link>
            </Button>
          </div>
        }
      />
      <div className="space-y-6 p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading requisitions…</p>
        ) : (
          <div className="rounded-md border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Reference</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Lines</TableHead>
                  <TableHead>Overage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((pr) => {
                  const canSelectForPo = pr.status === "approved" && !hasPurchaseOrder(pr);
                  const isPending = pr.status === "pending_approval";

                  return (
                    <TableRow key={pr.id}>
                      <TableCell>
                        {canSelectForPo ? (
                          <Checkbox
                            checked={selectedApprovedIds.includes(pr.id)}
                            onCheckedChange={(checked) =>
                              toggleApprovedSelection(pr.id, checked === true)
                            }
                            aria-label={`Select ${pr.reference}`}
                          />
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <code className="text-sm">{pr.reference}</code>
                          {pr.requires_admin_approval ? (
                            <div>
                              <Badge variant="outline" className="text-[10px]">
                                Admin approval
                              </Badge>
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{pr.supplier?.name ?? "—"}</TableCell>
                      <TableCell>
                        {pr.project ? `${pr.project.reference} · ${pr.project.name}` : "General procurement"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{formatTrigger(pr.trigger_type)}</Badge>
                      </TableCell>
                      <TableCell>{pr.lines?.length ?? 0}</TableCell>
                      <TableCell>{lineOverageSummary(pr)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColors[pr.status] ?? ""}>
                          {formatStatus(pr.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {isPending ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={submittingId === pr.id}
                                onClick={() => handleReject(pr.id)}
                              >
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                disabled={submittingId === pr.id}
                                onClick={() => handleApproveAndCreatePo(pr.id)}
                              >
                                Approve &amp; Create PO
                              </Button>
                            </>
                          ) : null}
                          {canSelectForPo ? (
                            <Button size="sm" asChild>
                              <Link href={createPoHref([pr.id])}>Create PO</Link>
                            </Button>
                          ) : null}
                          {hasPurchaseOrder(pr) ? (
                            <Button size="sm" variant="outline" asChild>
                              <Link href="/procurement/orders">View POs</Link>
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {approvableApproved.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Select multiple approved requisitions to create separate purchase orders grouped by supplier.
          </p>
        ) : null}
      </div>
    </div>
  );
}
