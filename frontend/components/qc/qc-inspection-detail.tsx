"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createQcDefect,
  QC_CONTEXT_LABELS,
  QC_INSPECTION_RESULT_LABELS,
  QC_INSPECTION_SUBMIT_RESULTS,
  submitQcInspection,
  updateQcDefect,
  updateQcInspectionDraft,
  uploadQcInspectionPhoto,
  type QcChecklistTemplateItem,
  type QcDefect,
  type QcDefectSeverity,
  type QcDefectStatus,
  type QcInspection,
  type QcInspectionSubmitResult,
} from "@/lib/api/qc";
import { toast } from "sonner";
import { QcProjectSummaryCard } from "@/components/qc/qc-project-summary-card";
import { Camera, Plus } from "lucide-react";

type ChecklistResponse = string | boolean | number | null;

function templateItems(inspection: QcInspection): QcChecklistTemplateItem[] {
  const templateItemsList = inspection.template?.items ?? [];
  const custom = inspection.custom_items ?? [];
  return [...templateItemsList, ...custom];
}

function checklistResponseValue(response: ChecklistResponse): string | boolean | number | null {
  if (response === null || response === undefined) {
    return null;
  }
  if (typeof response === "object" && response !== null && "value" in response) {
    return (response as { value: ChecklistResponse }).value;
  }
  return response;
}

function deriveResultFromChecklist(
  items: QcChecklistTemplateItem[],
  responses: Record<string, ChecklistResponse>,
): QcInspectionSubmitResult | null {
  if (items.length === 0) {
    return null;
  }

  let hasFail = false;
  let hasUnansweredRequired = false;

  for (const item of items) {
    const value = checklistResponseValue(responses[item.key]);
    const answered =
      value !== null &&
      value !== undefined &&
      value !== "" &&
      !(typeof value === "number" && Number.isNaN(value));

    if (!answered) {
      if (item.required !== false) {
        hasUnansweredRequired = true;
      }
      continue;
    }

    if (value === "fail" || value === false || value === "no") {
      hasFail = true;
    }
  }

  if (hasUnansweredRequired) {
    return null;
  }

  return hasFail ? "fail" : "pass";
}

type QCInspectionDetailProps = {
  inspection: QcInspection;
  onUpdated: () => void;
  canInspect: boolean;
  canResolveDefects?: boolean;
};

export function QCInspectionDetail({
  inspection,
  onUpdated,
  canInspect,
  canResolveDefects = false,
}: QCInspectionDetailProps) {
  const items = useMemo(() => templateItems(inspection), [inspection]);
  const isDraft = inspection.result === "pending";

  const [responses, setResponses] = useState<Record<string, ChecklistResponse>>(() => {
    const raw = (inspection.checklist_responses ?? {}) as Record<string, ChecklistResponse>;
    return { ...raw };
  });
  const [notes, setNotes] = useState(inspection.notes ?? "");
  const [internalNotes, setInternalNotes] = useState(inspection.internal_notes ?? "");
  const [submitResult, setSubmitResult] = useState<QcInspectionSubmitResult>("pass");
  const [resultTouched, setResultTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [defectSeverity, setDefectSeverity] = useState<QcDefectSeverity>("minor");
  const [defectDescription, setDefectDescription] = useState("");
  const [photoKey, setPhotoKey] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const derivedResult = useMemo(
    () => deriveResultFromChecklist(items, responses),
    [items, responses],
  );

  useEffect(() => {
    if (!resultTouched && derivedResult) {
      setSubmitResult(derivedResult);
    }
  }, [derivedResult, resultTouched]);

  const setResponse = (key: string, value: ChecklistResponse) => {
    setResponses((prev) => ({ ...prev, [key]: value }));
  };

  const saveDraft = useCallback(async () => {
    setSaving(true);
    try {
      await updateQcInspectionDraft(inspection.id, {
        checklist_responses: responses as Record<string, unknown>,
        notes: notes || null,
        internal_notes: internalNotes || null,
      });
      toast.success("Draft saved.");
      onUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save draft.");
    } finally {
      setSaving(false);
    }
  }, [inspection.id, responses, notes, internalNotes, onUpdated]);

  const handleSubmit = async () => {
    if (!submitResult) {
      toast.error("Select an inspection result (Pass, Fail, or Conditional pass).");
      return;
    }

    setSubmitting(true);
    try {
      await updateQcInspectionDraft(inspection.id, {
        checklist_responses: responses as Record<string, unknown>,
        notes: notes || null,
        internal_notes: internalNotes || null,
      });
      await submitQcInspection(inspection.id, {
        result: submitResult,
        checklist_responses: responses as Record<string, unknown>,
        notes: notes || null,
      });
      toast.success("Inspection submitted.");
      onUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit inspection.");
    } finally {
      setSubmitting(false);
    }
  };

  const resolveDefect = async (defect: QcDefect, status: QcDefectStatus) => {
    try {
      await updateQcDefect(defect.id, { status });
      toast.success(`Defect marked ${status.replace("_", " ")}.`);
      onUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update defect.");
    }
  };

  const addDefect = async () => {
    if (!defectDescription.trim()) {
      toast.error("Enter a defect description.");
      return;
    }
    try {
      await createQcDefect(inspection.id, {
        severity: defectSeverity,
        description: defectDescription.trim(),
        checklist_key: photoKey || null,
      });
      toast.success("Defect logged.");
      setDefectDescription("");
      onUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to log defect.");
    }
  };

  const uploadPhoto = async () => {
    if (!photoFile) {
      toast.error("Choose a photo first.");
      return;
    }
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", photoFile);
      if (photoKey) formData.append("checklist_key", photoKey);
      await uploadQcInspectionPhoto(inspection.id, formData);
      toast.success("Photo uploaded.");
      setPhotoFile(null);
      onUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const readOnly = !canInspect || !isDraft;

  return (
    <div className="space-y-6">
      {inspection.project && (
        <QcProjectSummaryCard project={inspection.project} />
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">{inspection.reference}</h2>
            <Badge variant="outline">
              {QC_CONTEXT_LABELS[inspection.context] ?? inspection.context}
            </Badge>
            <Badge
              variant={
                inspection.result === "pass"
                  ? "default"
                  : inspection.result === "fail"
                    ? "destructive"
                    : "secondary"
              }
            >
              {inspection.result}
            </Badge>
          </div>
          {inspection.goods_receipt_id && (
            <p className="text-sm text-muted-foreground">
              GRN:{" "}
              <Link
                href={`/procurement/goods-receipts/${inspection.goods_receipt_id}`}
                className="text-primary hover:underline"
              >
                #{inspection.goods_receipt_id}
              </Link>
            </p>
          )}
        </div>
        {canInspect && isDraft && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qc-submit-result">Inspection result</Label>
              <Select
                value={submitResult}
                onValueChange={(v) => {
                  setResultTouched(true);
                  setSubmitResult(v as QcInspectionSubmitResult);
                }}
              >
                <SelectTrigger id="qc-submit-result" className="w-[200px]">
                  <SelectValue placeholder="Select result" />
                </SelectTrigger>
                <SelectContent>
                  {QC_INSPECTION_SUBMIT_RESULTS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {QC_INSPECTION_RESULT_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {derivedResult && !resultTouched && (
                <p className="text-xs text-muted-foreground">
                  Suggested from checklist: {QC_INSPECTION_RESULT_LABELS[derivedResult]}
                </p>
              )}
              {items.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No checklist items — choose Pass, Fail, or Conditional pass before submitting.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={saveDraft} disabled={saving}>
                {saving ? "Saving..." : "Save draft"}
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit inspection"}
              </Button>
            </div>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No checklist items on this inspection. Assign a template or add custom items via API.
            </p>
          ) : (
            items.map((item) => (
              <div key={item.key} className="rounded-md border border-border p-4 space-y-2">
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  {item.help_text && (
                    <p className="text-xs text-muted-foreground">{item.help_text}</p>
                  )}
                </div>
                {item.type === "pass_fail" && (
                  <Select
                    disabled={readOnly}
                    value={String(responses[item.key] ?? "")}
                    onValueChange={(v) => setResponse(item.key, v)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pass">Pass</SelectItem>
                      <SelectItem value="fail">Fail</SelectItem>
                      <SelectItem value="na">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {item.type === "yes_no" && (
                  <Select
                    disabled={readOnly}
                    value={
                      responses[item.key] === true
                        ? "yes"
                        : responses[item.key] === false
                          ? "no"
                          : ""
                    }
                    onValueChange={(v) => setResponse(item.key, v === "yes")}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {(item.type === "numeric" || item.type === "text") && (
                  <Input
                    disabled={readOnly}
                    type={item.type === "numeric" ? "number" : "text"}
                    value={String(responses[item.key] ?? "")}
                    onChange={(e) =>
                      setResponse(
                        item.key,
                        item.type === "numeric" ? Number(e.target.value) : e.target.value,
                      )
                    }
                  />
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Inspector notes</Label>
              <Textarea
                disabled={readOnly}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Internal notes</Label>
              <Textarea
                disabled={readOnly}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Photos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(inspection.photos ?? []).length > 0 ? (
              <ul className="space-y-2 text-sm">
                {inspection.photos!.map((photo) => (
                  <li key={photo.id}>
                    {photo.caption || photo.checklist_key || `Photo #${photo.id}`}
                    {(photo.url ?? photo.firebase_url) && (
                      <a
                        href={photo.url ?? photo.firebase_url!}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 text-primary hover:underline"
                      >
                        View
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No photos yet.</p>
            )}
            {canInspect && isDraft && (
              <div className="space-y-2 border-t pt-4">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                />
                <Input
                  placeholder="Checklist item key (optional)"
                  value={photoKey}
                  onChange={(e) => setPhotoKey(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={uploadPhoto}
                  disabled={uploadingPhoto}
                >
                  <Camera className="h-4 w-4" />
                  {uploadingPhoto ? "Uploading..." : "Upload photo"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Defects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(inspection.defects ?? []).length > 0 ? (
            <ul className="divide-y rounded-md border">
              {inspection.defects!.map((defect) => (
                <li
                  key={defect.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <div>
                    <span className="font-medium">{defect.description}</span>
                    <span className="ml-2 text-muted-foreground">({defect.severity})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{defect.status}</Badge>
                    {canResolveDefects && defect.status !== "resolved" && defect.status !== "waived" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resolveDefect(defect, "in_progress")}
                        >
                          In progress
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resolveDefect(defect, "resolved")}
                        >
                          Resolve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resolveDefect(defect, "waived")}
                        >
                          Waive
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No defects logged.</p>
          )}
          {canInspect && isDraft && (
            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Select
                value={defectSeverity}
                onValueChange={(v) => setDefectSeverity(v as QcDefectSeverity)}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                </SelectContent>
              </Select>
              <Input
                className="min-w-[200px] flex-1"
                placeholder="Defect description"
                value={defectDescription}
                onChange={(e) => setDefectDescription(e.target.value)}
              />
              <Button variant="outline" size="sm" className="gap-1" onClick={addDefect}>
                <Plus className="h-4 w-4" />
                Add defect
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
