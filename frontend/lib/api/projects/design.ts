import { apiFetch } from "../client";
import type { PendingQuotationAccount, FabricationExtractionResult } from "./quotations";

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
