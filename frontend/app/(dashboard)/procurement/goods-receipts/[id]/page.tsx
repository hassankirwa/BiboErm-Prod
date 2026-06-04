"use client";



import Link from "next/link";

import { useParams } from "next/navigation";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AppHeader } from "@/components/app-header";
import { GrnQcLink } from "@/components/procurement/grn-qc-link";

import { Button } from "@/components/ui/button";

import {

  GoodsReceiptReceivingDetail,

  type EditableGrnLine,

  type GrnAttachmentType,

} from "@/components/procurement/goods-receipt-receiving-detail";

import {

  getGoodsReceipt,

  type GoodsReceipt,

  updateGoodsReceiptLines,

  uploadGoodsReceiptAttachment,

  verifyGoodsReceipt,

} from "@/lib/api/procurement";

import {

  getLocationTree,

  listWarehouseItems,

  type WarehouseItem,

  type WarehouseLocationTree,

} from "@/lib/api/warehouse";

import { toast } from "sonner";



function mapGrnLines(data: GoodsReceipt): EditableGrnLine[] {

  return (data.lines ?? []).map((line) => {

    const poLine = data.purchaseOrder?.lines?.find(

      (entry) => entry.id === line.purchase_order_line_id,

    );



    return {

      id: line.id,

      purchase_order_line_id: line.purchase_order_line_id,

      warehouse_item_id: line.warehouse_item_id ?? poLine?.warehouse_item_id ?? null,

      warehouse_item_category:

        (line.warehouse_item_category as string | null | undefined) ?? null,

      is_procurement_only: Boolean(line.is_procurement_only),

      description: poLine?.description ?? `PO line #${line.purchase_order_line_id}`,

      qty_received: Number(line.qty_received),

      qty_accepted: (() => {

        const received = Number(line.qty_received);

        const accepted = Number(line.qty_accepted);

        return accepted > 0 ? accepted : received;

      })(),

      qty_rejected: Number(line.qty_rejected),

      rejection_reason: line.rejection_reason ?? "",

      to_bin_id: line.to_bin_id,

      notes: line.notes ?? "",

    };

  });

}



export default function GoodsReceiptDetailPage() {

  const params = useParams<{ id: string }>();

  const id = Number(params.id);

  const [grn, setGrn] = useState<GoodsReceipt | null>(null);

  const [lines, setLines] = useState<EditableGrnLine[]>([]);

  const [locationTree, setLocationTree] = useState<WarehouseLocationTree[]>([]);

  const [locationsLoading, setLocationsLoading] = useState(true);

  const [locationsError, setLocationsError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [verifying, setVerifying] = useState(false);

  const [notes, setNotes] = useState("");

  const [qualityNotes, setQualityNotes] = useState("");

  const [uploadingAttachment, setUploadingAttachment] = useState<GrnAttachmentType | null>(null);

  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);

  const [itemsLoading, setItemsLoading] = useState(true);



  const fetchStorageLocations = useCallback(async () => {

    setLocationsLoading(true);

    setLocationsError(null);



    try {

      const locationRes = await getLocationTree({ for_putaway: true });

      setLocationTree(locationRes.data ?? []);

    } catch (error) {

      setLocationTree([]);

      const message =

        error instanceof Error ? error.message : "Failed to load warehouse storage locations.";

      setLocationsError(message);

      toast.error(message);

    } finally {

      setLocationsLoading(false);

    }

  }, []);



  const load = useCallback(

    async (options?: { silent?: boolean }) => {

      if (!Number.isFinite(id)) {

        setLoading(false);

        return;

      }



      if (!options?.silent) {

        setLoading(true);

      }



      try {

        const [grnRes] = await Promise.all([

          getGoodsReceipt(id),

          options?.silent ? Promise.resolve() : fetchStorageLocations(),

        ]);



        const data = grnRes.data;

        setGrn(data);

        setNotes(data.notes ?? "");

        setQualityNotes(data.quality_inspection_notes ?? "");

        setLines(mapGrnLines(data));

      } catch (error) {

        toast.error(error instanceof Error ? error.message : "Failed to load goods receipt.");

      } finally {

        if (!options?.silent) {

          setLoading(false);

        }

      }

    },

    [fetchStorageLocations, id],

  );



  useEffect(() => {

    if (!Number.isFinite(id)) {

      return;

    }



    void load();

    setItemsLoading(true);

    void listWarehouseItems()

      .then(setWarehouseItems)

      .catch(() => setWarehouseItems([]))

      .finally(() => setItemsLoading(false));

  }, [id, load]);



  const attachmentTypes = useMemo(

    () => new Set((grn?.attachments ?? []).map((attachment) => attachment.type)),

    [grn],

  );



  const canVerify =

    lines.every((line) => {

      const balances = line.qty_accepted + line.qty_rejected === line.qty_received;

      const hasReason = line.qty_rejected === 0 || line.rejection_reason.trim().length > 0;

      const hasWarehouseItem =
        line.qty_accepted <= 0 ||
        line.is_procurement_only ||
        Boolean(line.warehouse_item_id);

      return balances && hasReason && hasWarehouseItem;

    }) &&

    attachmentTypes.has("receipt_photo") &&

    attachmentTypes.has("invoice_photo");



  const linesPayload = () =>
    lines.map((line) => ({
      id: line.id,
      qty_received: line.qty_received,
      qty_accepted: line.qty_accepted,
      qty_rejected: line.qty_rejected,
      rejection_reason: line.rejection_reason || null,
      to_bin_id: line.to_bin_id,
      warehouse_item_id: line.warehouse_item_id,
      notes: line.notes || null,
    }));

  const saveLines = async () => {
    setSaving(true);
    try {
      await updateGoodsReceiptLines(id, {
        notes: notes || null,
        quality_inspection_notes: qualityNotes || null,
        lines: linesPayload(),
      });
      toast.success("GRN updated.");
      await load({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update GRN.");
    } finally {
      setSaving(false);
    }
  };



  const uploadAttachment = async (type: GrnAttachmentType, file: File) => {

    setUploadingAttachment(type);

    try {

      await uploadGoodsReceiptAttachment(id, { file, type });

      toast.success("Document saved.");

      await load({ silent: true });

    } catch (error) {

      toast.error(error instanceof Error ? error.message : "Upload failed.");

      throw error;

    } finally {

      setUploadingAttachment(null);

    }

  };



  const runVerify = async () => {
    setVerifying(true);
    try {
      await verifyGoodsReceipt(id, {
        notes: notes || null,
        quality_inspection_notes: qualityNotes || null,
        lines: linesPayload(),
      });
      toast.success("GRN verified. Putaway locations saved.");
      await load({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setVerifying(false);
    }
  };



  return (

    <div className="flex min-w-0 w-full flex-col">

      <AppHeader

        title={grn?.grn_number ?? "Warehouse receiving"}

        subtitle="Log quantities, quality checks, and documents — then verify before putaway"

        actions={

          <div className="flex items-center gap-2">

            <Button variant="outline" size="sm" asChild>

              <Link href="/warehouse/receiving-logs">Receiving logs</Link>

            </Button>

            <Button variant="outline" size="sm" asChild>

              <Link href="/procurement/goods-receipts">Procurement GRNs</Link>

            </Button>

            {Number.isFinite(id) && id > 0 ? <GrnQcLink grnId={id} /> : null}

          </div>

        }

      />

      <div className="space-y-6 p-6">

        {loading ? (

          <p className="text-sm text-muted-foreground">Loading goods receipt…</p>

        ) : grn ? (

          <GoodsReceiptReceivingDetail

            grn={grn}

            lines={lines}

            setLines={setLines}

            locationTree={locationTree}

            locationsLoading={locationsLoading}

            locationsError={locationsError}

            notes={notes}

            setNotes={setNotes}

            qualityNotes={qualityNotes}

            setQualityNotes={setQualityNotes}

            warehouseItems={warehouseItems}

            itemsLoading={itemsLoading}

            uploadingAttachment={uploadingAttachment}

            saving={saving}

            verifying={verifying}

            canVerify={canVerify}

            onSave={() => void saveLines()}

            onAttachmentUpload={uploadAttachment}

            onVerify={() => void runVerify()}

          />

        ) : (

          <p className="text-sm text-muted-foreground">GRN not found.</p>

        )}

      </div>

    </div>

  );

}


