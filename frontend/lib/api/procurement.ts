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

export type Driver = {
  id: number;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  license_number: string | null;
  vehicle_registration: string | null;
  vehicle_type: string | null;
  notes: string | null;
  is_active: boolean;
};

export type PurchaseRequisition = {
  id: number;
  reference: string;
  project_id: number | null;
  supplier_id?: number | null;
  status: string;
  notes: string | null;
  trigger_type?: string | null;
  requires_admin_approval?: boolean;
  submitted_at?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  created_at?: string | null;
  project?: {
    id: number;
    reference: string;
    name: string;
    stage: string;
  } | null;
  supplier?: {
    id: number;
    code: string;
    name: string;
    category: string | null;
  } | null;
  requester?: { id: number; name: string; email: string } | null;
  approver?: { id: number; name: string; email: string } | null;
  lines?: PurchaseRequisitionLine[];
  purchase_orders_count?: number;
};

export type PurchaseRequisitionLine = {
  id: number;
  description: string;
  quantity: string;
  required_quantity?: string | null;
  overage_quantity?: string | null;
  trigger_type: string;
  warehouse_item_id?: number | null;
  project_bom_line_id?: number | null;
  unit_of_measure?: string | null;
  sku?: string | null;
  estimated_unit_price?: string | null;
  notes?: string | null;
  warehouse_item?: {
    id: number;
    sku: string;
    name: string;
    unit_of_measure?: string | null;
  } | null;
};

export type WarehouseItemCategory = "aluminium_profile" | "accessory" | "rubber";

export type LowStockRequisitionSourceItem = {
  warehouse_item_id: number;
  category?: WarehouseItemCategory;
  sku: string;
  name: string;
  unit_of_measure: string | null;
  available_qty: string;
  min_stock_qty: string;
  quantity_to_requisition: string;
  requisitions: Array<{ id: number; reference: string; status: string }>;
  can_create_requisition: boolean;
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
  created_at?: string | null;
  supplier?: Supplier;
  project?: {
    id: number;
    reference: string;
    name: string;
  } | null;
  requisition?: {
    id: number;
    reference: string;
  } | null;
  lines?: PurchaseOrderLine[];
  goods_receipts_count?: number;
  transport_orders?: Array<{
    id: number;
    transport_number: string;
    transport_type: string;
    vehicle: string | null;
    driver_id: number | null;
    driver_name: string | null;
    driver_phone: string | null;
    expected_arrival: string | null;
    status: string;
  }>;
};

export type PurchaseOrderLine = {
  id: number;
  warehouse_item_id?: number | null;
  description: string;
  quantity: string;
  unit_price: string;
  line_total: string;
  received_qty?: string;
};

export type GoodsReceiptLine = {
  id: number;
  goods_receipt_id: number;
  purchase_order_line_id: number;
  warehouse_item_id: number | null;
  warehouse_item_category?: WarehouseItemCategory | string | null;
  is_procurement_only?: boolean;
  qty_received: string;
  qty_accepted: string;
  qty_rejected: string;
  rejection_reason: string | null;
  to_bin_id: number | null;
  notes: string | null;
};

export type GoodsReceiptAttachment = {
  id: number;
  goods_receipt_id?: number;
  type: string;
  path: string;
  url?: string | null;
  firebase_url?: string | null;
  original_filename?: string | null;
  uploaded_at?: string | null;
};

export type GoodsReceipt = {
  id: number;
  grn_number: string;
  purchase_order_id: number;
  project_id: number | null;
  transport_order_id: number | null;
  status: string;
  received_at: string;
  verified_at: string | null;
  verified_by: number | null;
  notes: string | null;
  quality_inspection_notes?: string | null;
  created_at?: string | null;
  lines?: GoodsReceiptLine[];
  attachments?: GoodsReceiptAttachment[];
  purchaseOrder?: PurchaseOrder;
  creator?: { id: number; name: string; email: string } | null;
};

export type GlassOrderPane = {
  name?: string;
  width_mm?: number | null;
  height_mm?: number | null;
  quantity?: number | null;
  glass_type?: string | null;
  tint?: string | null;
  notes?: string | null;
  bom_line_id?: number | null;
};

export type GlassOrderSpecs = {
  source?: string;
  requirements?: string;
  panes?: GlassOrderPane[];
};

export type GlassOrder = {
  id: number;
  order_number: string;
  project_id: number;
  supplier_id: number | null;
  purchase_order_id: number | null;
  specs?: GlassOrderSpecs;
  status: string;
  ordered_at: string | null;
  expected_delivery: string | null;
  delivered_at: string | null;
  delivery_location: string | null;
  notes: string | null;
  created_at?: string | null;
  project?: {
    id: number;
    reference: string;
    name: string;
  } | null;
  supplier?: {
    id: number;
    code: string;
    name: string;
    category: string | null;
  } | null;
};

export type TransportOrder = {
  id: number;
  transport_number: string;
  purchase_order_id: number;
  transport_type: string;
  vehicle: string | null;
  driver_id: number | null;
  driver_name: string | null;
  driver_phone: string | null;
  expected_arrival: string | null;
  actual_arrival: string | null;
  status: string;
  notes: string | null;
  purchaseOrder?: PurchaseOrder;
  driver?: Driver | null;
};

function buildQuery(params?: Record<string, string | number | boolean | null | undefined>) {
  const search = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    search.set(key, String(value));
  });

  const q = search.toString();
  return q ? `?${q}` : "";
}

export type ProcurementDashboard = {
  open_requisitions: number;
  pos_awaiting_approval: number;
  pending_grns: number;
  glass_queue: number;
  delays_this_week: number;
};

export type ProcurementStockStatus = "in_stock" | "low_stock" | "out_of_stock";

export type ProcurementStockItem = {
  id: number;
  sku: string;
  name: string;
  category: string | null;
  category_label: string;
  unit_of_measure: string | null;
  min_stock_qty: string;
  quantity_on_hand: string;
  quantity_reserved: string;
  quantity_available: string;
  stock_status: ProcurementStockStatus;
  low_stock_alert: boolean;
  locations_count: number;
  last_stock_updated_at: string | null;
  shortage_qty?: string;
};

export type ProcurementStockSummary = {
  total_materials: number;
  categories_count: number;
  in_stock_items: number;
  low_stock_items: number;
  out_of_stock_items: number;
  alert_items: number;
  total_on_hand_qty: number;
  total_reserved_qty: number;
  total_available_qty: number;
};

export type ProcurementStockStatusBreakdown = {
  status: ProcurementStockStatus;
  label: string;
  count: number;
};

export type ProcurementStockCategorySummary = {
  category: string | null;
  label: string;
  materials_count: number;
  in_stock_items: number;
  low_stock_items: number;
  out_of_stock_items: number;
  alert_items: number;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
};

export type ProcurementStockOverview = {
  summary: ProcurementStockSummary;
  status_breakdown: ProcurementStockStatusBreakdown[];
  categories: ProcurementStockCategorySummary[];
  alerts: ProcurementStockItem[];
  items: ProcurementStockItem[];
};

export type ProcurementStockAnalytics = {
  summary: ProcurementStockSummary;
  status_breakdown: ProcurementStockStatusBreakdown[];
  category_distribution: ProcurementStockCategorySummary[];
  alert_summary: {
    total_alerts: number;
    low_stock_items: number;
    out_of_stock_items: number;
  };
  top_available_items: ProcurementStockItem[];
  urgent_reorder_items: ProcurementStockItem[];
};

export async function listSuppliers(params?: { category?: string; per_page?: number }) {
  return apiRequest<Paginated<Supplier>>(`/procurement/suppliers${buildQuery(params)}`);
}

export type SupplierCategoryOption = {
  value: string;
  label: string;
};

export async function fetchSuggestedSupplierCode(category?: string): Promise<{
  code: string | null;
  categories: SupplierCategoryOption[];
}> {
  return apiRequest(`/procurement/suppliers/suggested-code${buildQuery(category ? { category } : undefined)}`);
}

export async function createSupplier(payload: {
  code?: string;
  name: string;
  category?: string;
  email?: string;
  phone?: string;
  address?: string;
  is_preferred?: boolean;
}) {
  return apiRequest<{ data: Supplier }>("/procurement/suppliers", {
    method: "POST",
    body: payload,
  });
}

export async function listDrivers(params?: {
  search?: string;
  active_only?: boolean;
  per_page?: number;
}) {
  return apiRequest<Paginated<Driver>>(`/procurement/drivers${buildQuery(params)}`);
}

export async function fetchSuggestedDriverCode(): Promise<{ code: string | null }> {
  return apiRequest("/procurement/drivers/suggested-code");
}

export async function createDriver(payload: {
  code?: string;
  name: string;
  email?: string;
  phone?: string;
  license_number?: string;
  vehicle_registration?: string;
  vehicle_type?: string;
  notes?: string;
}) {
  return apiRequest<{ data: Driver }>("/procurement/drivers", {
    method: "POST",
    body: payload,
  });
}

export async function updateDriver(
  id: number,
  payload: {
    code?: string;
    name?: string;
    email?: string | null;
    phone?: string | null;
    license_number?: string | null;
    vehicle_registration?: string | null;
    vehicle_type?: string | null;
    notes?: string | null;
    is_active?: boolean;
  },
) {
  return apiRequest<{ data: Driver }>(`/procurement/drivers/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export type PurchaseOrderDraftLine = {
  requisition_id: number;
  requisition_line_id: number;
  requisition_reference: string;
  description: string;
  sku?: string | null;
  quantity: string;
  unit_of_measure?: string | null;
  warehouse_item_id?: number | null;
  unit_price: string;
};

export type PurchaseOrderDraftGroup = {
  supplier_id: number;
  supplier?: Supplier | null;
  requisition_ids: number[];
  requisition_references: string[];
  project_id: number | null;
  project?: { id: number; reference: string; name: string } | null;
  notes?: string;
  lines: PurchaseOrderDraftLine[];
};

export async function listPurchaseOrders(params?: {
  status?: string;
  project_id?: number;
  per_page?: number;
  without_goods_receipts?: boolean;
}) {
  return apiRequest<Paginated<PurchaseOrder>>(`/procurement/purchase-orders${buildQuery(params)}`);
}

export async function getPurchaseOrder(id: number) {
  return apiRequest<{ data: PurchaseOrder }>(`/procurement/purchase-orders/${id}`);
}

export async function approvePurchaseOrder(id: number) {
  return apiRequest<{ data: PurchaseOrder }>(`/procurement/purchase-orders/${id}/approve`, {
    method: "POST",
  });
}

export async function getPurchaseOrderDraft(requisitionIds: number[]) {
  const search = new URLSearchParams();
  requisitionIds.forEach((id) => search.append("requisition_ids[]", String(id)));
  const query = search.toString();
  return apiRequest<{ data: { groups: PurchaseOrderDraftGroup[] } }>(
    `/procurement/purchase-orders/draft${query ? `?${query}` : ""}`,
  );
}

export async function createPurchaseOrder(payload: {
  requisition_id: number;
  supplier_id: number;
  project_id?: number;
  expected_delivery?: string;
  tax?: number;
  lines: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    warehouse_item_id?: number;
    sku?: string;
  }>;
  transport?: {
    transport_type: string;
    driver_id?: number;
    vehicle?: string;
    driver_name?: string;
    driver_phone?: string;
    expected_arrival?: string;
    notes?: string;
  };
}) {
  return apiRequest<{ data: PurchaseOrder }>("/procurement/purchase-orders", {
    method: "POST",
    body: payload,
  });
}

export async function createPurchaseOrdersBatch(payload: {
  groups: Array<{
    requisition_ids: number[];
    supplier_id: number;
    project_id?: number;
    expected_delivery?: string;
    tax?: number;
    lines: Array<{
      description: string;
      quantity: number;
      unit_price: number;
      warehouse_item_id?: number;
      sku?: string;
    }>;
    transport?: {
      transport_type: string;
      driver_id?: number;
      vehicle?: string;
      driver_name?: string;
      driver_phone?: string;
      expected_arrival?: string;
      notes?: string;
    };
  }>;
}) {
  return apiRequest<{ data: PurchaseOrder[] }>("/procurement/purchase-orders/batch", {
    method: "POST",
    body: payload,
  });
}

export async function listRequisitions(params?: { status?: string; project_id?: number; per_page?: number }) {
  return apiRequest<Paginated<PurchaseRequisition>>(`/procurement/requisitions${buildQuery(params)}`);
}

export async function getRequisition(id: number) {
  return apiRequest<{ data: PurchaseRequisition }>(`/procurement/requisitions/${id}`);
}

export async function getLowStockRequisitionSource(params?: {
  category?: WarehouseItemCategory;
}) {
  return apiRequest<{
    data: LowStockRequisitionSourceItem[];
    meta?: {
      total_items?: number;
      actionable_items?: number;
      category?: WarehouseItemCategory | null;
      categories?: Array<{ value: WarehouseItemCategory; label: string }>;
    };
  }>(`/procurement/requisition-sources/low-stock${buildQuery(params)}`);
}

export async function getProcurementDashboard() {
  return apiRequest<{ data: ProcurementDashboard }>("/procurement/dashboard");
}

export async function getProcurementStockOverview() {
  return apiRequest<{ data: ProcurementStockOverview }>("/procurement/stock");
}

export async function getProcurementStockAnalytics() {
  return apiRequest<{ data: ProcurementStockAnalytics }>("/procurement/stock/analytics");
}

export async function listGoodsReceipts(params?: { project_id?: number; per_page?: number }) {
  return apiRequest<Paginated<GoodsReceipt>>(`/procurement/goods-receipts${buildQuery(params)}`);
}

export async function createGoodsReceipt(payload: {
  purchase_order_id: number;
  project_id?: number;
  transport_order_id?: number;
  received_at?: string;
  notes?: string;
  quality_inspection_notes?: string;
  lines: Array<{
    purchase_order_line_id: number;
    qty_received: number;
    qty_accepted?: number;
    warehouse_item_id?: number;
    to_bin_id?: number | null;
    notes?: string;
  }>;
}) {
  return apiRequest<{ data: GoodsReceipt }>("/procurement/goods-receipts", {
    method: "POST",
    body: payload,
  });
}

export async function getGoodsReceipt(id: number) {
  return apiRequest<{ data: GoodsReceipt }>(`/procurement/goods-receipts/${id}`);
}

export async function updateGoodsReceiptLines(
  id: number,
  payload: {
    lines: Array<{
      id: number;
      qty_received: number;
      qty_accepted?: number;
      qty_rejected?: number;
      rejection_reason?: string | null;
      to_bin_id?: number | null;
      warehouse_item_id?: number | null;
      notes?: string | null;
    }>;
    notes?: string | null;
    quality_inspection_notes?: string | null;
    project_id?: number | null;
  },
) {
  return apiRequest<{ data: GoodsReceipt }>(`/procurement/goods-receipts/${id}/lines`, {
    method: "PATCH",
    body: payload,
  });
}

export async function uploadGoodsReceiptAttachment(
  id: number,
  payload: {
    file: File;
    type: "receipt_photo" | "invoice_photo" | "delivery_note" | "other_document";
  },
) {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("type", payload.type);

  return apiRequest<{
    data: { id: number; type: string; path: string; url: string };
  }>(`/procurement/goods-receipts/${id}/attachments`, {
    method: "POST",
    formData,
  });
}

export async function verifyGoodsReceipt(
  id: number,
  payload?: {
    lines?: Array<{
      id: number;
      qty_received: number;
      qty_accepted?: number;
      qty_rejected?: number;
      rejection_reason?: string | null;
      to_bin_id?: number | null;
      warehouse_item_id?: number | null;
      notes?: string | null;
    }>;
    notes?: string | null;
    quality_inspection_notes?: string | null;
  },
) {
  return apiRequest<{ data: GoodsReceipt }>(`/procurement/goods-receipts/${id}/verify`, {
    method: "POST",
    body: payload,
  });
}

export async function listGlassOrders(params?: {
  per_page?: number;
  project_id?: number;
}) {
  return apiRequest<Paginated<GlassOrder>>(`/procurement/glass-orders${buildQuery(params)}`);
}

export async function getGlassOrder(id: number) {
  return apiRequest<{ data: GlassOrder }>(`/procurement/glass-orders/${id}`);
}

export async function createGlassOrder(payload: {
  project_id: number;
  supplier_id?: number | null;
  specs?: GlassOrderSpecs;
  expected_delivery?: string | null;
  delivery_location?: string | null;
  notes?: string | null;
}) {
  return apiRequest<{ data: GlassOrder }>("/procurement/glass-orders", {
    method: "POST",
    body: payload,
  });
}

export async function updateGlassOrder(
  id: number,
  payload: {
    supplier_id?: number | null;
    specs?: GlassOrderSpecs;
    expected_delivery?: string | null;
    delivery_location?: string | null;
    notes?: string | null;
  },
) {
  return apiRequest<{ data: GlassOrder }>(`/procurement/glass-orders/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function markGlassOrderOrdered(id: number) {
  return apiRequest<{ data: GlassOrder }>(`/procurement/glass-orders/${id}/mark-ordered`, {
    method: "POST",
  });
}

export async function markGlassOrderDelivered(id: number) {
  return apiRequest<{ data: GlassOrder }>(`/procurement/glass-orders/${id}/mark-delivered`, {
    method: "POST",
  });
}

export async function listTransportOrders(params?: { per_page?: number }) {
  return apiRequest<Paginated<TransportOrder>>(`/procurement/transport${buildQuery(params)}`);
}

export async function createTransportOrder(payload: {
  purchase_order_id: number;
  transport_type: string;
  vehicle?: string;
  driver_id?: number;
  driver_name?: string;
  driver_phone?: string;
  expected_arrival?: string;
  notes?: string;
}) {
  return apiRequest<{ data: TransportOrder }>("/procurement/transport", {
    method: "POST",
    body: payload,
  });
}

export async function updateTransportStatus(
  id: number,
  payload: { status: "scheduled" | "in_transit" | "arrived"; actual_arrival?: string },
) {
  return apiRequest<{ data: TransportOrder }>(`/procurement/transport/${id}/status`, {
    method: "PATCH",
    body: payload,
  });
}

export async function getPurchaseOrderPdf(id: number) {
  return apiRequest<{ message: string }>(`/procurement/purchase-orders/${id}/pdf`);
}

export async function createRequisition(payload: {
  notes?: string;
  project_id?: number;
  supplier_id?: number;
  lines: Array<{
    description: string;
    quantity: number;
    required_quantity?: number;
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

export async function createLowStockRequisition(payload: {
  warehouse_item_ids: number[];
  supplier_id: number;
  notes?: string;
  lines?: Array<{ warehouse_item_id: number; quantity: number }>;
}) {
  return apiRequest<{ data: PurchaseRequisition }>(
    "/procurement/requisition-sources/low-stock/requisitions",
    {
      method: "POST",
      body: payload,
    },
  );
}

export async function createProjectMaterialsRequisition(payload: {
  project_id: number;
  project_bom_line_ids: number[];
  supplier_id: number;
  notes?: string;
  lines?: Array<{
    project_bom_line_id: number;
    quantity: number;
    warehouse_item_id?: number;
  }>;
}) {
  return apiRequest<{ data: PurchaseRequisition }>(
    "/procurement/requisition-sources/project-materials/requisitions",
    {
      method: "POST",
      body: payload,
    },
  );
}

export async function approveRequisition(id: number) {
  return apiRequest<{ data: PurchaseRequisition }>(`/procurement/requisitions/${id}/approve`, {
    method: "POST",
  });
}

export async function rejectRequisition(id: number, reason: string) {
  return apiRequest<{ data: PurchaseRequisition }>(`/procurement/requisitions/${id}/reject`, {
    method: "POST",
    body: { reason },
  });
}
