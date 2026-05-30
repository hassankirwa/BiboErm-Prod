import { apiRequest } from "./client";

export type Paginated<T> = {
  data: T[];
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
};

export type Supplier = {
  id: number;
  code: string;
  name: string;
  category: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_preferred: boolean;
  is_active: boolean;
};

export type PurchaseRequisition = {
  id: number;
  reference: string;
  project_id: number | null;
  status: string;
  notes: string | null;
  lines?: PurchaseRequisitionLine[];
};

export type PurchaseRequisitionLine = {
  id: number;
  description: string;
  quantity: string;
  trigger_type: string;
  sku?: string | null;
};

export type PurchaseOrder = {
  id: number;
  reference: string;
  supplier_id: number;
  project_id: number | null;
  requisition_id: number | null;
  status: string;
  subtotal: string;
  tax: string;
  total: string;
  expected_delivery: string | null;
  supplier?: Supplier;
  lines?: PurchaseOrderLine[];
};

export type PurchaseOrderLine = {
  id: number;
  description: string;
  quantity: string;
  unit_price: string;
  line_total: string;
};

export type ProcurementDashboard = {
  open_requisitions: number;
  pos_awaiting_approval: number;
  pending_grns: number;
  glass_queue: number;
  delays_this_week: number;
};

export async function listSuppliers(params?: { category?: string; per_page?: number }) {
  const search = new URLSearchParams();
  if (params?.category) search.set("category", params.category);
  if (params?.per_page) search.set("per_page", String(params.per_page));
  const q = search.toString();
  return apiRequest<Paginated<Supplier>>(`/procurement/suppliers${q ? `?${q}` : ""}`);
}

export async function listPurchaseOrders(params?: { status?: string; project_id?: number; per_page?: number }) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.project_id) search.set("project_id", String(params.project_id));
  if (params?.per_page) search.set("per_page", String(params.per_page));
  const q = search.toString();
  return apiRequest<Paginated<PurchaseOrder>>(`/procurement/purchase-orders${q ? `?${q}` : ""}`);
}

export async function listRequisitions(params?: { status?: string; project_id?: number }) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.project_id) search.set("project_id", String(params.project_id));
  const q = search.toString();
  return apiRequest<Paginated<PurchaseRequisition>>(`/procurement/requisitions${q ? `?${q}` : ""}`);
}

export async function getProcurementDashboard() {
  return apiRequest<{ data: ProcurementDashboard }>("/procurement/dashboard");
}

export async function createRequisition(payload: {
  notes?: string;
  project_id?: number;
  lines: Array<{
    description: string;
    quantity: number;
    trigger_type?: string;
    warehouse_item_id?: number;
  }>;
}) {
  return apiRequest<{ data: PurchaseRequisition }>("/procurement/requisitions", {
    method: "POST",
    body: payload,
  });
}

export async function submitRequisition(id: number) {
  return apiRequest<{ data: PurchaseRequisition }>(`/procurement/requisitions/${id}/submit`, {
    method: "POST",
  });
}

export async function approveRequisition(id: number) {
  return apiRequest<{ data: PurchaseRequisition }>(`/procurement/requisitions/${id}/approve`, {
    method: "POST",
  });
}
