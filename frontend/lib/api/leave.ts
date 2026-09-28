import { apiRequest, ensureCsrfCookie } from "./client";

export type LeaveType = "annual" | "sick" | "unpaid" | "compassionate" | "other";

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export type LeaveRequest = {
  id: number;
  user_id: number;
  user_name: string | null;
  user_email: string | null;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days: number | null;
  reason: string | null;
  status: LeaveStatus;
  reviewed_by: number | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string | null;
};

export type LeaveBalance = {
  year: number;
  entitlement: number;
  used: number;
  pending: number;
  remaining: number;
  available: number;
};

export const LEAVE_TYPE_OPTIONS: { value: LeaveType; label: string }[] = [
  { value: "annual", label: "Annual leave" },
  { value: "sick", label: "Sick leave" },
  { value: "unpaid", label: "Unpaid leave" },
  { value: "compassionate", label: "Compassionate leave" },
  { value: "other", label: "Other" },
];

export type SubmitLeavePayload = {
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason?: string;
};

export type PaginatedLeaveRequests = {
  data: LeaveRequest[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export async function fetchMyLeaveRequests(): Promise<{
  data: LeaveRequest[];
  balance: LeaveBalance;
}> {
  return apiRequest("/leave-requests");
}

export async function submitLeaveRequest(
  payload: SubmitLeavePayload
): Promise<{ message: string; data: LeaveRequest }> {
  await ensureCsrfCookie();
  return apiRequest("/leave-requests", { method: "POST", body: payload });
}

export async function cancelLeaveRequest(
  id: number
): Promise<{ message: string; data: LeaveRequest }> {
  await ensureCsrfCookie();
  return apiRequest(`/leave-requests/${id}/cancel`, { method: "POST" });
}

export async function fetchHrLeaveRequests(params?: {
  page?: number;
  per_page?: number;
  status?: string;
  user_id?: number;
  from?: string;
  to?: string;
}): Promise<PaginatedLeaveRequests> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.per_page) qs.set("per_page", String(params.per_page));
  if (params?.status) qs.set("status", params.status);
  if (params?.user_id) qs.set("user_id", String(params.user_id));
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  const query = qs.toString();
  return apiRequest(`/hr/leave-requests${query ? `?${query}` : ""}`);
}

export async function approveLeaveRequest(
  id: number
): Promise<{ message: string; data: LeaveRequest }> {
  await ensureCsrfCookie();
  return apiRequest(`/hr/leave-requests/${id}/approve`, { method: "POST" });
}

export async function rejectLeaveRequest(
  id: number,
  reason?: string
): Promise<{ message: string; data: LeaveRequest }> {
  await ensureCsrfCookie();
  return apiRequest(`/hr/leave-requests/${id}/reject`, {
    method: "POST",
    body: { reason },
  });
}
