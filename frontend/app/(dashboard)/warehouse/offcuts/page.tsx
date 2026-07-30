"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { PermissionGuard } from "@/components/auth/permission-guard";
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
  allocateOffcut,
  consumeOffcut,
  flattenBinsFromLocationTree,
  getLocationTree,
  getOffcutAnalytics,
  listOffcuts,
  listWarehouseItems,
  logOffcut,
  warehouseItemLabel,
  type Offcut,
  type OffcutAnalytics,
  type SelectOption,
  type WarehouseItem,
} from "@/lib/api/warehouse";
import { listProjects, type ProjectSummary } from "@/lib/api/projects";
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

const statusColors: Record<string, string> = {
  available: "bg-success/10 text-success",
  allocated: "bg-info/10 text-info",
  consumed: "bg-muted text-muted-foreground",
};

export default function WarehouseOffcutsPage() {
  const [items, setItems] = useState<Offcut[]>([]);
  const [analytics, setAnalytics] = useState<OffcutAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
  const [bins, setBins] = useState<SelectOption[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [allocatingOffcutId, setAllocatingOffcutId] = useState<number | null>(null);
  const [allocateProjectId, setAllocateProjectId] = useState("");
  const [skuSearch, setSkuSearch] = useState("");
  const [skuQuery, setSkuQuery] = useState("");
  const [form, setForm] = useState({
    item_id: "",
    bin_id: "",
    length_mm: "",
    quantity_pieces: "1",
    source_project_id: "",
    notes: "",
  });

  const load = () => {
    setLoading(true);
    Promise.all([
      listOffcuts({
        per_page: 50,
        ...(skuQuery.trim() ? { sku: skuQuery.trim() } : {}),
      }),
      getOffcutAnalytics(),
    ])
      .then(([offcutsRes, analyticsRes]) => {
        setItems(offcutsRes.data);
        setAnalytics(analyticsRes.data);
      })
      .catch((error: Error) => toast.error(error.message || "Failed to load offcuts."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [skuQuery]);

  useEffect(() => {
    Promise.all([listWarehouseItems(), getLocationTree(), listProjects({ per_page: 100 })])
      .then(([itemsRes, locationRes, projectsRes]) => {
        setWarehouseItems(itemsRes);
        setBins(flattenBinsFromLocationTree(locationRes.data));
        setProjects(projectsRes.data);
      })
      .catch((error: Error) => toast.error(error.message || "Failed to load form options."))
      .finally(() => setOptionsLoading(false));
  }, []);

  const submit = async () => {
    try {
      await logOffcut({
        item_id: Number(form.item_id),
        bin_id: Number(form.bin_id),
        length_mm: Number(form.length_mm),
        quantity_pieces: Number(form.quantity_pieces),
        source_project_id: form.source_project_id ? Number(form.source_project_id) : undefined,
        notes: form.notes || undefined,
      });
      toast.success("Offcut logged.");
      setForm({
        item_id: "",
        bin_id: "",
        length_mm: "",
        quantity_pieces: "1",
        source_project_id: "",
        notes: "",
      });
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to log offcut.");
    }
  };

  const handleAllocate = async () => {
    if (!allocatingOffcutId || !allocateProjectId) {
      return;
    }

    try {
      await allocateOffcut(allocatingOffcutId, Number(allocateProjectId));
      toast.success("Offcut allocated.");
      setAllocatingOffcutId(null);
      setAllocateProjectId("");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to allocate offcut.");
    }
  };

  const handleConsume = async (id: number) => {
    try {
      await consumeOffcut(id);
      toast.success("Offcut marked consumed.");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to consume offcut.");
    }
  };

  return (
    <PermissionGuard
      permissions={["warehouse.offcuts.manage"]}
      fallback={
        <div className="flex min-w-0 w-full flex-col">
          <AppHeader title="Offcuts" subtitle="Track reusable aluminium offcuts and log reuse activity" />
          <div className="p-6 text-sm text-muted-foreground">
            Offcut management is only available to warehouse users with offcut access.
          </div>
        </div>
      }
    >
      <div className="flex min-w-0 w-full flex-col">
        <AppHeader title="Offcuts" subtitle="Track reusable aluminium offcuts and log reuse activity" />
        <div className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Logged</p><p className="text-2xl font-semibold">{analytics?.summary.pieces_logged ?? 0}</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Consumed</p><p className="text-2xl font-semibold">{analytics?.summary.pieces_consumed ?? 0}</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Available</p><p className="text-2xl font-semibold">{analytics?.summary.pieces_available ?? 0}</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Reuse Rate</p><p className="text-2xl font-semibold">{analytics?.summary.reuse_rate_percent ?? 0}%</p></CardContent></Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Log Offcut</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <select
                  className={selectClassName}
                  value={form.item_id}
                  disabled={optionsLoading}
                  onChange={(event) => setForm((current) => ({ ...current, item_id: event.target.value }))}
                >
                  <option value="">{optionsLoading ? "Loading items…" : "Select item"}</option>
                  {warehouseItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {warehouseItemLabel(item)}
                    </option>
                  ))}
                </select>
                <select
                  className={selectClassName}
                  value={form.bin_id}
                  disabled={optionsLoading}
                  onChange={(event) => setForm((current) => ({ ...current, bin_id: event.target.value }))}
                >
                  <option value="">{optionsLoading ? "Loading bins…" : "Select bin"}</option>
                  {bins.map((bin) => (
                    <option key={bin.id} value={bin.id}>
                      {bin.label}
                    </option>
                  ))}
                </select>
                <Input placeholder="Length (mm)" type="number" value={form.length_mm} onChange={(event) => setForm((current) => ({ ...current, length_mm: event.target.value }))} />
                <Input placeholder="Quantity pieces" type="number" value={form.quantity_pieces} onChange={(event) => setForm((current) => ({ ...current, quantity_pieces: event.target.value }))} />
                <select
                  className={selectClassName}
                  value={form.source_project_id}
                  disabled={optionsLoading}
                  onChange={(event) => setForm((current) => ({ ...current, source_project_id: event.target.value }))}
                >
                  <option value="">{optionsLoading ? "Loading projects…" : "Source project (optional)"}</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.reference} · {project.name}
                    </option>
                  ))}
                </select>
                <Textarea placeholder="Notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
                <Button className="w-full" onClick={submit} disabled={!form.item_id || !form.bin_id || !form.length_mm}>
                  Log offcut
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Offcut Pool</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <form
                  className="flex flex-wrap gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setSkuQuery(skuSearch.trim());
                  }}
                >
                  <Input
                    className="max-w-xs"
                    placeholder="Search SKU, name, or offcut #"
                    value={skuSearch}
                    onChange={(event) => setSkuSearch(event.target.value)}
                  />
                  <Button type="submit" variant="secondary">
                    Search
                  </Button>
                  {skuQuery ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setSkuSearch("");
                        setSkuQuery("");
                      }}
                    >
                      Clear
                    </Button>
                  ) : null}
                </form>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading offcuts…</p>
                ) : (
                  <div className="rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Offcut</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>Length</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.offcut_number}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {item.item?.sku ?? "—"}
                            </TableCell>
                            <TableCell>{item.item?.name ?? `Item #${item.item_id}`}</TableCell>
                            <TableCell>{item.length_mm} mm</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={statusColors[item.status] ?? ""}>
                                {item.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={item.status !== "available"}
                                  onClick={() => {
                                    setAllocatingOffcutId(item.id);
                                    setAllocateProjectId("");
                                  }}
                                >
                                  Allocate
                                </Button>
                                <Button size="sm" disabled={item.status === "consumed"} onClick={() => handleConsume(item.id)}>
                                  Mark consumed
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog
        open={allocatingOffcutId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAllocatingOffcutId(null);
            setAllocateProjectId("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate offcut</DialogTitle>
          </DialogHeader>
          <select
            className={selectClassName}
            value={allocateProjectId}
            disabled={optionsLoading}
            onChange={(event) => setAllocateProjectId(event.target.value)}
          >
            <option value="">{optionsLoading ? "Loading projects…" : "Select project"}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.reference} · {project.name}
              </option>
            ))}
          </select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllocatingOffcutId(null)}>
              Cancel
            </Button>
            <Button disabled={!allocateProjectId} onClick={handleAllocate}>
              Allocate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PermissionGuard>
  );
}
