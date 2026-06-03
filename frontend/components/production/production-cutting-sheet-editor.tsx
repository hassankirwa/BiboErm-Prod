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
import { toast } from "sonner";

type Props = {
  orderId: number;
  lines: CuttingSheetLine[];
  canEdit: boolean;
  onUpdated: () => void;
};

export function ProductionCuttingSheetEditor({
  orderId,
  lines,
  canEdit,
  onUpdated,
}: Props) {
  const [editing, setEditing] = useState<CuttingSheetLine | null>(null);
  const [cutLength, setCutLength] = useState("");
  const [pieces, setPieces] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  function openEdit(line: CuttingSheetLine) {
    setEditing(line);
    setCutLength(String(line.cut_length_mm));
    setPieces(String(line.pieces));
    setReason("");
  }

  async function handleSave() {
    if (!editing) return;
    if (!reason.trim()) {
      toast.error("Reason is required for manual edits");
      return;
    }
    setLoading(true);
    try {
      await updateCuttingSheetLine(orderId, editing.id, {
        cut_length_mm: Number(cutLength),
        pieces: Number(pieces),
        reason: reason.trim(),
      });
      toast.success("Cutting line updated");
      setEditing(null);
      onUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update line");
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
            {canEdit && <th />}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className="border-t border-border">
              <td className="py-2">{line.profile_code}</td>
              <td>{line.cut_length_mm}</td>
              <td>{line.pieces}</td>
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
            <DialogTitle>Edit cutting line</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Cut length (mm)</Label>
              <Input value={cutLength} onChange={(e) => setCutLength(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Pieces</Label>
              <Input value={pieces} onChange={(e) => setPieces(e.target.value)} />
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
