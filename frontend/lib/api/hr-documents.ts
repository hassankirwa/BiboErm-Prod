import { apiRequest, ensureCsrfCookie } from "./client";

export type HrDocumentCategory =
  | "policy"
  | "contract"
  | "payslip"
  | "certificate"
  | "other";

export type HrDocument = {
  id: number;
  user_id: number | null;
  user_name: string | null;
  title: string;
  category: HrDocumentCategory;
  filename: string | null;
  mime_type: string | null;
  file_size: number | null;
  uploaded_by: number | null;
  uploader_name: string | null;
  download_url: string | null;
  created_at: string | null;
};

export const HR_DOCUMENT_CATEGORY_OPTIONS: {
  value: HrDocumentCategory;
  label: string;
}[] = [
  { value: "policy", label: "Policy" },
  { value: "contract", label: "Contract" },
  { value: "payslip", label: "Payslip" },
  { value: "certificate", label: "Certificate" },
  { value: "other", label: "Other" },
];

export type PaginatedHrDocuments = {
  data: HrDocument[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export async function fetchHrDocuments(params?: {
  page?: number;
  per_page?: number;
  category?: string;
  user_id?: number | "null";
  search?: string;
}): Promise<PaginatedHrDocuments> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.per_page) qs.set("per_page", String(params.per_page));
  if (params?.category) qs.set("category", params.category);
  if (params?.user_id !== undefined) {
    qs.set("user_id", params.user_id === "null" ? "null" : String(params.user_id));
  }
  if (params?.search) qs.set("search", params.search);
  const query = qs.toString();
  return apiRequest(`/hr/documents${query ? `?${query}` : ""}`);
}

export async function uploadHrDocument(formData: FormData): Promise<{
  message: string;
  data: HrDocument;
}> {
  await ensureCsrfCookie();
  return apiRequest("/hr/documents", { method: "POST", formData });
}

export async function deleteHrDocument(id: number): Promise<{ message: string }> {
  await ensureCsrfCookie();
  return apiRequest(`/hr/documents/${id}`, { method: "DELETE" });
}

export async function downloadHrDocument(
  id: number
): Promise<{ url: string | null; filename: string | null }> {
  return apiRequest(`/hr/documents/${id}/download`);
}

export async function fetchMyHrDocuments(): Promise<{ data: HrDocument[] }> {
  return apiRequest("/my/hr-documents");
}

export async function downloadMyHrDocument(
  id: number
): Promise<{ url: string | null; filename: string | null }> {
  return apiRequest(`/my/hr-documents/${id}/download`);
}
