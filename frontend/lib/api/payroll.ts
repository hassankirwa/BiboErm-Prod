import { apiRequest, ensureCsrfCookie } from "./client";

export type PayrollRunStatus = "draft" | "pending_finance" | "approved" | "processed";

export type PayrollEntry = {
  id: number;
  payroll_run_id: number;
  user_id: number;
  user_name: string | null;
  user_email: string | null;
  employee_number: string | null;
  period_year?: number;
  period_month?: number;
  period_label?: string | null;
  gross_salary: number;
  nhif: number;
  nssf: number;
  paye: number;
  other_deductions: number;
  net_pay: number;
  payslip_path: string | null;
  download_url: string | null;
  created_at: string | null;
};

export type PayrollRun = {
  id: number;
  period_year: number;
  period_month: number;
  period_label: string;
  status: PayrollRunStatus;
  created_by: number;
  creator_name: string | null;
  submitted_at: string | null;
  approved_by: number | null;
  approver_name: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  entries?: PayrollEntry[];
  entries_count?: number;
  total_gross?: number;
  total_net?: number;
  created_at: string | null;
};

export type PaginatedPayrollRuns = {
  data: PayrollRun[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export async function fetchPayrollRuns(params?: {
  page?: number;
  per_page?: number;
  status?: string;
}): Promise<PaginatedPayrollRuns> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.per_page) qs.set("per_page", String(params.per_page));
  if (params?.status) qs.set("status", params.status);
  const query = qs.toString();
  return apiRequest(`/hr/payroll-runs${query ? `?${query}` : ""}`);
}

export async function fetchPayrollRun(id: number): Promise<{ data: PayrollRun }> {
  return apiRequest(`/hr/payroll-runs/${id}`);
}

export async function createPayrollRun(payload: {
  period_year: number;
  period_month: number;
  notes?: string;
}): Promise<{ message: string; data: PayrollRun }> {
  await ensureCsrfCookie();
  return apiRequest("/hr/payroll-runs", { method: "POST", body: payload });
}

export async function generatePayrollRun(
  id: number
): Promise<{ message: string; data: PayrollRun }> {
  await ensureCsrfCookie();
  return apiRequest(`/hr/payroll-runs/${id}/generate`, { method: "POST" });
}

export async function updatePayrollEntry(
  runId: number,
  entryId: number,
  payload: { gross_salary?: number; other_deductions?: number }
): Promise<{ message: string; data: PayrollEntry }> {
  await ensureCsrfCookie();
  return apiRequest(`/hr/payroll-runs/${runId}/entries/${entryId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function submitPayrollRun(
  id: number
): Promise<{ message: string; data: PayrollRun }> {
  await ensureCsrfCookie();
  return apiRequest(`/hr/payroll-runs/${id}/submit`, { method: "POST" });
}

export async function approvePayrollRun(
  id: number
): Promise<{ message: string; data: PayrollRun }> {
  await ensureCsrfCookie();
  return apiRequest(`/hr/payroll-runs/${id}/approve`, { method: "POST" });
}

export async function rejectPayrollRun(
  id: number,
  reason?: string
): Promise<{ message: string; data: PayrollRun }> {
  await ensureCsrfCookie();
  return apiRequest(`/hr/payroll-runs/${id}/reject`, {
    method: "POST",
    body: { reason },
  });
}

export async function fetchMyPayslips(): Promise<{ data: PayrollEntry[] }> {
  return apiRequest("/my/payslips");
}

export async function downloadMyPayslip(
  entryId: number
): Promise<{ url: string | null; filename: string | null }> {
  return apiRequest(`/my/payslips/${entryId}/download`);
}
