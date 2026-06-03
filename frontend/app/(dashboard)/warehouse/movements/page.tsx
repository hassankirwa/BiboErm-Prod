"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  flattenBinsFromLocationTree,
  getLocationTree,
  issueStock,
  listMovements,
  listWarehouseItems,
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

export default function WarehouseMovementsPage() {
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
    from_bin_id: "",
    quantity: "",
    notes: "",
  });

  const load = () => {
    setLoading(true);
    listMovements({ per_page: 50 })
      .then((res) => setItems(res.data))
      .catch((error: Error) => toast.error(error.message || "Failed to load movements."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    Promise.all([listProjects({ per_page: 100 }), listWarehouseItems(), getLocationTree()])
      .then(([projectsRes, itemsRes, locationRes]) => {
        setProjects(projectsRes.data);
        setWarehouseItems(itemsRes);
        setBins(flattenBinsFromLocationTree(locationRes.data));
      })
      .catch((error: Error) => toast.error(error.message || "Failed to load form options."))
      .finally(() => setOptionsLoading(false));
  }, []);

  const submitIssue = async () => {
    setSubmitting(true);
    try {
      await issueStock({
        project_id: form.project_id ? Number(form.project_id) : undefined,
        notes: form.notes || undefined,
        lines: [
          {
            item_id: Number(form.item_id),
            from_bin_id: Number(form.from_bin_id),
            quantity: Number(form.quantity),
          },
        ],
      });
      toast.success("Stock issued.");
      setForm({ project_id: "", item_id: "", from_bin_id: "", quantity: "", notes: "" });
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to issue stock.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader title="Stock Movements" subtitle="Review warehouse movement history and issue stock to projects" />
      <div className="grid gap-6 p-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Quick Issue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              className={selectClassName}
              value={form.project_id}
              disabled={optionsLoading}
              onChange={(event) => setForm((current) => ({ ...current, project_id: event.target.value }))}
            >
              <option value="">{optionsLoading ? "Loading projects…" : "Project (optional)"}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.reference} · {project.name}
                </option>
              ))}
            </select>
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
              value={form.from_bin_id}
              disabled={optionsLoading}
              onChange={(event) => setForm((current) => ({ ...current, from_bin_id: event.target.value }))}
            >
              <option value="">{optionsLoading ? "Loading bins…" : "From bin"}</option>
              {bins.map((bin) => (
                <option key={bin.id} value={bin.id}>
                  {bin.label}
                </option>
              ))}
            </select>
            <Input placeholder="Quantity" type="number" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} />
            <Textarea placeholder="Notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            <div className="flex gap-2">
              <Button className="flex-1" disabled={submitting || !form.item_id || !form.from_bin_id || !form.quantity} onClick={submitIssue}>
                {submitting ? "Issuing..." : "Issue stock"}
              </Button>
              <Link href="/warehouse/receive" className="flex-1">
                <Button variant="outline" className="w-full">Receive stock</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Movements</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading movements…</p>
            ) : (
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Movement</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Performed</TableHead>
                      <TableHead>Lines</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.movement_number}</TableCell>
                        <TableCell>{item.movement_type.replaceAll("_", " ")}</TableCell>
                        <TableCell>
                          {item.reference_type ? `${item.reference_type} #${item.reference_id}` : "—"}
                        </TableCell>
                        <TableCell>{item.performed_at ? new Date(item.performed_at).toLocaleString() : "—"}</TableCell>
                        <TableCell>{item.lines?.length ?? 0}</TableCell>
                      </TableRow>
                    ))}
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                          No stock movements yet.
                        </TableCell>
                      </TableRow>
                    ) : null}
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
