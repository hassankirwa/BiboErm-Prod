"use client";

import { useState } from "react";
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

type CountRow = StockTakeSnapshotLine & { counted_qty: string };

function StockTakePageContent() {
  const { hasPermission } = useAuth();
  const canApply = hasPermission("warehouse.stocktake.run");
  const { locationTree } = useWarehouseFormOptions();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [deckSlug, setDeckSlug] = useState("all");
  const [sectionId, setSectionId] = useState("");
  const [binId, setBinId] = useState("");
  const [rows, setRows] = useState<CountRow[]>([]);
  const [variances, setVariances] = useState<StockTakeVarianceLine[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [movementId, setMovementId] = useState<number | null>(null);

  const loadSnapshot = async () => {
    setLoading(true);
    try {
      const res = await stockTakeSnapshot({
        deck: deckSlug !== "all" ? deckSlug : undefined,
        section_id: sectionId ? Number(sectionId) : undefined,
        bin_id: binId ? Number(binId) : undefined,
      });
      setRows(
        res.data.lines.map((line) => ({
          ...line,
          counted_qty: line.system_qty,
        })),
      );
      setStep(2);
      setVariances([]);
      setMovementId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load snapshot.");
    } finally {
      setLoading(false);
    }
  };

  const runVariance = async () => {
    setLoading(true);
    try {
      const res = await stockTakeVariance({
        lines: rows.map((r) => ({
          item_id: r.item_id,
          bin_id: r.bin_id,
          counted_qty: Number(r.counted_qty),
        })),
      });
      setVariances(res.data.lines);
      const hasAny = res.data.lines.some((l) => l.has_variance);
      if (!hasAny) {
        toast.info("No variances — counts match system.");
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
    setLoading(true);
    try {
      const res = await stockTakeApply({
        notes: notes || undefined,
        lines: rows.map((r) => ({
          item_id: r.item_id,
          bin_id: r.bin_id,
          counted_qty: Number(r.counted_qty),
        })),
      });
      setMovementId(res.data.id);
      toast.success("Stock-take adjustments applied.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to apply stock-take.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Stock take"
        subtitle="Snapshot, count, variance, and apply adjustments"
      />
      <div className="space-y-6 p-6">
        <div className="flex gap-2 text-sm">
          <BadgeStep n={1} active={step >= 1} label="Snapshot" />
          <BadgeStep n={2} active={step >= 2} label="Count" />
          <BadgeStep n={3} active={step >= 3} label="Apply" />
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1 — Scope</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                {loading ? "Loading…" : "Generate snapshot"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step >= 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2 — Physical counts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Bin</TableHead>
                      <TableHead>System</TableHead>
                      <TableHead>Counted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow key={`${row.item_id}-${row.bin_id}-${idx}`}>
                        <TableCell>{row.sku ?? row.item_id}</TableCell>
                        <TableCell>{row.bin_code}</TableCell>
                        <TableCell>{row.system_qty}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="h-8 w-24"
                            value={row.counted_qty}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, counted_qty: e.target.value } : r,
                                ),
                              )
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={runVariance} disabled={loading}>
                  Calculate variance
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step >= 3 && variances.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 3 — Variances</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-[240px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Variance</TableHead>
                      <TableHead>Direction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variances
                      .filter((v) => v.has_variance)
                      .map((v, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{v.sku}</TableCell>
                          <TableCell>{v.variance}</TableCell>
                          <TableCell>{v.direction}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
              <Textarea
                placeholder="Adjustment notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Button onClick={applyAdjustments} disabled={loading || !canApply}>
                Apply adjustments
              </Button>
              {movementId && (
                <p className="text-sm text-muted-foreground">
                  Movement recorded.{" "}
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
          You do not have permission to run stock-take.
        </div>
      }
    >
      <StockTakePageContent />
    </PermissionGuard>
  );
}
