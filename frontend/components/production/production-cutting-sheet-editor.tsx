"use client";

import { useState } from "react";
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

type Props = {
  orderId: number;
  lines: CuttingSheetLine[];
  canEdit: boolean;
  onUpdated: () => void;
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

export function ProductionCuttingSheetEditor({
  orderId,
  lines,
  canEdit,
  onUpdated,
}: Props) {
  const [editing, setEditing] = useState<CuttingSheetLine | null>(null);
  const [cutLength, setCutLength] = useState("");
  const [pieces, setPieces] = useState("");
  const [barLength, setBarLength] = useState("");
  const [wasteMm, setWasteMm] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  function openEdit(line: CuttingSheetLine) {
    setEditing(line);
    setCutLength(String(line.cut_length_mm));
    setPieces(String(line.pieces));
    setBarLength(line.bar_length_mm != null ? String(line.bar_length_mm) : "");
    setWasteMm(line.waste_mm != null ? String(line.waste_mm) : "");
    setReason("");
  }

  async function handleSave() {
    if (!editing) return;
    if (!reason.trim()) {
      toast.error("Reason is required for manual edits");
      return;
    }
    const cutLengthMm = parsePositiveInt(cutLength, "Cut length");
    const piecesCount = parsePositiveInt(pieces, "Pieces");
    if (cutLengthMm === null || piecesCount === null) return;

    const bar = parseOptionalNonNegativeInt(barLength, "Bar length");
    const waste = parseOptionalNonNegativeInt(wasteMm, "Waste");
    if (bar === undefined || waste === undefined) return;

    setLoading(true);
    try {
      await updateCuttingSheetLine(orderId, editing.id, {
        cut_length_mm: cutLengthMm,
        pieces: piecesCount,
        bar_length_mm: bar,
        waste_mm: waste,
        reason: reason.trim(),
      });
      toast.success("Cutting line updated");
      setEditing(null);
      onUpdated();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update line"));
    } finally {
      setLoading(false);
    }
  }

  if (lines.length === 0) {
    return <p className="text-sm text-muted-foreground">No cutting lines yet.</p>;
  }

  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="pb-2">Profile</th>
            <th>Length (mm)</th>
            <th>Pieces</th>
            <th>Bar (mm)</th>
            <th>Waste (mm)</th>
            {canEdit && <th />}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className="border-t border-border">
              <td className="py-2">{line.profile_code}</td>
              <td>{line.cut_length_mm}</td>
              <td>{line.pieces}</td>
              <td>{line.bar_length_mm ?? "—"}</td>
              <td>{line.waste_mm ?? "—"}</td>
              {canEdit && (
                <td className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(line)}>
                    Edit
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit cutting line — {editing?.profile_code}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Cut length (mm)</Label>
              <Input
                type="number"
                min={1}
                value={cutLength}
                onChange={(e) => setCutLength(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Pieces</Label>
              <Input
                type="number"
                min={1}
                value={pieces}
                onChange={(e) => setPieces(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Bar length (mm)</Label>
                <Input
                  type="number"
                  min={0}
                  value={barLength}
                  onChange={(e) => setBarLength(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1">
                <Label>Waste (mm)</Label>
                <Input
                  type="number"
                  min={0}
                  value={wasteMm}
                  onChange={(e) => setWasteMm(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Reason (required)</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={loading}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
