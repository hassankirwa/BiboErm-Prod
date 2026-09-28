"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createMaterialRequest,
  flattenBinsFromLocationTree,
  fulfillMaterialRequest,
  getLocationTree,
  listMaterialRequests,
  listWarehouseItems,
  rejectMaterialRequest,
  warehouseItemLabel,
  type MaterialRequest,
  type SelectOption,
  type WarehouseItem,
} from "@/lib/api/warehouse";
import { listProjects, type ProjectSummary } from "@/lib/api/projects";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const selectClassName =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50";

type Props = {
  source: "warehouse" | "production";
  title?: string;
  subtitle?: string;
  fixedProjectId?: number;
  showHeader?: boolean;
};

export function MaterialRequestsWorkbench({
  source,
  title = "Additional materials",
  subtitle = "Request extra materials for incomplete projects",
  fixedProjectId,
  showHeader = true,
}: Props) {
  const { hasPermission } = useAuth();
  const canFulfill = hasPermission("warehouse.stock.issue");
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
  const [bins, setBins] = useState<SelectOption[]>([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [fulfillTarget, setFulfillTarget] = useState<MaterialRequest | null>(null);
  const [fulfillLines, setFulfillLines] = useState<
    Record<number, { from_bin_id: string; quantity: string }>
  >({});
  const [fulfillNotes, setFulfillNotes] = useState("");
  const [fulfilling, setFulfilling] = useState(false);
  const [form, setForm] = useState({
    project_id: fixedProjectId ? String(fixedProjectId) : "",
    reason: "",
    notes: "",
    item_id: "",
    quantity: "1",
  });
  const [draftLines, setDraftLines] = useState<
    Array<{ warehouse_item_id: number; quantity: number; label: string }>
  >([]);

  const load = useCallback(() => {
    setLoading(true);
    listMaterialRequests({
      status: statusFilter === "all" ? undefined : statusFilter,
      project_id: fixedProjectId,
      per_page: 50,
    })
      .then((res) => setRequests(res.data))
      .catch((e: Error) => toast.error(e.message || "Failed to load requests."))
      .finally(() => setLoading(false));
  }, [statusFilter, fixedProjectId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    Promise.all([
      listProjects({ per_page: 100 }),
      listWarehouseItems(),
      getLocationTree(),
    ])
      .then(([projectsRes, itemsRes, treeRes]) => {
        setProjects(projectsRes.data.filter((p) => p.stage !== "project_complete"));
        setWarehouseItems(itemsRes);
        setBins(flattenBinsFromLocationTree(treeRes.data));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (fixedProjectId) {
      setForm((c) => ({ ...c, project_id: String(fixedProjectId) }));
    }
  }, [fixedProjectId]);

  const incompleteProjects = useMemo(() => projects, [projects]);

  const addDraftLine = () => {
    if (!form.item_id || !form.quantity) return;
    const item = warehouseItems.find((i) => i.id === Number(form.item_id));
    if (!item) return;
    setDraftLines((prev) => [
      ...prev,
      {
        warehouse_item_id: item.id,
        quantity: Number(form.quantity),
        label: warehouseItemLabel(item),
      },
    ]);
    setForm((c) => ({ ...c, item_id: "", quantity: "1" }));
  };

  const submitCreate = async () => {
    if (!form.project_id || draftLines.length === 0) {
      toast.error("Select a project and add at least one item.");
      return;
    }
    setCreating(true);
    try {
      await createMaterialRequest({
        project_id: Number(form.project_id),
        source,
        reason: form.reason || undefined,
        notes: form.notes || undefined,
        lines: draftLines.map((l) => ({
          warehouse_item_id: l.warehouse_item_id,
          quantity: l.quantity,
        })),
      });
      toast.success("Additional materials requested.");
      setCreateOpen(false);
      setDraftLines([]);
      setForm({
        project_id: fixedProjectId ? String(fixedProjectId) : "",
        reason: "",
        notes: "",
        item_id: "",
        quantity: "1",
      });
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setCreating(false);
    }
  };

  const openFulfill = (req: MaterialRequest) => {
    setFulfillTarget(req);
    const initial: Record<number, { from_bin_id: string; quantity: string }> = {};
    for (const line of req.lines ?? []) {
      const remaining =
        Number(line.quantity_requested) - Number(line.quantity_fulfilled);
      if (remaining > 0) {
        initial[line.id] = {
          from_bin_id: "",
          quantity: String(remaining),
        };
      }
    }
    setFulfillLines(initial);
    setFulfillNotes("");
  };

  const submitFulfill = async () => {
    if (!fulfillTarget) return;
    const lines = Object.entries(fulfillLines)
      .filter(([, v]) => v.from_bin_id && Number(v.quantity) > 0)
      .map(([lineId, v]) => ({
        line_id: Number(lineId),
        from_bin_id: Number(v.from_bin_id),
        quantity: Number(v.quantity),
      }));
    if (lines.length === 0) {
      toast.error("Pick bins and quantities to issue.");
      return;
    }
    setFulfilling(true);
    try {
      await fulfillMaterialRequest(fulfillTarget.id, {
        notes: fulfillNotes || undefined,
        draft_shortage_requisition: true,
        lines,
      });
      toast.success("Request fulfilled (shortage drafted to procurement if any).");
      setFulfillTarget(null);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fulfill failed.");
    } finally {
      setFulfilling(false);
    }
  };

  const body = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          className={`${selectClassName} w-[180px]`}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
        <Button onClick={() => setCreateOpen(true)}>Request materials</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No material requests.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>{req.id}</TableCell>
                  <TableCell>
                    {req.project ? (
                      <Link
                        href={`/projects/${req.project.id}`}
                        className="text-primary hover:underline"
                      >
                        {req.project.reference}
                      </Link>
                    ) : (
                      `#${req.project_id}`
                    )}
                    <div className="text-xs text-muted-foreground">
                      {req.requester?.name}
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{req.source}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {req.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[260px] text-xs">
                    {(req.lines ?? [])
                      .map(
                        (l) =>
                          `${l.item?.sku ?? l.warehouse_item_id}: ${l.quantity_fulfilled}/${l.quantity_requested}`,
                      )
                      .join(" · ")}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate text-muted-foreground">
                    {req.reason || "—"}
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    {canFulfill &&
                    (req.status === "pending" || req.status === "partial") ? (
                      <>
                        <Button size="sm" onClick={() => openFulfill(req)}>
                          Fulfill
                        </Button>
                        {req.status === "pending" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              void rejectMaterialRequest(req.id, "Not required")
                                .then(() => {
                                  toast.success("Request rejected.");
                                  load();
                                })
                                .catch((e) =>
                                  toast.error(
                                    e instanceof Error ? e.message : "Reject failed.",
                                  ),
                                )
                            }
                          >
                            Reject
                          </Button>
                        ) : null}
                      </>
                    ) : req.purchase_requisition ? (
                      <span className="text-xs text-muted-foreground">
                        PR {req.purchase_requisition.reference}
                      </span>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );

  return (
    <>
      {showHeader ? (
        <div className="flex min-w-0 w-full flex-col">
          <AppHeader title={title} subtitle={subtitle} />
          <div className="p-6">{body}</div>
        </div>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{title}</CardTitle>
          </CardHeader>
          <CardContent>{body}</CardContent>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request additional materials</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!fixedProjectId ? (
              <select
                className={selectClassName}
                value={form.project_id}
                onChange={(e) => setForm((c) => ({ ...c, project_id: e.target.value }))}
              >
                <option value="">Incomplete project…</option>
                {incompleteProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.reference} · {p.name} · {p.stage}
                  </option>
                ))}
              </select>
            ) : null}
            <Input
              placeholder="Reason (e.g. damage on site, short cut)"
              value={form.reason}
              onChange={(e) => setForm((c) => ({ ...c, reason: e.target.value }))}
            />
            <div className="flex gap-2">
              <select
                className={selectClassName}
                value={form.item_id}
                onChange={(e) => setForm((c) => ({ ...c, item_id: e.target.value }))}
              >
                <option value="">Item…</option>
                {warehouseItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {warehouseItemLabel(item)}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                min={0}
                step="any"
                className="w-24"
                value={form.quantity}
                onChange={(e) => setForm((c) => ({ ...c, quantity: e.target.value }))}
              />
              <Button type="button" variant="outline" onClick={addDraftLine}>
                Add
              </Button>
            </div>
            {draftLines.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {draftLines.map((line, idx) => (
                  <li key={`${line.warehouse_item_id}-${idx}`} className="flex justify-between">
                    <span>
                      {line.label} × {line.quantity}
                    </span>
                    <button
                      type="button"
                      className="text-xs text-destructive"
                      onClick={() =>
                        setDraftLines((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <Textarea
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled={creating} onClick={() => void submitCreate()}>
              {creating ? "Submitting…" : "Submit request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={fulfillTarget !== null}
        onOpenChange={(open) => {
          if (!open) setFulfillTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Fulfill request #{fulfillTarget?.id}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[360px] space-y-3 overflow-y-auto">
            {(fulfillTarget?.lines ?? [])
              .filter(
                (l) => Number(l.quantity_requested) - Number(l.quantity_fulfilled) > 0,
              )
              .map((line) => {
                const remaining =
                  Number(line.quantity_requested) - Number(line.quantity_fulfilled);
                const state = fulfillLines[line.id] ?? {
                  from_bin_id: "",
                  quantity: String(remaining),
                };
                return (
                  <div
                    key={line.id}
                    className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_140px_100px]"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {line.item?.sku} · {line.item?.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Remaining {remaining}
                      </div>
                    </div>
                    <select
                      className={selectClassName}
                      value={state.from_bin_id}
                      onChange={(e) =>
                        setFulfillLines((prev) => ({
                          ...prev,
                          [line.id]: { ...state, from_bin_id: e.target.value },
                        }))
                      }
                    >
                      <option value="">From bin…</option>
                      {bins.map((bin) => (
                        <option key={bin.value} value={bin.value}>
                          {bin.label}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={state.quantity}
                      onChange={(e) =>
                        setFulfillLines((prev) => ({
                          ...prev,
                          [line.id]: { ...state, quantity: e.target.value },
                        }))
                      }
                    />
                  </div>
                );
              })}
            <Textarea
              placeholder="Fulfillment notes"
              value={fulfillNotes}
              onChange={(e) => setFulfillNotes(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Remaining unfulfilled qty will draft a procurement requisition.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFulfillTarget(null)}>
              Cancel
            </Button>
            <Button disabled={fulfilling} onClick={() => void submitFulfill()}>
              {fulfilling ? "Issuing…" : "Issue & fulfill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
