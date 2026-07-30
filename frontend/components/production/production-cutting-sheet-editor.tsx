"use client";

import { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  updateCuttingSheetLine,
  type CuttingSheetLine,
} from "@/lib/api/production";
import { getApiErrorMessage } from "@/lib/api/errors";
import { toast } from "sonner";

function cutLengthsForLine(line: CuttingSheetLine): number[] {
  if (line.cuts && line.cuts.length > 0) {
    return line.cuts.map((cut) => cut.length_mm);
  }
  return Array.from({ length: Math.max(1, line.pieces) }, () => line.cut_length_mm);
}

function summarizeCutLengths(lengths: number[]): Array<{ length_mm: number; count: number }> {
  const counts = new Map<number, number>();
  for (const lengthMm of lengths) {
    counts.set(lengthMm, (counts.get(lengthMm) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([length_mm, count]) => ({ length_mm, count }));
}

type Props = {
  orderId: number;
  lines: CuttingSheetLine[];
  canEdit: boolean;
  onLineUpdated: (line: CuttingSheetLine) => void;
};

function parsePositiveInt(value: string, label: string): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
    toast.error(`${label} must be a whole number greater than 0`);
    return null;
  }
  return n;
}

function parseOptionalNonNegativeInt(value: string, label: string): number | null | undefined {
  if (value.trim() === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    toast.error(`${label} must be a whole number of 0 or more`);
    return undefined;
  }
  return n;
}

function neededMm(cutLength: number, pieces: number): number {
  return cutLength * pieces;
}

export function ProductionCuttingSheetEditor({
  orderId,
  lines,
  canEdit,
  onLineUpdated,
}: Props) {
  const [editing, setEditing] = useState<CuttingSheetLine | null>(null);
  const [viewing, setViewing] = useState<CuttingSheetLine | null>(null);
  const [barLength, setBarLength] = useState("");
  const [wasteMm, setWasteMm] = useState("");
  const [reason, setReason] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  const editPreview = useMemo(() => {
    const bar = Number(barLength);
    const waste = Number(wasteMm);
    const needed = editing?.planned_used_mm ?? editing?.needed_mm ?? null;
    const expected = editing?.expected_bar_length_mm ?? null;
    const barOk = Number.isFinite(bar) && bar > 0;
    const cutsExceedBar = barOk && needed != null && needed > bar;
    const wasteExceedsBar =
      barOk &&
      needed != null &&
      Number.isFinite(waste) &&
      wasteMm.trim() !== "" &&
      needed + waste > bar;
    const suggestedWaste = barOk && needed != null && needed <= bar ? bar - needed : null;

    return {
      needed,
      expected,
      cutsExceedBar,
      wasteExceedsBar,
      suggestedWaste,
    };
  }, [barLength, editing?.expected_bar_length_mm, editing?.needed_mm, editing?.planned_used_mm, wasteMm]);

  function openEdit(line: CuttingSheetLine) {
    const bar =
      line.bar_length_mm != null
        ? line.bar_length_mm
        : line.expected_bar_length_mm;
    const usedMm = line.planned_used_mm ?? line.needed_mm;
    const suggested = usedMm <= bar ? bar - usedMm : null;

    setEditing(line);
    setBarLength(String(bar));
    if (line.waste_mm != null) {
      setWasteMm(String(line.waste_mm));
    } else if (suggested != null) {
      setWasteMm(String(suggested));
    } else {
      setWasteMm("");
    }
    setReason("");
  }

  function handleSave() {
    if (!editing) return;
    const bar = parsePositiveInt(barLength, "Bar length");
    const waste = parseOptionalNonNegativeInt(wasteMm, "Waste");
    if (bar === undefined || waste === undefined) return;

    const usedMm = editing.planned_used_mm ?? editing.needed_mm;
    if (usedMm > bar) {
      toast.error(
        `Planned cuts (${usedMm} mm) cannot exceed bar length (${bar} mm).`,
      );
      return;
    }
    if (waste != null && usedMm + waste > bar) {
      toast.error(`Planned cuts plus waste cannot exceed bar length (${bar} mm).`);
      return;
    }

    const previous = editing;
    const optimistic: CuttingSheetLine = {
      ...previous,
      bar_length_mm: bar,
      waste_mm: waste,
    };

    onLineUpdated(optimistic);
    setEditing(null);
    setSavingId(previous.id);

    void updateCuttingSheetLine(orderId, previous.id, {
      bar_length_mm: bar,
      waste_mm: waste,
      reason: reason.trim() || undefined,
    })
      .then((res) => {
        onLineUpdated({
          ...optimistic,
          ...res.data,
          needed_mm: res.data.needed_mm ?? optimistic.needed_mm,
          expected_bar_length_mm:
            res.data.expected_bar_length_mm ?? optimistic.expected_bar_length_mm,
        });
      })
      .catch((err) => {
        onLineUpdated(previous);
        toast.error(getApiErrorMessage(err, "Failed to update line"));
      })
      .finally(() => {
        setSavingId((current) => (current === previous.id ? null : current));
      });
  }

  if (lines.length === 0) {
    return <p className="text-sm text-muted-foreground">No cutting lines yet.</p>;
  }

  const sortedLines = [...lines].sort((a, b) => {
    const profileComparison = a.profile_code.localeCompare(b.profile_code, undefined, {
      numeric: true,
      sensitivity: "base",
    });

    return profileComparison !== 0
      ? profileComparison
      : (a.bar_number ?? 1) - (b.bar_number ?? 1);
  });
  const profileGroupIndexes = new Map<string, number>();
  let groupIndex = 0;
  for (const line of sortedLines) {
    const key = line.profile_code.trim().toUpperCase();
    if (!profileGroupIndexes.has(key)) {
      profileGroupIndexes.set(key, groupIndex++);
    }
  }

  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="pb-2">Profile</th>
            <th>Cuts on bar (mm)</th>
            <th>Pieces</th>
            <th>Used (mm)</th>
            <th>Expected bar</th>
            <th>Bar (mm)</th>
            <th>Waste (mm)</th>
            <th>Status</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedLines.map((line) => {
            const profileGroupIndex =
              profileGroupIndexes.get(line.profile_code.trim().toUpperCase()) ?? 0;
            const profileGroupClass =
              profileGroupIndex % 2 === 0
                ? "bg-orange-50/60 dark:bg-orange-950/15"
                : "bg-background";
            const needed = line.needed_mm ?? neededMm(line.cut_length_mm, line.pieces);
            const expected = line.expected_bar_length_mm;
            const lengths = cutLengthsForLine(line);
            const plannedCuts = lengths.join(" + ");
            const cutExceeds =
              line.bar_length_mm != null && needed > line.bar_length_mm;
            const wasteExceeds =
              line.bar_length_mm != null &&
              line.waste_mm != null &&
              needed + line.waste_mm > line.bar_length_mm;
            const isSaving = savingId === line.id;
            const isSaved =
              !isSaving &&
              line.bar_length_mm != null &&
              line.waste_mm != null &&
              !cutExceeds &&
              !wasteExceeds;

            return (
              <tr
                key={line.id}
                className={`border-t border-border ${profileGroupClass} ${
                  isSaving ? "opacity-60" : ""
                }`}
              >
                <td className="py-2">
                  {line.profile_code}
                  <span className="block text-xs text-muted-foreground">
                    Bar {line.bar_number ?? 1}
                  </span>
                </td>
                <td className="max-w-[14rem]">
                  <span className="block truncate" title={plannedCuts}>
                    {plannedCuts}
                  </span>
                </td>
                <td>{lengths.length}</td>
                <td>{needed}</td>
                <td>{expected ?? "—"}</td>
                <td className={cutExceeds || wasteExceeds ? "text-destructive" : undefined}>
                  {line.bar_length_mm ?? "—"}
                </td>
                <td className={wasteExceeds ? "text-destructive" : undefined}>
                  {line.waste_mm ?? "—"}
                </td>
                <td className="text-xs">
                  {isSaving ? (
                    <span className="text-muted-foreground">Saving…</span>
                  ) : isSaved ? (
                    <span className="text-success">
                      Saved
                      {line.waste_mm != null && line.waste_mm > 0
                        ? ` · offcut ${line.waste_mm} mm`
                        : ""}
                    </span>
                  ) : cutExceeds || wasteExceeds ? (
                    <span className="text-destructive">Fix bar/waste</span>
                  ) : (
                    <span className="text-muted-foreground">Incomplete</span>
                  )}
                </td>
                <td className="text-right">
                  <div className="inline-flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      aria-label={`View cuts for ${line.profile_code} bar ${line.bar_number ?? 1}`}
                      onClick={() => setViewing(line)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canEdit ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isSaving}
                        onClick={() => openEdit(line)}
                      >
                        Edit
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {viewing?.profile_code} · Bar {viewing?.bar_number ?? 1}
            </DialogTitle>
          </DialogHeader>
          {viewing ? (
            <CuttingBarCutsView line={viewing} />
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>
              Close
            </Button>
            {canEdit && viewing ? (
              <Button
                onClick={() => {
                  const line = viewing;
                  setViewing(null);
                  openEdit(line);
                }}
              >
                Edit bar
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit cutting line — {editing?.profile_code}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Expected bar for this profile:{" "}
              <span className="font-medium text-foreground">
                {editPreview.expected ?? "—"} mm
              </span>
              {editPreview.needed != null && (
                <>
                  {" "}
                  · Planned cuts:{" "}
                  <span className="font-medium text-foreground">
                    {editPreview.needed} mm
                  </span>
                </>
              )}
            </p>
            <div className="rounded-md border border-border p-3">
              {editing ? <CuttingBarCutsView line={editing} compact /> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Bar length (mm)</Label>
                <Input
                  type="number"
                  min={1}
                  value={barLength}
                  onChange={(e) => setBarLength(e.target.value)}
                  placeholder={
                    editPreview.expected != null
                      ? String(editPreview.expected)
                      : "Required to complete"
                  }
                />
                {editPreview.cutsExceedBar && (
                  <p className="text-xs text-destructive">
                    Planned cuts cannot exceed bar length.
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Waste (mm)</Label>
                <Input
                  type="number"
                  min={0}
                  value={wasteMm}
                  onChange={(e) => {
                    setWasteMm(e.target.value);
                  }}
                  placeholder="Auto from bar − needed"
                />
                {editPreview.wasteExceedsBar && (
                  <p className="text-xs text-destructive">
                    Waste cannot exceed bar length.
                  </p>
                )}
                {!editPreview.wasteExceedsBar &&
                  editPreview.suggestedWaste != null && (
                    <p className="text-xs text-muted-foreground">
                      Auto-filled: bar − needed = {editPreview.suggestedWaste} mm
                    </p>
                  )}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Reason (optional)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional note for this edit"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSave}
              disabled={
                editPreview.cutsExceedBar || editPreview.wasteExceedsBar
              }
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CuttingBarCutsView({
  line,
  compact = false,
}: {
  line: CuttingSheetLine;
  compact?: boolean;
}) {
  const lengths = cutLengthsForLine(line);
  const summary = summarizeCutLengths(lengths);
  const usedMm = line.planned_used_mm ?? line.needed_mm ?? lengths.reduce((a, b) => a + b, 0);
  const barMm = line.bar_length_mm ?? line.expected_bar_length_mm ?? 6000;
  const wasteMm = line.waste_mm ?? Math.max(0, barMm - usedMm);
  const usedPct = Math.min(100, Math.round((usedMm / Math.max(1, barMm)) * 100));
  const wastePct = Math.max(0, 100 - usedPct);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-md bg-muted/60 px-2 py-2">
          <p className="text-xs text-muted-foreground">Cuts</p>
          <p className="font-medium">{lengths.length}</p>
        </div>
        <div className="rounded-md bg-muted/60 px-2 py-2">
          <p className="text-xs text-muted-foreground">Used</p>
          <p className="font-medium">{usedMm} mm</p>
        </div>
        <div className="rounded-md bg-muted/60 px-2 py-2">
          <p className="text-xs text-muted-foreground">Waste</p>
          <p className="font-medium">{wasteMm} mm</p>
        </div>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>Bar {barMm} mm</span>
          <span>
            {usedPct}% used · {wastePct}% remnant
          </span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-muted">
          <div className="bg-primary/80" style={{ width: `${usedPct}%` }} />
          <div className="bg-amber-300/80" style={{ width: `${wastePct}%` }} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">
          {compact ? "Cut lengths" : "All cut lengths on this bar"}
        </p>
        <div className="flex flex-wrap gap-2">
          {summary.map((row) => (
            <span
              key={row.length_mm}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-sm"
            >
              <span className="font-medium">{row.length_mm} mm</span>
              <span className="text-xs text-muted-foreground">× {row.count}</span>
            </span>
          ))}
        </div>
      </div>

      {!compact && (
        <div>
          <p className="mb-2 text-sm font-medium">Cut sequence</p>
          <ol className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2 text-sm">
            {lengths.map((lengthMm, index) => (
              <li
                key={`${lengthMm}-${index}`}
                className="flex items-center justify-between border-b border-border/60 py-1 last:border-b-0"
              >
                <span className="text-muted-foreground">Cut {index + 1}</span>
                <span className="font-medium">{lengthMm} mm</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
