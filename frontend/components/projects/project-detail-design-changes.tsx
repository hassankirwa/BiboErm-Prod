"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  approveDesignChangeOrder,
  closeDesignChangeOrder,
  completeMinorDesignChange,
  createDesignChangeOrder,
  createDesignChangeRemake,
  listDesignChangeOrders,
  releaseDesignChangeToProduction,
  updateDesignChangeOrder,
  type DesignChangeItem,
  type DesignChangeOrder,
} from "@/lib/api/projects";
import { toast } from "sonner";

type Props = { projectId: number };

type ItemDraft = {
  description: string;
  qty: string;
  change_type: "remake" | "material";
};

const emptyItem = (): ItemDraft => ({
  description: "",
  qty: "1",
  change_type: "remake",
});

const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

const START_STAGES = [
  { value: "material_prep", label: "Materials & tools assembly" },
  { value: "cutting", label: "Cutting" },
  { value: "fabrication", label: "Fabrication" },
  { value: "sash", label: "Sash" },
  { value: "glass_assembly", label: "Glass assembly" },
  { value: "finishing", label: "Finishing" },
];

function changeItems(dco: DesignChangeOrder): DesignChangeItem[] {
  if (Array.isArray(dco.change_items)) return dco.change_items;
  const notes = dco.measurement_notes;
  if (notes && typeof notes === "object" && !Array.isArray(notes)) {
    const items = (notes as { items?: DesignChangeItem[] }).items;
    return Array.isArray(items) ? items : [];
  }
  return [];
}

function changePath(dco: DesignChangeOrder): string | null {
  if (dco.change_path) return dco.change_path;
  const notes = dco.measurement_notes;
  if (notes && typeof notes === "object" && !Array.isArray(notes)) {
    const path = (notes as { change_path?: string }).change_path;
    return path ?? null;
  }
  return null;
}

export function ProjectDetailDesignChanges({ projectId }: Props) {
  const [orders, setOrders] = useState<DesignChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [newReason, setNewReason] = useState("");
  const [drafts, setDrafts] = useState<Record<number, ItemDraft>>({});
  const [paths, setPaths] = useState<Record<number, "full_remake" | "minor_material">>({});
  const [startStages, setStartStages] = useState<Record<number, string>>({});

  const reload = useCallback(async () => {
    const res = await listDesignChangeOrders(projectId);
    setOrders(res.data);
    setPaths((prev) => {
      const next = { ...prev };
      for (const dco of res.data) {
        const path = changePath(dco);
        if (path === "full_remake" || path === "minor_material") {
          next[dco.id] = path;
        }
      }
      return next;
    });
  }, [projectId]);

  useEffect(() => {
    reload()
      .catch((e: Error) => toast.error(e.message || "Failed to load design changes."))
      .finally(() => setLoading(false));
  }, [reload]);

  async function run(id: number, fn: () => Promise<unknown>, success = "Design change order updated.") {
    setBusyId(id);
    try {
      await fn();
      await reload();
      toast.success(success);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Action failed."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate() {
    setCreating(true);
    try {
      await createDesignChangeOrder(projectId, {
        reason: newReason.trim() || "Manual design / remake change",
        measurement_notes: {
          change_path: "full_remake",
          items: [],
        },
      });
      setNewReason("");
      await reload();
      toast.success("Design change created. Add required items.");
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Failed to create design change."));
    } finally {
      setCreating(false);
    }
  }

  async function saveItems(dco: DesignChangeOrder, items: DesignChangeItem[]) {
    const path = paths[dco.id] ?? changePath(dco) ?? "full_remake";
    await updateDesignChangeOrder(dco.id, {
      change_path: path as "full_remake" | "minor_material",
      items: items.map((item) => ({
        id: item.id,
        description: item.description,
        qty: item.qty,
        unit: item.unit,
        change_type: item.change_type === "material" ? "material" : "remake",
        done: item.done,
      })),
    });
  }

  async function addItem(dco: DesignChangeOrder) {
    const draft = drafts[dco.id] ?? emptyItem();
    if (!draft.description.trim()) {
      toast.error("Enter a description for the required change.");
      return;
    }
    const existing = changeItems(dco);
    const next: DesignChangeItem[] = [
      ...existing,
      {
        id: `local_${Date.now()}`,
        description: draft.description.trim(),
        qty: Number(draft.qty) || 1,
        unit: "each",
        change_type: draft.change_type,
        done: false,
      },
    ];
    await run(dco.id, () => saveItems(dco, next), "Item added.");
    setDrafts((prev) => ({ ...prev, [dco.id]: emptyItem() }));
  }

  async function removeItem(dco: DesignChangeOrder, itemId: string) {
    const next = changeItems(dco).filter((item) => item.id !== itemId);
    await run(dco.id, () => saveItems(dco, next), "Item removed.");
  }

  async function setPath(dco: DesignChangeOrder, path: "full_remake" | "minor_material") {
    setPaths((prev) => ({ ...prev, [dco.id]: path }));
    await run(
      dco.id,
      () =>
        updateDesignChangeOrder(dco.id, {
          change_path: path,
          items: changeItems(dco),
        }),
      path === "minor_material"
        ? "Path set to minor material change."
        : "Path set to full remake.",
    );
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading design changes…</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">New design change</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            List required remake or material items, then release to production. Choose full remake
            (start at cutting etc.) or minor material-only (mark done → transit → site).
          </p>
          <Textarea
            placeholder="Reason / summary (optional)"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
          />
          <Button size="sm" disabled={creating} onClick={() => void handleCreate()}>
            {creating ? "Creating…" : "Create design change"}
          </Button>
        </CardContent>
      </Card>

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No design change orders yet. Field misfits create one automatically, or add one above.
        </p>
      ) : null}

      {orders.map((dco) => {
        const items = changeItems(dco);
        const path = paths[dco.id] ?? changePath(dco);
        const draft = drafts[dco.id] ?? emptyItem();
        const editable = !["closed", "cancelled"].includes(String(dco.status));
        const released = ["materials_ready", "remake_in_production", "bom_revised"].includes(
          String(dco.status),
        );
        const startStage = startStages[dco.id] ?? "cutting";

        return (
          <Card key={dco.id}>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">DCO #{dco.id}</CardTitle>
                <p className="text-sm text-muted-foreground">{dco.reason ?? "—"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{String(dco.status).replace(/_/g, " ")}</Badge>
                {path ? (
                  <Badge variant="outline">
                    {path === "minor_material" ? "Minor material" : "Full remake"}
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>Parent PO: {dco.parent_production_order_id ?? "—"}</span>
                <span>
                  Remake PO:{" "}
                  {dco.remake_production_order ? (
                    <Link
                      href={`/production/orders/${dco.remake_production_order.id}`}
                      className="text-primary hover:underline"
                    >
                      {dco.remake_production_order.reference}
                    </Link>
                  ) : (
                    "—"
                  )}
                </span>
                <span>NC: {dco.field_non_conformity_id ?? "—"}</span>
              </div>

              {editable ? (
                <div className="space-y-2">
                  <Label>Change path</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={path === "full_remake" ? "default" : "outline"}
                      disabled={busyId === dco.id}
                      onClick={() => void setPath(dco, "full_remake")}
                    >
                      Full remake
                    </Button>
                    <Button
                      size="sm"
                      variant={path === "minor_material" ? "default" : "outline"}
                      disabled={busyId === dco.id}
                      onClick={() => void setPath(dco, "minor_material")}
                    >
                      Minor material only
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Full remake → production order (choose start stage). Minor → mark done, then
                    transit / on site.
                  </p>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>Required items / changes</Label>
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No items yet. Add what needs remaking or replacing.</p>
                ) : (
                  <div className="overflow-hidden rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">Item</th>
                          <th className="px-3 py-2 font-medium">Qty</th>
                          <th className="px-3 py-2 font-medium">Type</th>
                          {editable ? <th className="px-3 py-2 font-medium" /> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="px-3 py-2">{item.description}</td>
                            <td className="px-3 py-2">{item.qty}</td>
                            <td className="px-3 py-2 capitalize">{item.change_type}</td>
                            {editable ? (
                              <td className="px-3 py-2 text-right">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={busyId === dco.id}
                                  onClick={() => void removeItem(dco, item.id)}
                                >
                                  Remove
                                </Button>
                              </td>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {editable && !released ? (
                  <div className="grid gap-2 rounded border p-3 sm:grid-cols-[1fr_5rem_8rem_auto]">
                    <Input
                      placeholder="e.g. Replace top rail — Unit 2 / Door A1"
                      value={draft.description}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [dco.id]: { ...draft, description: e.target.value },
                        }))
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      value={draft.qty}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [dco.id]: { ...draft, qty: e.target.value },
                        }))
                      }
                    />
                    <select
                      className={selectCls}
                      value={draft.change_type}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [dco.id]: {
                            ...draft,
                            change_type: e.target.value as "remake" | "material",
                          },
                        }))
                      }
                    >
                      <option value="remake">Remake</option>
                      <option value="material">Material</option>
                    </select>
                    <Button
                      size="sm"
                      disabled={busyId === dco.id}
                      onClick={() => void addItem(dco)}
                    >
                      Add item
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {editable &&
                ["drafted", "awaiting_remeasure", "design_in_progress"].includes(String(dco.status)) ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === dco.id || items.length === 0 || !path}
                    onClick={() =>
                      void run(
                        dco.id,
                        () => releaseDesignChangeToProduction(dco.id),
                        "Released to production — choose remake or minor complete.",
                      )
                    }
                  >
                    No more items — release to production
                  </Button>
                ) : null}

                {(dco.status === "drafted" || dco.status === "awaiting_remeasure") &&
                path === "full_remake" ? (
                  <Button
                    size="sm"
                    disabled={busyId === dco.id}
                    onClick={() =>
                      void run(dco.id, () =>
                        approveDesignChangeOrder(dco.id, {
                          target_stage: "final_design_approval",
                        }),
                      )
                    }
                  >
                    Approve & rewind
                  </Button>
                ) : null}

                {path === "full_remake" &&
                !dco.remake_production_order_id &&
                !["closed", "cancelled", "drafted"].includes(String(dco.status)) ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className={selectCls + " w-44"}
                      value={startStage}
                      onChange={(e) =>
                        setStartStages((prev) => ({ ...prev, [dco.id]: e.target.value }))
                      }
                    >
                      {START_STAGES.map((stage) => (
                        <option key={stage.value} value={stage.value}>
                          Start: {stage.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      disabled={busyId === dco.id}
                      onClick={() =>
                        void run(
                          dco.id,
                          () =>
                            createDesignChangeRemake(dco.id, {
                              start_stage: startStage,
                            }),
                          "Remake PO created.",
                        )
                      }
                    >
                      Create remake PO
                    </Button>
                  </div>
                ) : null}

                {path === "minor_material" &&
                ["materials_ready", "bom_revised", "design_in_progress"].includes(
                  String(dco.status),
                ) ? (
                  <Button
                    size="sm"
                    disabled={busyId === dco.id}
                    onClick={() =>
                      void run(
                        dco.id,
                        () =>
                          completeMinorDesignChange(dco.id, {
                            advance_to_stage: "qc_pre_installation",
                          }),
                        "Minor change done — ready for QC / transit to site.",
                      )
                    }
                  >
                    Mark done → ready for transit
                  </Button>
                ) : null}

                {path === "minor_material" &&
                ["materials_ready", "bom_revised", "design_in_progress"].includes(
                  String(dco.status),
                ) ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === dco.id}
                    onClick={() =>
                      void run(
                        dco.id,
                        () => completeMinorDesignChange(dco.id, {}),
                        "Minor material change marked done.",
                      )
                    }
                  >
                    Mark done only
                  </Button>
                ) : null}

                {dco.status === "remake_in_production" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === dco.id}
                    onClick={() => void run(dco.id, () => closeDesignChangeOrder(dco.id))}
                  >
                    Close (after remake complete)
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
