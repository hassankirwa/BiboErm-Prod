"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getGoodsReceipt,
  type GoodsReceipt,
  updateGoodsReceiptLines,
  uploadGoodsReceiptAttachment,
  verifyGoodsReceipt,
} from "@/lib/api/procurement";
import { getLocationTree, flattenBinsFromLocationTree } from "@/lib/api/warehouse";
import { toast } from "sonner";

type EditableLine = {
  id: number;
  purchase_order_line_id: number;
  warehouse_item_id: number | null;
  description: string;
  qty_received: number;
  qty_accepted: number;
  qty_rejected: number;
  rejection_reason: string;
  to_bin_id: number | null;
  notes: string;
};

type AttachmentType =
  | "receipt_photo"
  | "invoice_photo"
  | "delivery_note"
  | "other_document";

const attachmentLabels: Record<AttachmentType, string> = {
  receipt_photo: "Receipt photo",
  invoice_photo: "Invoice photo",
  delivery_note: "Delivery note",
  other_document: "Other document",
};

export default function GoodsReceiptDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [grn, setGrn] = useState<GoodsReceipt | null>(null);
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [binOptions, setBinOptions] = useState<Array<{ id: number; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [notes, setNotes] = useState("");
  const [qualityNotes, setQualityNotes] = useState("");
  const [files, setFiles] = useState<Partial<Record<AttachmentType, File | null>>>({});

  const load = () => {
    setLoading(true);

    getGoodsReceipt(id)
      .then((grnRes) => {
        const data = grnRes.data;
        setGrn(data);
        setNotes(data.notes ?? "");
        setQualityNotes(data.quality_inspection_notes ?? "");
        setLines(
          (data.lines ?? []).map((line) => ({
            id: line.id,
            purchase_order_line_id: line.purchase_order_line_id,
            warehouse_item_id: line.warehouse_item_id,
            description:
              data.purchaseOrder?.lines?.find((poLine) => poLine.id === line.purchase_order_line_id)
                ?.description ?? `PO line #${line.purchase_order_line_id}`,
            qty_received: Number(line.qty_received),
            qty_accepted: Number(line.qty_accepted),
            qty_rejected: Number(line.qty_rejected),
            rejection_reason: line.rejection_reason ?? "",
            to_bin_id: line.to_bin_id,
            notes: line.notes ?? "",
          })),
        );
      })
      .catch((error: Error) => toast.error(error.message || "Failed to load goods receipt."))
      .finally(() => setLoading(false));

    getLocationTree()
      .then((locationRes) => setBinOptions(flattenBinsFromLocationTree(locationRes.data)))
      .catch(() => {
        setBinOptions([]);
      });
  };

  useEffect(() => {
    if (!Number.isFinite(id)) {
      return;
    }

    load();
  }, [id]);

  const attachmentTypes = useMemo(
    () => new Set((grn?.attachments ?? []).map((attachment) => attachment.type)),
    [grn],
  );

  const canVerify =
    lines.every((line) => {
      const balances = line.qty_accepted + line.qty_rejected === line.qty_received;
      const hasReason = line.qty_rejected === 0 || line.rejection_reason.trim().length > 0;
      return balances && hasReason;
    }) &&
    attachmentTypes.has("receipt_photo") &&
    attachmentTypes.has("invoice_photo");

  const saveLines = async () => {
    setSaving(true);
    try {
      await updateGoodsReceiptLines(id, {
        notes: notes || null,
        quality_inspection_notes: qualityNotes || null,
        lines: lines.map((line) => ({
          id: line.id,
          qty_received: line.qty_received,
          qty_accepted: line.qty_accepted,
          qty_rejected: line.qty_rejected,
          rejection_reason: line.rejection_reason || null,
          to_bin_id: line.to_bin_id,
          notes: line.notes || null,
        })),
      });
      toast.success("GRN updated.");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update GRN.");
    } finally {
      setSaving(false);
    }
  };

  const upload = async (type: AttachmentType) => {
    const file = files[type];

    if (!file) {
      toast.error("Choose a file first.");
      return;
    }

    try {
      await uploadGoodsReceiptAttachment(id, { file, type });
      toast.success(`${attachmentLabels[type]} uploaded.`);
      setFiles((current) => ({ ...current, [type]: null }));
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    }
  };

  const runVerify = async () => {
    setVerifying(true);
    try {
      await verifyGoodsReceipt(id);
      toast.success("GRN verified. Stock will be updated on warehouse putaway.");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title={grn?.grn_number ?? "Goods Receipt"}
        subtitle="Log quantities, quality checks, documents, then verify to update stock"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/procurement/goods-receipts">Receiving logs</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/warehouse/receive?grn=${id}`}>Put away stock</Link>
            </Button>
            <Button size="sm" disabled={!canVerify || verifying || grn?.status === "verified"} onClick={runVerify}>
              {verifying ? "Verifying..." : "Verify & update stock"}
            </Button>
          </div>
        }
      />
      <div className="space-y-6 p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading goods receipt…</p>
        ) : grn ? (
          <>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge variant="secondary">{grn.status}</Badge>
              <span>
                PO: <strong>{grn.purchaseOrder?.reference ?? `#${grn.purchase_order_id}`}</strong>
              </span>
              <span>
                Supplier: <strong>{grn.purchaseOrder?.supplier?.name ?? "—"}</strong>
              </span>
              <span>Received: {new Date(grn.received_at).toLocaleString()}</span>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
              <Card>
                <CardHeader>
                  <CardTitle>Received lines</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {lines.map((line, index) => (
                    <div key={line.id} className="rounded-lg border p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{line.description}</p>
                          <p className="text-xs text-muted-foreground">
                            Item {line.warehouse_item_id ?? "n/a"} · PO line #{line.purchase_order_line_id}
                          </p>
                        </div>
                        <Badge variant="secondary">Line {index + 1}</Badge>
                      </div>
                      <div className="grid gap-3 md:grid-cols-4">
                        <Input
                          type="number"
                          placeholder="Qty received"
                          value={line.qty_received}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((entry) =>
                                entry.id === line.id
                                  ? { ...entry, qty_received: Number(event.target.value) }
                                  : entry,
                              ),
                            )
                          }
                        />
                        <Input
                          type="number"
                          placeholder="Qty accepted"
                          value={line.qty_accepted}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((entry) =>
                                entry.id === line.id
                                  ? { ...entry, qty_accepted: Number(event.target.value) }
                                  : entry,
                              ),
                            )
                          }
                        />
                        <Input
                          type="number"
                          placeholder="Qty rejected"
                          value={line.qty_rejected}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((entry) =>
                                entry.id === line.id
                                  ? { ...entry, qty_rejected: Number(event.target.value) }
                                  : entry,
                              ),
                            )
                          }
                        />
                        <select
                          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                          value={line.to_bin_id ?? ""}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((entry) =>
                                entry.id === line.id
                                  ? {
                                      ...entry,
                                      to_bin_id: event.target.value ? Number(event.target.value) : null,
                                    }
                                  : entry,
                              ),
                            )
                          }
                        >
                          <option value="">Select putaway bin</option>
                          {binOptions.map((bin) => (
                            <option key={bin.id} value={bin.id}>
                              {bin.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <Input
                          placeholder="Rejection reason"
                          value={line.rejection_reason}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((entry) =>
                                entry.id === line.id
                                  ? { ...entry, rejection_reason: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                        />
                        <Input
                          placeholder="Quality / line notes"
                          value={line.notes}
                          onChange={(event) =>
                            setLines((current) =>
                              current.map((entry) =>
                                entry.id === line.id ? { ...entry, notes: event.target.value } : entry,
                              ),
                            )
                          }
                        />
                      </div>
                    </div>
                  ))}

                  <Textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="General receiving notes"
                  />
                  <Textarea
                    value={qualityNotes}
                    onChange={(event) => setQualityNotes(event.target.value)}
                    placeholder="Quality inspection notes"
                  />
                  <Button onClick={saveLines} disabled={saving}>
                    {saving ? "Saving..." : "Save updates"}
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Verification checklist</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>Receipt photo: {attachmentTypes.has("receipt_photo") ? "Uploaded" : "Missing"}</p>
                    <p>Invoice photo: {attachmentTypes.has("invoice_photo") ? "Uploaded" : "Missing"}</p>
                    <p>
                      Qty balances valid:{" "}
                      {lines.every((line) => line.qty_accepted + line.qty_rejected === line.qty_received)
                        ? "Yes"
                        : "No"}
                    </p>
                    <p>
                      Rejection reasons complete:{" "}
                      {lines.every((line) => line.qty_rejected === 0 || line.rejection_reason.trim())
                        ? "Yes"
                        : "No"}
                    </p>
                  </CardContent>
                </Card>

                {(Object.keys(attachmentLabels) as AttachmentType[]).map((type) => (
                  <Card key={type}>
                    <CardHeader>
                      <CardTitle className="text-base">{attachmentLabels[type]}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Input
                        type="file"
                        accept="image/*,application/pdf"
                        capture={type.includes("photo") ? "environment" : undefined}
                        onChange={(event) =>
                          setFiles((current) => ({
                            ...current,
                            [type]: event.target.files?.[0] ?? null,
                          }))
                        }
                      />
                      <Button size="sm" variant="outline" onClick={() => void upload(type)}>
                        Upload {attachmentLabels[type].toLowerCase()}
                      </Button>
                      {(grn.attachments ?? [])
                        .filter((attachment) => attachment.type === type)
                        .map((attachment) => (
                          <p key={attachment.id} className="text-xs text-muted-foreground">
                            {attachment.original_filename ?? attachment.path}
                          </p>
                        ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">GRN not found.</p>
        )}
      </div>
    </div>
  );
}
