"use client";

import { useEffect, useMemo, useState } from "react";
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
  PRODUCTION_IN_PROCESS_STAGES,
  QC_CONTEXT_LABELS,
  QC_INSPECTION_CONTEXTS,
  type QcChecklistTemplate,
  type QcInspectionContext,
} from "@/lib/api/qc";
import {
  getProjectDocuments,
  listProjects,
  projectLabel,
  type ProjectDocument,
  type ProjectSummary,
} from "@/lib/api/projects";
import { toast } from "sonner";

type OpeningOption = {
  code: string;
  project_document_id: number | null;
};

function openingsFromDocuments(docs: ProjectDocument[]): OpeningOption[] {
  const seen = new Set<string>();
  const rows: OpeningOption[] = [];
  for (const doc of docs) {
    if (doc.type !== "design") continue;
    const code = String(doc.metadata?.code ?? "")
      .trim()
      .toUpperCase();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    rows.push({ code, project_document_id: doc.id });
  }
  return rows.sort((a, b) => a.code.localeCompare(b.code));
}

type NewInspectionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (inspectionId: number) => void;
  defaultContext?: QcInspectionContext;
  defaultGoodsReceiptId?: number;
  defaultProjectId?: number;
  defaultProductionOrderId?: number;
  defaultStage?: string;
  /** When true, context select is disabled (e.g. mandatory after-assembly QC). */
  lockContext?: boolean;
  /** Limit which contexts appear in the picker. */
  allowedContexts?: QcInspectionContext[];
  /** When true and openings exist, require selecting an opening. */
  requireOpening?: boolean;
};

export function NewInspectionDialog({
  open,
  onOpenChange,
  onCreated,
  defaultContext,
  defaultGoodsReceiptId,
  defaultProjectId,
  defaultProductionOrderId,
  defaultStage,
  lockContext = false,
  allowedContexts,
  requireOpening = false,
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
  const [stage, setStage] = useState(defaultStage ?? "cutting");
  const [openingKey, setOpeningKey] = useState("");
  const [openings, setOpenings] = useState<OpeningOption[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [templates, setTemplates] = useState<QcChecklistTemplate[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const contextOptions = allowedContexts?.length
    ? QC_INSPECTION_CONTEXTS.filter((ctx) => allowedContexts.includes(ctx))
    : QC_INSPECTION_CONTEXTS;

  const needsProject =
    context === "site_installation" ||
    context === "site_pre_installation" ||
    context === "site_receiving" ||
    context === "snagging_signoff" ||
    context.startsWith("production_");
  const needsProductionStage = context === "production_in_process";
  const needsOpening =
    requireOpening ||
    context.startsWith("production_") ||
    context === "site_receiving" ||
    context === "site_pre_installation" ||
    context === "site_installation";

  const selectedOpening = useMemo(
    () => openings.find((o) => o.code === openingKey) ?? null,
    [openings, openingKey],
  );

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
    if (defaultStage) {
      setStage(defaultStage);
    }
    setOpeningKey("");
  }, [open, defaultContext, defaultGoodsReceiptId, defaultProjectId, defaultProductionOrderId, defaultStage]);

  useEffect(() => {
    if (!open) return;

    listProjects({ per_page: 100 })
      .then((res) => setProjects(res.data))
      .catch(() => setProjects([]));
  }, [open]);

  useEffect(() => {
    if (!open || !projectId || !needsOpening) {
      setOpenings([]);
      return;
    }

    getProjectDocuments(Number(projectId))
      .then((res) => {
        const rows = openingsFromDocuments(res.data ?? []);
        setOpenings(rows);
        if (rows.length === 1) {
          setOpeningKey(rows[0].code);
        }
      })
      .catch(() => setOpenings([]));
  }, [open, projectId, needsOpening]);

  useEffect(() => {
    if (!open) return;

    listQcTemplates({
      context,
      project_id: projectId ? Number(projectId) : undefined,
      per_page: 50,
    })
      .then((res) => {
        const filtered =
          needsProductionStage
            ? res.data.filter((t) => t.stage === stage || !t.stage)
            : res.data;
        setTemplates(filtered);
        const active =
          filtered.find((t) => t.is_active && (!needsProductionStage || t.stage === stage)) ??
          filtered.find((t) => t.is_active);
        setTemplateId(active ? String(active.id) : "");
      })
      .catch(() => setTemplates([]));
  }, [open, context, projectId, stage, needsProductionStage]);

  const handleSubmit = async () => {
    if (requireOpening && openings.length > 0 && !selectedOpening) {
      toast.error("Select an opening (e.g. SD-4).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createQcInspection({
        context,
        template_id: templateId ? Number(templateId) : undefined,
        project_id: projectId ? Number(projectId) : undefined,
        project_document_id: selectedOpening?.project_document_id ?? undefined,
        opening_code: selectedOpening?.code ?? undefined,
        goods_receipt_id: goodsReceiptId ? Number(goodsReceiptId) : undefined,
        production_order_id: productionOrderId ? Number(productionOrderId) : undefined,
        stage: needsProductionStage ? stage : undefined,
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
              disabled={lockContext}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contextOptions.map((ctx) => (
                  <SelectItem key={ctx} value={ctx}>
                    {QC_CONTEXT_LABELS[ctx]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {lockContext ? (
              <p className="text-xs text-muted-foreground">
                After-assembly QC is locked for this production stage and cannot use receiving or
                pre-cutting templates.
              </p>
            ) : null}
          </div>
          {needsProductionStage && (
            <div className="space-y-2">
              <Label>Production stage</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTION_IN_PROCESS_STAGES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Template</Label>
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
            {templates[0]?.name && !templateId ? (
              <p className="text-xs text-muted-foreground">
                Will use: {templates.find((t) => t.is_active)?.name ?? templates[0].name}
              </p>
            ) : null}
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
          {needsOpening && openings.length > 0 && (
            <div className="space-y-2">
              <Label>Opening</Label>
              <Select value={openingKey || "none"} onValueChange={(v) => setOpeningKey(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select opening" />
                </SelectTrigger>
                <SelectContent>
                  {!requireOpening && <SelectItem value="none">Whole job</SelectItem>}
                  {openings.map((o) => (
                    <SelectItem key={o.code} value={o.code}>
                      {o.code}
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
