import { apiRequest } from "./client";
import type { Paginated } from "./projects";

export type ProductionOrderStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "on_hold";

export type ProductionStageValue =
  | "material_prep"
  | "qc_pre_check"
  | "cutting"
  | "fabrication"
  | "sash"
  | "glass_assembly"
  | "finishing"
  | "qc_post_fabrication";

export type ProductionOrder = {
  id: number;
  reference: string;
  project_id: number;
  status: ProductionOrderStatus;
  current_stage: ProductionStageValue;
  current_stage_label?: string;
  glass_assembly?: GlassAssemblyContext;
  fifo_position: number;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  assigned_team_lead: number | null;
  project?: {
    id: number;
    reference: string;
    name: string;
    stage: string;
    completion_percent?: number;
  } | null;
  stage_logs?: ProductionStageLog[];
  teams?: ProductionOrderTeam[];
  cutting_sheets?: CuttingSheetLine[];
  material_releases?: ProductionMaterialRelease[];
  created_at?: string;
  updated_at?: string;
};

export type ProductionStageLog = {
  id: number;
  production_order_id: number;
  stage: ProductionStageValue;
  stage_label?: string;
  status: string;
  completed_by: number | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
};

export type GlassAssemblyContext = {
  requires_glass: boolean;
  glass_present: boolean;
  can_start: boolean;
  can_skip: boolean;
  glass_order_status: string | null;
};

export type ProductionOrderTeam = {
  id: number;
  production_order_id: number;
  user_id: number;
  stage: ProductionStageValue;
  role: string;
  assigned_at: string;
  assigned_by: number;
  notes: string | null;
  user?: { id: number; name: string; email: string };
};

export type CuttingSheetLine = {
  id: number;
  production_order_id: number;
  project_bom_line_id: number;
  warehouse_item_id: number;
  profile_code: string;
  cut_length_mm: number;
  pieces: number;
  bar_length_mm: number | null;
  waste_mm: number | null;
  sort_order: number;
  generated_at: string;
};

export type ProductionMaterialRelease = {
  id: number;
  production_order_id: number;
  stock_reservation_line_id: number;
  stage: ProductionStageValue;
  qty_released: string;
  released_at: string;
  released_by: number;
};

export type ScheduleOrder = {
  id: number;
  reference: string;
  project_id: number;
  project_name?: string;
  project_stage?: string;
  project_completion_percent?: number;
  status: ProductionOrderStatus;
  current_stage: ProductionStageValue;
  current_stage_label?: string;
  fifo_position: number;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  teams?: ProductionOrderTeam[];
  material_readiness?: {
    label: "ready" | "partial" | "shortage" | "procurement_pending";
    shortage_lines: number;
    fully_reserved: number;
    total_lines: number;
    open_requisitions: number;
  };
  glass_status?: {
    status: string | null;
    order_number: string | null;
    pending_count: number;
  } | null;
};

export type OffcutInput = {
  item_id: number;
  length_mm: number;
  quantity_pieces?: number;
  bin_id?: number | null;
  storage_area?: "warehouse_deck" | "production_workspace";
  notes?: string | null;
};

function buildQuery(params?: Record<string, string | number | boolean | null | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const PRODUCTION_STAGE_LABELS: Record<ProductionStageValue, string> = {
  material_prep: "Material Preparation",
  qc_pre_check: "QC Pre-Check",
  cutting: "Cutting",
  fabrication: "Fabrication",
  sash: "Sash Fabrication",
  glass_assembly: "Glass Assembly",
  finishing: "Finishing",
  qc_post_fabrication: "QC Post-Fabrication",
};

export const CUTTING_STAGES: ProductionStageValue[] = [
  "material_prep",
  "qc_pre_check",
  "cutting",
];

export const ASSEMBLY_STAGES: ProductionStageValue[] = [
  "fabrication",
  "sash",
  "glass_assembly",
  "finishing",
  "qc_post_fabrication",
];

export async function listProductionOrders(params?: {
  project_id?: number;
  status?: string;
  per_page?: number;
  page?: number;
  assigned_to_me?: boolean;
  stage?: string;
}) {
  return apiRequest<Paginated<ProductionOrder>>(
    `/production/orders${buildQuery(params)}`,
  );
}

export async function getProductionOrder(id: number) {
  return apiRequest<{ data: ProductionOrder }>(`/production/orders/${id}`);
}

export async function listProductionSchedule() {
  return apiRequest<{ data: ScheduleOrder[] }>("/production/schedule");
}

export async function updateProductionSchedule(
  orderId: number,
  payload: { scheduled_start?: string | null; scheduled_end?: string | null },
) {
  return apiRequest<{ data: ProductionOrder }>(`/production/orders/${orderId}/schedule`, {
    method: "PATCH",
    body: payload,
  });
}

export async function startProductionStage(
  orderId: number,
  payload: { stage: ProductionStageValue; notes?: string },
) {
  return apiRequest<{ data: ProductionOrder }>(`/production/orders/${orderId}/start-stage`, {
    method: "POST",
    body: payload,
  });
}

export async function completeProductionStage(
  orderId: number,
  payload: {
    stage: ProductionStageValue;
    notes?: string;
    offcuts?: OffcutInput[];
  },
) {
  return apiRequest<{ data: ProductionOrder }>(`/production/orders/${orderId}/complete-stage`, {
    method: "POST",
    body: payload,
  });
}

export async function skipProductionStage(
  orderId: number,
  payload: { stage: "glass_assembly"; notes?: string },
) {
  return apiRequest<{ data: ProductionOrder }>(`/production/orders/${orderId}/skip-stage`, {
    method: "POST",
    body: payload,
  });
}

export async function listCuttingSheet(orderId: number) {
  return apiRequest<{ data: CuttingSheetLine[] }>(
    `/production/orders/${orderId}/cutting-sheet`,
  );
}

export async function generateCuttingSheet(orderId: number, replaceExisting = true) {
  return apiRequest<{ data: CuttingSheetLine[] }>(
    `/production/orders/${orderId}/cutting-sheet`,
    {
      method: "POST",
      body: { replace_existing: replaceExisting },
    },
  );
}

export async function updateCuttingSheetLine(
  orderId: number,
  lineId: number,
  payload: {
    cut_length_mm?: number;
    pieces?: number;
    bar_length_mm?: number | null;
    waste_mm?: number | null;
    reason: string;
  },
) {
  return apiRequest<{ data: CuttingSheetLine }>(
    `/production/orders/${orderId}/cutting-sheet/${lineId}`,
    {
      method: "PATCH",
      body: payload,
    },
  );
}

export async function logProductionOffcuts(orderId: number, offcuts: OffcutInput[]) {
  return apiRequest<{ success: boolean }>(`/production/orders/${orderId}/offcuts`, {
    method: "POST",
    body: { offcuts },
  });
}

export async function listProductionTeams(orderId: number) {
  return apiRequest<{ data: ProductionOrderTeam[] }>(
    `/production/orders/${orderId}/teams`,
  );
}

export async function updateProductionOrderStatus(
  orderId: number,
  payload: { status: ProductionOrderStatus },
) {
  return apiRequest<{ data: ProductionOrder }>(`/production/orders/${orderId}/status`, {
    method: "PATCH",
    body: payload,
  });
}

export async function assignProductionTeam(
  orderId: number,
  payload: {
    user_id: number;
    stage: ProductionStageValue;
    role: string;
    notes?: string;
  },
) {
  return apiRequest<{ data: ProductionOrderTeam }>(
    `/production/orders/${orderId}/teams`,
    {
      method: "POST",
      body: payload,
    },
  );
}
