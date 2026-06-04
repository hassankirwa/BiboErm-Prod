"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  createQcInspection,
  listQcTemplates,
  QC_CONTEXT_LABELS,
  QC_INSPECTION_CONTEXTS,
  type QcChecklistTemplate,
  type QcInspectionContext,
} from "@/lib/api/qc";
import { listProjects, projectLabel, type ProjectSummary } from "@/lib/api/projects";
import { toast } from "sonner";

type NewInspectionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (inspectionId: number) => void;
  defaultContext?: QcInspectionContext;
  defaultGoodsReceiptId?: number;
  defaultProjectId?: number;
  defaultProductionOrderId?: number;
};

export function NewInspectionDialog({
  open,
  onOpenChange,
  onCreated,
  defaultContext,
  defaultGoodsReceiptId,
  defaultProjectId,
  defaultProductionOrderId,
}: NewInspectionDialogProps) {
  const [context, setContext] = useState<QcInspectionContext>(
    defaultContext ?? "warehouse_receiving",
  );
  const [templateId, setTemplateId] = useState<string>("");
  const [projectId, setProjectId] = useState("");
  const [goodsReceiptId, setGoodsReceiptId] = useState(
    defaultGoodsReceiptId ? String(defaultGoodsReceiptId) : "",
  );
  const [productionOrderId, setProductionOrderId] = useState("");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [templates, setTemplates] = useState<QcChecklistTemplate[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const needsProject =
    context === "site_installation" ||
    context === "snagging_signoff" ||
    context.startsWith("production_");

  useEffect(() => {
    if (!open) return;

    setContext(defaultContext ?? "warehouse_receiving");
    if (defaultGoodsReceiptId) {
      setGoodsReceiptId(String(defaultGoodsReceiptId));
    }
    if (defaultProjectId) {
      setProjectId(String(defaultProjectId));
    }
    if (defaultProductionOrderId) {
      setProductionOrderId(String(defaultProductionOrderId));
    }
  }, [open, defaultContext, defaultGoodsReceiptId, defaultProjectId, defaultProductionOrderId]);

  useEffect(() => {
    if (!open) return;

    listProjects({ per_page: 100 })
      .then((res) => setProjects(res.data))
      .catch(() => setProjects([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;

    listQcTemplates({
      context,
      project_id: projectId ? Number(projectId) : undefined,
      per_page: 50,
    })
      .then((res) => {
        setTemplates(res.data);
        const active = res.data.find((t) => t.is_active);
        setTemplateId(active ? String(active.id) : "");
      })
      .catch(() => setTemplates([]));
  }, [open, context, projectId]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await createQcInspection({
        context,
        template_id: templateId ? Number(templateId) : undefined,
        project_id: projectId ? Number(projectId) : undefined,
        goods_receipt_id: goodsReceiptId ? Number(goodsReceiptId) : undefined,
        production_order_id: productionOrderId ? Number(productionOrderId) : undefined,
      });
      toast.success("Inspection started.");
      onOpenChange(false);
      onCreated(res.data.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create inspection.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New inspection</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Context</Label>
            <Select
              value={context}
              onValueChange={(v) => setContext(v as QcInspectionContext)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QC_INSPECTION_CONTEXTS.map((ctx) => (
                  <SelectItem key={ctx} value={ctx}>
                    {QC_CONTEXT_LABELS[ctx]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Template (optional)</Label>
            <Select value={templateId || "auto"} onValueChange={(v) => setTemplateId(v === "auto" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Auto-resolve" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-resolve from context</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(needsProject || projectId || defaultProjectId) && (
            <div className="space-y-2">
              <Label>Project{needsProject ? "" : " (optional)"}</Label>
              <Select
                value={projectId || "none"}
                onValueChange={(v) => setProjectId(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {!needsProject && <SelectItem value="none">None</SelectItem>}
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {projectLabel(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {(context === "warehouse_receiving" || goodsReceiptId) && (
            <div className="space-y-2">
              <Label>Goods receipt ID</Label>
              <Input
                type="number"
                value={goodsReceiptId}
                onChange={(e) => setGoodsReceiptId(e.target.value)}
                placeholder="GRN ID"
              />
            </div>
          )}
          {context.startsWith("production_") && (
            <div className="space-y-2">
              <Label>Production order ID</Label>
              <Input
                type="number"
                value={productionOrderId}
                onChange={(e) => setProductionOrderId(e.target.value)}
                placeholder="Production order ID"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating..." : "Start inspection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
