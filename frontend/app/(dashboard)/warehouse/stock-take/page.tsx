"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { WarehouseLocationCascade } from "@/components/warehouse/warehouse-location-cascade";
import { useWarehouseFormOptions } from "@/components/warehouse/use-warehouse-form-options";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  stockTakeApply,
  stockTakeSnapshot,
  stockTakeVariance,
  type StockTakeSnapshotLine,
  type StockTakeVarianceLine,
} from "@/lib/api/warehouse";
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

type CountRow = StockTakeSnapshotLine & {
  counted_qty: string;
  variance_reason: string;
};

const CATEGORY_OPTIONS = [
  { value: "all", label: "All categories (stocked bins only)" },
  { value: "aluminium_profile", label: "Aluminium Profiles" },
  { value: "accessory", label: "Accessories" },
  { value: "rubber", label: "Rubbers & Gaskets" },
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  aluminium_profile: "Aluminium Profiles",
  accessory: "Accessories",
  rubber: "Rubbers & Gaskets",
  other: "Other",
};

function StockTakePageContent() {
  const { hasPermission } = useAuth();
  const canApply = hasPermission("warehouse.stocktake.run");
  const { locationTree } = useWarehouseFormOptions();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState("accessory");
  const [deckSlug, setDeckSlug] = useState("all");
  const [sectionId, setSectionId] = useState("");
  const [binId, setBinId] = useState("");
  const [rows, setRows] = useState<CountRow[]>([]);
  const [variances, setVariances] = useState<StockTakeVarianceLine[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [movementId, setMovementId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const groupedRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? rows.filter(
          (row) =>
            (row.sku ?? "").toLowerCase().includes(q) ||
            (row.item_name ?? "").toLowerCase().includes(q) ||
            (row.bin_code ?? "").toLowerCase().includes(q),
        )
      : rows;

    const groups: Record<string, CountRow[]> = {};
    for (const row of filtered) {
      const key = row.category ?? "other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [rows, search]);

  const varianceRows = useMemo(
    () => variances.filter((line) => line.has_variance),
    [variances],
  );

  const missingReasons = useMemo(() => {
    return varianceRows.filter((line) => {
      const match = rows.find(
        (row) => row.item_id === line.item_id && row.bin_id === line.bin_id,
      );
      return !match?.variance_reason.trim();
    });
  }, [varianceRows, rows]);

  const loadSnapshot = async () => {
    setLoading(true);
    try {
      const res = await stockTakeSnapshot({
        category: category !== "all" ? category : undefined,
        deck: deckSlug !== "all" ? deckSlug : undefined,
        section_id: sectionId ? Number(sectionId) : undefined,
        bin_id: binId ? Number(binId) : undefined,
      });
      if (res.data.lines.length === 0) {
        toast.info("No items found for this scope.");
        return;
      }
      setRows(
        res.data.lines.map((line) => ({
          ...line,
          counted_qty: line.system_qty,
          variance_reason: "",
        })),
      );
      setStep(2);
      setVariances([]);
      setMovementId(null);
      toast.success(`Loaded ${res.data.line_count} item(s) for counting.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load snapshot.");
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (idx: number, patch: Partial<CountRow>) => {
    setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const toPayload = () =>
    rows.map((row) => ({
      item_id: row.item_id,
      bin_id: row.bin_id,
      counted_qty: Number(row.counted_qty),
      variance_reason: row.variance_reason.trim() || undefined,
    }));

  const runVariance = async () => {
    setLoading(true);
    try {
      const res = await stockTakeVariance({ lines: toPayload() });
      setVariances(res.data.lines);
      const hasAny = res.data.lines.some((line) => line.has_variance);
      if (!hasAny) {
        toast.info("No variances — counts match system stock.");
      } else {
        toast.message(
          `${res.data.summary.lines_with_variance} variance(s) found. Enter a reason for each before applying.`,
        );
      }
      setStep(3);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to calculate variance.");
    } finally {
      setLoading(false);
    }
  };

  const applyAdjustments = async () => {
    if (!canApply) {
      toast.error("You do not have permission to apply stock-take.");
      return;
    }
    if (missingReasons.length > 0) {
      toast.error("Enter a variance reason for every line that differs from system stock.");
      return;
    }
    setLoading(true);
    try {
      const res = await stockTakeApply({
        notes: notes || undefined,
        lines: toPayload(),
      });
      setMovementId(res.data.id);
      toast.success("Stock check reconciliation applied.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to apply stock-take.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Stock check"
        subtitle="List items by category, enter physical counts, and reconcile variances with a reason"
      />
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap gap-2 text-sm">
          <BadgeStep n={1} active={step >= 1} label="Scope" />
          <BadgeStep n={2} active={step >= 2} label="Count" />
          <BadgeStep n={3} active={step >= 3} label="Reconcile" />
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1 — Choose category & location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 max-w-sm">
                <label className="text-sm font-medium">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Pick a category to list all available catalog items for that
                  category (including zero-stock defaults). Location filters are
                  optional.
                </p>
              </div>
              <WarehouseLocationCascade
                locationTree={locationTree}
                deckSlug={deckSlug}
                sectionId={sectionId}
                binId={binId}
                onDeckSlugChange={setDeckSlug}
                onSectionChange={setSectionId}
                onBinChange={setBinId}
              />
              <Button onClick={loadSnapshot} disabled={loading}>
                {loading ? "Loading…" : "Load items for count"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step >= 2 && (
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
              <CardTitle>Step 2 — Physical counts ({rows.length})</CardTitle>
              <Input
                className="h-9 max-w-xs"
                placeholder="Filter SKU, name, or bin…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </CardHeader>
            <CardContent className="space-y-6">
              {groupedRows.map(([cat, catRows]) => (
                <div key={cat} className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    {CATEGORY_LABELS[cat] ?? cat}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({catRows.length})
                    </span>
                  </h3>
                  <div className="max-h-[420px] overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>Bin</TableHead>
                          <TableHead>System</TableHead>
                          <TableHead>Counted</TableHead>
                          <TableHead className="min-w-[200px]">
                            Variance reason
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {catRows.map((row) => {
                          const idx = rows.findIndex(
                            (r) =>
                              r.item_id === row.item_id && r.bin_id === row.bin_id,
                          );
                          const differs =
                            Number(row.counted_qty) !== Number(row.system_qty);
                          return (
                            <TableRow key={`${row.item_id}-${row.bin_id}`}>
                              <TableCell className="font-mono text-xs">
                                {row.sku ?? row.item_id}
                              </TableCell>
                              <TableCell className="max-w-[180px] truncate">
                                {row.item_name}
                              </TableCell>
                              <TableCell>
                                {row.bin_code}
                                {row.is_synthetic ? (
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    (new)
                                  </span>
                                ) : null}
                              </TableCell>
                              <TableCell>{row.system_qty}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={0}
                                  step="any"
                                  className="h-8 w-28"
                                  value={row.counted_qty}
                                  onChange={(e) =>
                                    updateRow(idx, { counted_qty: e.target.value })
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  className="h-8"
                                  placeholder={
                                    differs ? "Required if variance" : "—"
                                  }
                                  disabled={!differs}
                                  value={row.variance_reason}
                                  onChange={(e) =>
                                    updateRow(idx, {
                                      variance_reason: e.target.value,
                                    })
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={runVariance} disabled={loading || rows.length === 0}>
                  Calculate variance
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step >= 3 && (
          <Card>
            <CardHeader>
              <CardTitle>
                Step 3 — Reconcile
                {varianceRows.length > 0
                  ? ` (${varianceRows.length} variance${varianceRows.length === 1 ? "" : "s"})`
                  : " (no variances)"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {varianceRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Physical counts match system quantities. No adjustments needed.
                </p>
              ) : (
                <>
                  <div className="max-h-[280px] overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Bin</TableHead>
                          <TableHead>System</TableHead>
                          <TableHead>Counted</TableHead>
                          <TableHead>Variance</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {varianceRows.map((v) => {
                          const match = rows.find(
                            (r) => r.item_id === v.item_id && r.bin_id === v.bin_id,
                          );
                          const reason = match?.variance_reason ?? "";
                          return (
                            <TableRow key={`${v.item_id}-${v.bin_id}`}>
                              <TableCell>
                                <div className="font-mono text-xs">{v.sku}</div>
                                <div className="text-xs text-muted-foreground">
                                  {v.item_name}
                                </div>
                              </TableCell>
                              <TableCell>{v.bin_code}</TableCell>
                              <TableCell>{v.system_qty}</TableCell>
                              <TableCell>{v.counted_qty}</TableCell>
                              <TableCell
                                className={
                                  v.direction === "decrease"
                                    ? "text-destructive"
                                    : "text-emerald-700"
                                }
                              >
                                {v.variance}
                              </TableCell>
                              <TableCell>
                                <Input
                                  className="h-8 min-w-[180px]"
                                  placeholder="Why does this differ?"
                                  value={reason}
                                  onChange={(e) => {
                                    setRows((prev) =>
                                      prev.map((r) =>
                                        r.item_id === v.item_id &&
                                        r.bin_id === v.bin_id
                                          ? {
                                              ...r,
                                              variance_reason: e.target.value,
                                            }
                                          : r,
                                      ),
                                    );
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {missingReasons.length > 0 && (
                    <p className="text-sm text-destructive">
                      {missingReasons.length} variance
                      {missingReasons.length === 1 ? "" : "s"} still need a reason.
                    </p>
                  )}
                  <Textarea
                    placeholder="Optional overall notes for this stock check"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <Button
                    onClick={applyAdjustments}
                    disabled={
                      loading || !canApply || missingReasons.length > 0 || !!movementId
                    }
                  >
                    Apply reconciliation
                  </Button>
                </>
              )}
              {movementId && (
                <p className="text-sm text-muted-foreground">
                  Adjustment recorded (#{movementId}).{" "}
                  <Link href="/warehouse/movements" className="text-primary underline">
                    View movements
                  </Link>
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function BadgeStep({
  n,
  active,
  label,
}: {
  n: number;
  active: boolean;
  label: string;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
    >
      {n}. {label}
    </span>
  );
}

export default function WarehouseStockTakePage() {
  return (
    <PermissionGuard
      permissions={["warehouse.stocktake.view"]}
      fallback={
        <div className="p-6 text-sm text-muted-foreground">
          You do not have permission to run stock check.
        </div>
      }
    >
      <StockTakePageContent />
    </PermissionGuard>
  );
}
