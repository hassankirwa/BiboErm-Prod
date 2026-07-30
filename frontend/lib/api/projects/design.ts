import { apiFetch } from "../client";
import type { PendingQuotationAccount, FabricationExtractionResult } from "./quotations";

export type DesignQueueProject = {
  id: number;
  reference: string;
  name: string;
  stage: string;
  stage_label: string;
  quoted_amount: string | number | null;
  deposit_received: string | number | null;
  has_production_measurement: boolean;
  measurement_status: string | null;
  measurement_status_label: string;
  measurement_visit_id: number | null;
  has_design_document: boolean;
  account?: { id: number; name: string } | null;
  project_manager?: { id: number; name: string } | null;
  updated_at: string | null;
};

export async function fetchDesignQueueProjects(): Promise<DesignQueueProject[]> {
  const res = await apiFetch<{ data: DesignQueueProject[] }>(
    "/api/v1/projects/design/queue",
  );
  return res.data ?? [];
}

/** Pre-quotation account queue (used by quotations workspace, not the design project board). */
export async function fetchDesignPendingAccounts(): Promise<PendingQuotationAccount[]> {
  const res = await apiFetch<{ data: PendingQuotationAccount[] }>(
    "/api/v1/projects/design/pending",
  );
  return res.data ?? [];
}

export async function extractFabricationExcel(file: File): Promise<FabricationExtractionResult> {
  const form = new FormData();
  form.append("file", file);

  const res = await apiFetch<{ data: FabricationExtractionResult }>(
    "/api/v1/projects/design/extract",
    { method: "POST", body: form },
  );

  return res.data;
}

export type ProjectFabricationImportResult = {
  extraction: {
    project?: { name?: string | null; order_no?: string | null; delivery_date?: string | null } | null;
    summary?: { total_items?: number; source_filename?: string | null } | null;
    items?: Array<Record<string, unknown>>;
  };
  fabrication_document: {
    id: number;
    type: string;
    filename: string;
    url: string;
    metadata?: Record<string, unknown> | null;
  };
  design_documents: Array<{
    id: number;
    type: string;
    filename: string;
    url: string;
    metadata?: Record<string, unknown> | null;
  }>;
  summary: {
    items: number;
    images_saved: number;
    designs_saved: number;
    created?: number;
    updated?: number;
    unchanged?: number;
    removed?: number;
  };
};

export async function importProjectFabricationList(
  projectId: number,
  file: File,
): Promise<ProjectFabricationImportResult> {
  const form = new FormData();
  form.append("file", file);

  const res = await apiFetch<{ data: ProjectFabricationImportResult }>(
    `/api/v1/projects/${projectId}/designs/fabrication`,
    { method: "POST", body: form },
  );

  return res.data;
}

export type { FabricationExtractionResult, PendingQuotationAccount };
