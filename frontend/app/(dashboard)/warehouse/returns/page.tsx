"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  flattenBinsFromLocationTree,
  getLocationTree,
  listMovements,
  listWarehouseItems,
  returnStock,
  warehouseItemLabel,
  type SelectOption,
  type StockMovement,
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

export default function WarehouseReturnsPage() {
  const [items, setItems] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
  const [bins, setBins] = useState<SelectOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [form, setForm] = useState({
    project_id: "",
    item_id: "",
    to_bin_id: "",
    quantity: "",
    notes: "",
  });

  const load = () => {
    setLoading(true);
    listMovements({ movement_type: "return", per_page: 50 })
      .then((res) => setItems(res.data))
      .catch((error: Error) => toast.error(error.message || "Failed to load returns."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    Promise.all([listProjects({ per_page: 100 }), listWarehouseItems(), getLocationTree()])
      .then(([projectsRes, itemsRes, locationRes]) => {
        setProjects(projectsRes.data.filter((p) => p.stage !== "project_complete"));
        setWarehouseItems(itemsRes);
        setBins(flattenBinsFromLocationTree(locationRes.data));
      })
      .catch((error: Error) => toast.error(error.message || "Failed to load form options."))
      .finally(() => setOptionsLoading(false));
  }, []);

  const submitReturn = async () => {
    if (!form.item_id || !form.to_bin_id || !form.quantity) {
      toast.error("Item, destination bin, and quantity are required.");
      return;
    }
    setSubmitting(true);
    try {
      await returnStock({
        project_id: form.project_id ? Number(form.project_id) : undefined,
        notes: form.notes || undefined,
        lines: [
          {
            item_id: Number(form.item_id),
            to_bin_id: Number(form.to_bin_id),
            quantity: Number(form.quantity),
          },
        ],
      });
      toast.success("Extra stock returned to warehouse.");
      setForm({ project_id: "", item_id: "", to_bin_id: "", quantity: "", notes: "" });
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to return stock.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Stock returns"
        subtitle="Put surplus / extra items from projects back into warehouse bins"
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Return extra items</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <select
              className={selectClassName}
              value={form.project_id}
              disabled={optionsLoading || submitting}
              onChange={(e) => setForm((c) => ({ ...c, project_id: e.target.value }))}
            >
              <option value="">Project (optional)…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.reference} · {p.name}
                </option>
              ))}
            </select>
            <select
              className={selectClassName}
              value={form.item_id}
              disabled={optionsLoading || submitting}
              onChange={(e) => setForm((c) => ({ ...c, item_id: e.target.value }))}
            >
              <option value="">Item…</option>
              {warehouseItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {warehouseItemLabel(item)}
                </option>
              ))}
            </select>
            <select
              className={selectClassName}
              value={form.to_bin_id}
              disabled={optionsLoading || submitting}
              onChange={(e) => setForm((c) => ({ ...c, to_bin_id: e.target.value }))}
            >
              <option value="">Return to bin…</option>
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
              placeholder="Quantity"
              value={form.quantity}
              disabled={submitting}
              onChange={(e) => setForm((c) => ({ ...c, quantity: e.target.value }))}
            />
            <Textarea
              className="md:col-span-2"
              placeholder="Reason / notes (e.g. leftover from install)"
              value={form.notes}
              disabled={submitting}
              onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
            />
            <div className="md:col-span-2 lg:col-span-3">
              <Button disabled={submitting} onClick={() => void submitReturn()}>
                {submitting ? "Saving…" : "Record return"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent returns</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No return movements yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Movement</TableHead>
                      <TableHead>Project ref</TableHead>
                      <TableHead>Lines</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs">
                          {row.movement_number}
                        </TableCell>
                        <TableCell>
                          {row.reference_type === "project"
                            ? `#${row.reference_id}`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {(row.lines ?? [])
                            .map((line) => {
                              const bin =
                                line.to_bin?.code ??
                                line.toBin?.code ??
                                line.to_bin_id;
                              return `${line.item?.sku ?? line.item_id} → ${bin} (${line.quantity})`;
                            })
                            .join("; ") || "—"}
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate text-muted-foreground">
                          {row.notes || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.performed_at
                            ? new Date(row.performed_at).toLocaleString()
                            : "—"}
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
  );
}
