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

export type ProjectSummary = {
  id: number;
  reference: string;
  name: string;
  type: string;
  location_type: string;
  site_address: string | null;
  resolved_site_address?: string | null;
  stage: string;
  completion_percent: number;
  fifo_order?: number | null;
  priority: string;
  quoted_amount: string | null;
  deposit_received: string | null;
  projected_end: string | null;
  project_manager?: { id: number; name: string; email: string } | null;
};

export type ProjectsDashboard = {
  total_projects: number;
  queued: number;
  awaiting_procurement: number;
  started: number;
  completed: number;
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

export function projectLabel(project: ProjectSummary): string {
  if (project.reference?.trim()) {
    return `${project.reference} · ${project.name}`;
  }
  return project.name;
}

export async function listProjects(params?: {
  search?: string;
  stage?: string;
  priority?: string;
  bucket?: string;
  per_page?: number;
}) {
  return apiRequest<Paginated<ProjectSummary>>(`/projects${buildQuery(params)}`);
}

export async function getProjectsDashboard() {
  return apiRequest<{ data: ProjectsDashboard }>("/projects/dashboard");
}

export type PipelineMaterialStatus =
  | "none"
  | "checking"
  | "reserved"
  | "shortage"
  | "procurement"
  | "ready";

export type PipelineProject = {
  id: number;
  reference: string;
  name: string;
  priority: string;
  fifo_order?: number | null;
  stage: string;
  completion_percent: number;
  projected_start: string | null;
  projected_end: string | null;
  project_manager: { id: number; name: string } | null;
  account: { id: number; name: string } | null;
  deal: { id: number; name: string | null; reference: string | null } | null;
  bom: { id: number; version: number; status: string } | null;
  material: {
    status: PipelineMaterialStatus;
    label: string | null;
    summary: {
      total_lines?: number;
      fully_reserved?: number;
      shortage_lines?: number;
      open_requisitions?: number;
      glass_orders_pending?: number;
    } | null;
    fifo_position: number | null;
  };
};

export type PipelineStageColumn = {
  stage: string;
  label: string;
  count: number;
  projects: PipelineProject[];
};

export type ProjectsPipelineResponse = {
  data: PipelineStageColumn[];
  meta?: {
    total_in_pipeline: number;
  };
};

export async function getProjectsPipeline() {
  return apiRequest<ProjectsPipelineResponse>("/projects/pipeline");
}

export type ProjectStageDepositConfirmation = {
  notes: string;
  confirmed_at?: string | null;
  recorded_by?: number;
  recorded_at?: string;
};

export type SiteAssessmentMeasurementItem = {
  label: string;
  width_ft?: number | null;
  height_ft?: number | null;
  notes?: string | null;
};

export type SiteAssessmentShape =
  | "rectangle"
  | "l_shape"
  | "pentagon"
  | "hexagon"
  | "irregular";

export type SiteAssessmentImage = {
  path: string;
  url: string | null;
  original_name: string;
};

export type SiteAssessmentSpatialItem = SiteAssessmentMeasurementItem & {
  shape?: SiteAssessmentShape | null;
  dimensions_description?: string | null;
  side_measurements_ft?: number[] | null;
  images?: SiteAssessmentImage[];
};

export const SITE_ASSESSMENT_SHAPE_OPTIONS: {
  value: SiteAssessmentShape;
  label: string;
  sideCount?: number;
}[] = [
  { value: "rectangle", label: "Rectangle" },
  { value: "l_shape", label: "L-shaped" },
  { value: "pentagon", label: "5 sides", sideCount: 5 },
  { value: "hexagon", label: "6 sides", sideCount: 6 },
  { value: "irregular", label: "Irregular / custom" },
];

export function siteAssessmentShapeLabel(shape?: SiteAssessmentShape | null): string {
  return (
    SITE_ASSESSMENT_SHAPE_OPTIONS.find((option) => option.value === shape)?.label ??
    "Rectangle"
  );
}

export function sideCountForShape(shape?: SiteAssessmentShape | null): number {
  return (
    SITE_ASSESSMENT_SHAPE_OPTIONS.find((option) => option.value === shape)?.sideCount ?? 0
  );
}

const MM_PER_FOOT = 304.8;

/** Normalize legacy mm keys to feet for display and forms. */
export function normalizeSiteAssessmentMeasurementItem(
  item: SiteAssessmentMeasurementItem & {
    width_mm?: number | null;
    height_mm?: number | null;
  },
): SiteAssessmentMeasurementItem {
  let width_ft = item.width_ft ?? null;
  let height_ft = item.height_ft ?? null;

  if (width_ft == null && item.width_mm != null) {
    width_ft = Math.round((item.width_mm / MM_PER_FOOT) * 100) / 100;
  }
  if (height_ft == null && item.height_mm != null) {
    height_ft = Math.round((item.height_mm / MM_PER_FOOT) * 100) / 100;
  }

  return {
    label: item.label,
    width_ft,
    height_ft,
    notes: item.notes ?? null,
  };
}

export function normalizeSiteAssessmentSpatialItem(
  item: SiteAssessmentSpatialItem & {
    width_mm?: number | null;
    height_mm?: number | null;
  },
): SiteAssessmentSpatialItem {
  return {
    ...normalizeSiteAssessmentMeasurementItem(item),
    shape: item.shape ?? "rectangle",
    dimensions_description: item.dimensions_description ?? null,
    side_measurements_ft: item.side_measurements_ft ?? null,
    images: item.images ?? [],
  };
}

export function normalizeSiteAssessmentMeasurementItems(
  items?: (SiteAssessmentMeasurementItem & {
    width_mm?: number | null;
    height_mm?: number | null;
  })[] | null,
): SiteAssessmentMeasurementItem[] {
  return (items ?? []).map(normalizeSiteAssessmentMeasurementItem);
}

export function normalizeSiteAssessmentSpatialItems(
  items?: (SiteAssessmentSpatialItem & {
    width_mm?: number | null;
    height_mm?: number | null;
  })[] | null,
): SiteAssessmentSpatialItem[] {
  return (items ?? []).map(normalizeSiteAssessmentSpatialItem);
}

export type ProjectStageSiteAssessment = {
  doors_count?: number | null;
  doors?: SiteAssessmentMeasurementItem[];
  windows_count?: number | null;
  windows?: SiteAssessmentMeasurementItem[];
  balconies_count?: number | null;
  balconies?: SiteAssessmentSpatialItem[];
  bathrooms_count?: number | null;
  bathrooms?: SiteAssessmentSpatialItem[];
  additional_images?: SiteAssessmentImage[];
  rooms_count?: number | null;
  floors_count?: number | null;
  measurements?: string | null;
  findings_notes?: string | null;
  recorded_by?: number;
  recorded_at?: string;
  operational_notes?: string | null;
  access_constraints?: string | null;
  fabrication_concerns?: string | null;
  operational_recorded_by?: number;
  operational_recorded_at?: string;
};

export type SiteAssessmentNotesPayload = {
  doors_count?: number;
  doors?: SiteAssessmentMeasurementItem[];
  windows_count?: number;
  windows?: SiteAssessmentMeasurementItem[];
  balconies_count?: number;
  balconies?: SiteAssessmentSpatialItem[];
  bathrooms_count?: number;
  bathrooms?: SiteAssessmentSpatialItem[];
  additional_images?: SiteAssessmentImage[];
  operational_notes?: string;
  access_constraints?: string;
  fabrication_concerns?: string;
};

export type ProjectStageMaterialCheck = {
  checked_at?: string;
  can_fully_reserve?: boolean;
  line_count?: number;
  shortage_lines?: number;
  lines?: Array<{
    project_bom_line_id?: number | null;
    item_id?: number | null;
    sku?: string | null;
    name?: string | null;
    category?: string | null;
    required?: string;
    effective_available?: string;
    shortage?: string;
  }>;
};

export type ProjectStageData = {
  deposit_received?: ProjectStageDepositConfirmation;
  site_assessment?: ProjectStageSiteAssessment;
  site_measurement?: import("@/lib/measurements/types").SiteMeasurementFormData & {
    approved_visit_id?: number;
    rough_sketch_path?: string | null;
    recorded_by?: number;
    recorded_at?: string;
  };
  material_check?: ProjectStageMaterialCheck;
};

export type ProjectStageReadiness = {
  has_design_document: boolean;
  has_bom_uploaded: boolean;
  has_bom_finalized: boolean;
};

/** Document types that satisfy the final design approval gate. */
export const DESIGN_DOCUMENT_TYPES = ["design", "design_pdf", "design_dwg"] as const;

export type ProjectDetail = ProjectSummary & {
  deal_id: number | null;
  contact_id: number | null;
  account_id: number | null;
  overage_buffer_percent: number | null;
  projected_start: string | null;
  actual_start: string | null;
  actual_end: string | null;
  sales_rep_id: number | null;
  project_manager_id: number | null;
  client_notes: string | null;
  internal_notes: string | null;
  stage_data?: ProjectStageData | null;
  stage_readiness?: ProjectStageReadiness;
  progress?: ProjectProgressTree | null;
  is_nairobi_two_phase: boolean;
  /** @deprecated Always false — Nairobi is two-phase, not fabrication-only. */
  is_fabrication_only_nairobi?: boolean;
  account?: { id: number; name: string } | null;
  contact?: { id: number; name?: string; first_name?: string; last_name?: string } | null;
  deal?: { id: number; name?: string; reference?: string } | null;
  sales_rep?: { id: number; name: string; email: string } | null;
  latest_bom?: {
    id: number;
    version: number;
    status: string;
    line_count?: number;
  } | null;
  engineers?: Array<{
    id: number;
    role: string;
    user: { id: number; name: string; email: string } | null;
  }>;
  created_at?: string;
  updated_at?: string;
};

export type ProjectProgressRoom = {
  id: number;
  label: string;
  room_key?: string | null;
  completion_percent: number;
  openings_total: number;
  openings_done: number;
  stage?: string | null;
};

export type ProjectProgressFloor = {
  id: number;
  type?: string;
  label: string;
  project_floor_id?: number | null;
  completion_percent: number;
  openings_total: number;
  openings_done: number;
  stage?: string | null;
  rooms: ProjectProgressRoom[];
  wave_id?: number;
  wave_number?: number;
};

export type ProjectProgressWave = {
  id: number;
  wave_number: number;
  label: string | null;
  status: string;
  stage?: string | null;
  completion_percent: number;
  floors: ProjectProgressFloor[];
};

export type ProjectProgressTree = {
  waves: ProjectProgressWave[];
  floors: ProjectProgressFloor[];
  rooms: Array<ProjectProgressRoom & { floor_label?: string; wave_id?: number }>;
};

export type CreateProjectPayload = {
  name: string;
  account_id: number;
  deal_id?: number | null;
  contact_id?: number | null;
  type?: string;
  location_type?: string;
  site_address?: string;
  priority?: string;
  quoted_amount?: number;
  deposit_received?: number;
  overage_buffer_percent?: number;
  projected_start?: string;
  projected_end?: string;
  client_notes?: string;
  internal_notes?: string;
};

export type BomResolutionStatus = "matched" | "unmatched" | "procurement_only";

export type BomExtractedLine = {
  row_number: number;
  material_name: string;
  material_code: string | null;
  quantity: number;
  line_type: string;
  measurement_mm: number | null;
  unit_of_measure?: string | null;
  width_mm?: number | null;
  height_mm?: number | null;
  opening_code?: string | null;
  source_system?: string | null;
  series?: string | null;
  compatible_profile_code?: string | null;
  notes: string | null;
  warehouse_item_id: number | null;
  warehouse_match: boolean;
  resolution_status: BomResolutionStatus;
};

export type BomExtractionSummary = {
  total_rows: number;
  matched: number;
  unmatched: number;
  procurement_only: number;
};

export type BomExtractionResult = {
  lines: BomExtractedLine[];
  summary: BomExtractionSummary;
  source_filename: string | null;
};

export type ProjectBomLine = {
  id: number;
  line_type: string;
  warehouse_item_id: number | null;
  material_code: string | null;
  material_name: string;
  quantity: string | number;
  measurement_mm: number | null;
  unit_of_measure?: string | null;
  width_mm?: number | null;
  height_mm?: number | null;
  opening_code?: string | null;
  source_system?: string | null;
  series?: string | null;
  bars_needed?: number | null;
  reserve_qty?: string | number | null;
  reserve_uom?: string | null;
  is_procurement_only: boolean;
  is_glass: boolean;
  is_addon: boolean;
  notes: string | null;
  warehouse_item?: { id: number; sku: string; name: string } | null;
};

export type ProjectBomExtractedData = {
  lines: BomExtractedLine[];
  summary: BomExtractionSummary | null;
  source_filename: string | null;
  imported_at?: string | null;
};

export type ProjectBom = {
  id: number | null;
  project_id: number | null;
  version: number | null;
  status: string | null;
  finalized_at?: string | null;
  notes?: string | null;
  extracted_data?: ProjectBomExtractedData | null;
  lines: ProjectBomLine[];
};

export type ProjectDocument = {
  id: number;
  project_id: number;
  type: string;
  filename: string;
  version: number;
  url: string;
  metadata?: {
    source?: string;
    code?: string | null;
    series?: string | null;
    quantity?: number | string | null;
    colour?: string | null;
    description?: string | null;
    dimensions?: {
      width_mm?: number | null;
      height_mm?: number | null;
      sqm?: number | null;
      weight_kg?: number | null;
      sill_height?: number | null;
      source?: string | null;
    } | null;
    has_elevation_image?: boolean;
    fabrication_document_id?: number;
    frame_profiles?: FabricationProfileRow[];
    sash_profiles?: FabricationProfileRow[];
    hardware?: FabricationHardwareRow[];
    glass?: FabricationGlassRow[];
    sash_openings?: FabricationSashOpeningRow[];
    packaging?: string | Record<string, unknown> | null;
    bom_tags?: {
      bom_id?: number | null;
      bom_line_ids?: number[];
      tagged_at?: string | null;
      tagged_by?: number | null;
    } | null;
    project?: { name?: string | null; order_no?: string | null } | null;
    summary?: { total_items?: number; source_filename?: string | null } | null;
    items?: unknown[];
  } | null;
  uploaded_by_user?: { id: number; name: string; email: string } | null;
  created_at?: string;
};

export type FabricationProfileRow = {
  name?: string | null;
  code_no?: string | null;
  length_mm?: number | null;
  qty?: number | null;
  corner?: string | null;
  mark?: string | null;
};

export type FabricationHardwareRow = {
  name?: string | null;
  specification?: string | null;
  unit?: string | null;
  qty?: number | null;
  purpose?: string | null;
  mark?: string | null;
};

export type FabricationGlassRow = {
  name?: string | null;
  width_mm?: number | null;
  height_mm?: number | null;
  qty?: number | null;
  specification?: string | null;
  mark?: string | null;
};

export type FabricationSashOpeningRow = {
  type?: string | null;
  opening?: string | null;
  width_mm?: number | null;
  height_mm?: number | null;
  qty?: number | null;
  mark?: string | null;
};

export type ProjectMaterialLine = {
  bom_line_id: number;
  line_type: string;
  material_code: string | null;
  material_name: string;
  warehouse_item_id: number | null;
  required_qty: string;
  reserved_qty: string;
  reservation_target_qty?: string;
  reservation_uom?: string | null;
  sku_cuts_total?: number | null;
  shortage_qty: string;
  warehouse_available?: string | null;
  offcut_usable?: string | null;
  bars_needed?: number | null;
  stock_check_shortage?: string | null;
  is_fully_reserved?: boolean;
  is_combined_aluminium?: boolean;
  measurement_mm: number | null;
  is_procurement_only: boolean;
  is_glass: boolean;
  is_addon: boolean;
  quantity_to_requisition: string;
  requisition_ids: number[];
  requisitions: Array<{ id: number; reference: string; status: string }>;
  can_create_requisition: boolean;
};

export type ProjectProcurementReceiptLine = {
  id: number;
  description: string;
  warehouse_item_id: number | null;
  warehouse_item_sku: string | null;
  warehouse_item_name: string | null;
  warehouse_item_category: string | null;
  is_procurement_only: boolean;
  qty_received: string;
  qty_accepted: string;
  qty_rejected: string;
  to_bin_id: number | null;
  notes: string | null;
};

export type ProjectProcurementReceipt = {
  id: number;
  grn_number: string;
  status: string;
  received_at: string | null;
  verified_at: string | null;
  notes: string | null;
  quality_inspection_notes: string | null;
  putaway_notes: string | null;
  purchase_order: {
    id: number;
    reference: string;
    supplier_name: string | null;
  } | null;
  lines: ProjectProcurementReceiptLine[];
};

export type ProjectMaterialReleasedLine = {
  item_id: number;
  sku?: string | null;
  name?: string | null;
  unit_of_measure?: string | null;
  quantity_released: string;
  quantity_reserved: string;
  reservation_ids: number[];
};

export type ProjectMaterialStatus = {
  project_id: number;
  stage: string;
  bom_version: number | null;
  summary: {
    total_lines: number;
    unique_materials?: number;
    warehouse_lines: number;
    procurement_only_lines: number;
    fully_reserved: number;
    reservation_units_total?: number;
    reservation_units_reserved?: number;
    reservation_complete?: boolean;
    shortage_lines: number;
    open_requisitions: number;
    glass_orders_pending: number;
    materials_released_lines?: number;
    can_fully_reserve?: boolean;
    can_reserve_now?: boolean;
  };
  stock_check?: ProjectStageMaterialCheck;
  lines: ProjectMaterialLine[];
  fifo_position: number | null;
  goods_receipts?: ProjectProcurementReceipt[];
  materials_released?: ProjectMaterialReleasedLine[];
};

export type ProjectMaterialShortageEntry = {
  project: {
    id: number;
    reference: string;
    name: string;
    stage: string;
    priority: string;
    fifo_order?: number | null;
    account: { id: number; name: string } | null;
    project_manager: { id: number; name: string } | null;
    bom: { id: number; version: number; status: string } | null;
  };
  summary: ProjectMaterialStatus["summary"];
  shortage_lines: ProjectMaterialLine[];
  actionable_lines: ProjectMaterialLine[];
  requisitioned_lines: ProjectMaterialLine[];
};

export async function createProject(payload: CreateProjectPayload) {
  return apiRequest<{ data: ProjectDetail }>("/projects", {
    method: "POST",
    body: payload,
  });
}

export async function getProject(id: number) {
  return apiRequest<{ data: ProjectDetail }>(`/projects/${id}`);
}

export async function getProjectWaves(projectId: number) {
  return apiRequest<{ data: ProjectProgressTree }>(`/projects/${projectId}/waves`);
}

export async function bootstrapProjectWaves(projectId: number) {
  return apiRequest<{
    data: {
      wave: { id: number; wave_number: number; label: string | null; status: string };
      scopes_created: number;
      floors_linked: number;
      progress: ProjectProgressTree;
    };
  }>(`/projects/${projectId}/waves/bootstrap-from-measurements`, {
    method: "POST",
    body: {},
  });
}

export async function createProjectWave(
  projectId: number,
  payload: { label?: string; scope_ids?: number[] },
) {
  return apiRequest<{
    data: {
      id: number;
      wave_number: number;
      label: string | null;
      status: string;
      scopes: Array<{ id: number; type: string; label: string }>;
    };
  }>(`/projects/${projectId}/waves`, {
    method: "POST",
    body: payload,
  });
}

export async function updateProject(id: number, payload: Partial<CreateProjectPayload>) {
  return apiRequest<{ data: ProjectDetail }>(`/projects/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function advanceProjectStage(
  id: number,
  payload: {
    stage: string;
    reason?: string;
    driver_id?: number;
    vehicle_reg?: string;
    vehicle_details?: string;
    packing_notes?: string;
    deposit_confirmation?: ProjectStageDepositConfirmation;
    site_assessment?: ProjectStageSiteAssessment;
  },
) {
  return apiRequest<{ data: ProjectDetail }>(`/projects/${id}/advance-stage`, {
    method: "POST",
    body: payload,
  });
}

export type DesignChangeOrderStatus =
  | "drafted"
  | "awaiting_remeasure"
  | "design_in_progress"
  | "bom_revised"
  | "materials_ready"
  | "remake_in_production"
  | "closed"
  | "cancelled";

export type DesignChangeItem = {
  id: string;
  description: string;
  qty: number;
  unit: string;
  change_type: "remake" | "material" | string;
  done: boolean;
  warehouse_item_id?: number | null;
  profile_code?: string | null;
  project_bom_line_id?: number | null;
  cut_length_mm?: number | null;
  disposition?: "remake" | "to_offcut" | "material_only" | string;
  scrapped_to_offcut?: boolean;
  offcut_ids?: number[];
};

export type DesignChangeOrder = {
  id: number;
  project_id: number;
  field_non_conformity_id: number | null;
  field_installation_unit_id?: number | null;
  field_unit?: {
    id: number;
    unit_label: string;
    unit_floor?: string | null;
    room_location?: string | null;
    opening_ref?: string | null;
    product_type?: string | null;
    status?: string;
  } | null;
  status: DesignChangeOrderStatus | string;
  reason: string | null;
  measurement_notes: Record<string, unknown> | string[] | null;
  change_path?: "full_remake" | "minor_material" | string | null;
  change_items?: DesignChangeItem[];
  scope_bom_line_ids: number[] | null;
  remeasure_site_visit_id: number | null;
  revised_bom_version: number | null;
  parent_production_order_id: number | null;
  remake_production_order_id: number | null;
  requested_by: number | null;
  approved_by: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  project?: {
    id: number;
    reference: string;
    name: string;
    stage: string;
  };
  non_conformity?: {
    id: number;
    nc_type: string;
    severity: string;
    title: string;
    status: string;
  } | null;
  parent_production_order?: {
    id: number;
    reference: string;
    status: string;
  } | null;
  remake_production_order?: {
    id: number;
    reference: string;
    status: string;
  } | null;
  requester?: { id: number; name: string } | null;
  approver?: { id: number; name: string } | null;
};

export async function listDesignChangeOrders(projectId: number) {
  return apiRequest<{ data: DesignChangeOrder[] }>(
    `/projects/${projectId}/design-change-orders`,
  );
}

export async function createDesignChangeOrder(
  projectId: number,
  payload: {
    reason?: string;
    measurement_notes?: Record<string, unknown> | string;
    scope_bom_line_ids?: number[];
    field_non_conformity_id?: number;
    parent_production_order_id?: number;
  },
) {
  return apiRequest<{ data: DesignChangeOrder }>(
    `/projects/${projectId}/design-change-orders`,
    { method: "POST", body: payload },
  );
}

export async function getDesignChangeOrder(id: number) {
  return apiRequest<{ data: DesignChangeOrder }>(
    `/projects/design-change-orders/${id}`,
  );
}

export async function approveDesignChangeOrder(
  id: number,
  payload: { target_stage: string },
) {
  return apiRequest<{ data: DesignChangeOrder }>(
    `/projects/design-change-orders/${id}/approve`,
    { method: "POST", body: payload },
  );
}

export async function createDesignChangeRemake(
  id: number,
  payload?: { start_stage?: string },
) {
  return apiRequest<{ data: DesignChangeOrder }>(
    `/projects/design-change-orders/${id}/create-remake`,
    { method: "POST", body: payload ?? {} },
  );
}

export async function updateDesignChangeOrder(
  id: number,
  payload: {
    reason?: string;
    notes?: string;
    change_path?: "full_remake" | "minor_material";
    items?: Array<{
      id?: string;
      description: string;
      qty?: number;
      unit?: string;
      change_type?: "remake" | "material";
      done?: boolean;
      warehouse_item_id?: number | null;
      profile_code?: string | null;
      project_bom_line_id?: number | null;
      cut_length_mm?: number | null;
      disposition?: "remake" | "to_offcut" | "material_only";
    }>;
  },
) {
  return apiRequest<{ data: DesignChangeOrder }>(
    `/projects/design-change-orders/${id}`,
    { method: "PATCH", body: payload },
  );
}

export type DesignChangeProfileOption = {
  warehouse_item_id: number;
  sku?: string | null;
  name?: string | null;
  profile_code?: string | null;
  cut_length_mm?: number | null;
  pieces?: number;
  project_bom_line_id?: number | null;
};

export async function listDesignChangeProfiles(id: number) {
  return apiRequest<{ data: DesignChangeProfileOption[] }>(
    `/projects/design-change-orders/${id}/available-profiles`,
  );
}

export async function scrapDesignChangeToOffcuts(
  id: number,
  payload?: { item_ids?: string[] },
) {
  return apiRequest<{
    data: {
      offcuts: Array<{
        offcut_id: number;
        offcut_number: string;
        item_id: number;
        length_mm: number;
        quantity_pieces: number;
        dco_item_id: string;
      }>;
      items: DesignChangeItem[];
      design_change_order: DesignChangeOrder;
    };
  }>(`/projects/design-change-orders/${id}/scrap-to-offcuts`, {
    method: "POST",
    body: payload ?? {},
  });
}

export async function requestDesignChangeMaterials(
  id: number,
  payload?: { item_ids?: string[] },
) {
  return apiRequest<{
    data: {
      material_request: {
        id: number;
        status: string;
        project_id: number;
        reason: string | null;
        lines: Array<{
          id: number;
          warehouse_item_id: number;
          quantity_requested: string;
          notes: string | null;
        }>;
      };
      design_change_order: DesignChangeOrder;
    };
  }>(`/projects/design-change-orders/${id}/request-materials`, {
    method: "POST",
    body: payload ?? {},
  });
}

export async function releaseDesignChangeToProduction(id: number) {
  return apiRequest<{ data: DesignChangeOrder }>(
    `/projects/design-change-orders/${id}/release-to-production`,
    { method: "POST" },
  );
}

export async function completeMinorDesignChange(
  id: number,
  payload?: { advance_to_stage?: string },
) {
  return apiRequest<{ data: DesignChangeOrder }>(
    `/projects/design-change-orders/${id}/complete-minor`,
    { method: "POST", body: payload ?? {} },
  );
}

export async function closeDesignChangeOrder(id: number) {
  return apiRequest<{ data: DesignChangeOrder }>(
    `/projects/design-change-orders/${id}/close`,
    { method: "POST" },
  );
}

export type ProjectDelay = {
  id: number;
  project_id: number;
  stage: string;
  reason: string;
  days_lost: number;
  notes: string | null;
  logged_at: string | null;
};

export async function logProjectDelay(
  projectId: number,
  payload: {
    stage: string;
    reason: string;
    days_lost: number;
    notes?: string;
  },
) {
  return apiRequest<{ data: ProjectDelay }>(`/projects/${projectId}/delays`, {
    method: "POST",
    body: payload,
  });
}

export async function updateProjectSiteAssessmentNotes(
  id: number,
  payload: SiteAssessmentNotesPayload,
) {
  return apiRequest<{ data: ProjectDetail }>(`/projects/${id}/site-assessment-notes`, {
    method: "PATCH",
    body: payload,
  });
}

export type ScheduleProjectMeasurementVisitPayload = {
  title?: string;
  assigned_field_officer_id: number;
  visit_date: string;
  visit_time?: string;
  site_address?: string;
  notes_for_field_officer?: string;
};

export async function fetchProjectMeasurementVisits(projectId: number) {
  return apiRequest<{ data: import("@/lib/api/crm/types").ApiSiteVisit[] }>(
    `/projects/${projectId}/measurement-visits`,
  );
}

export async function scheduleProjectMeasurementVisit(
  projectId: number,
  payload: ScheduleProjectMeasurementVisitPayload,
) {
  return apiRequest<{ data: import("@/lib/api/crm/types").ApiSiteVisit }>(
    `/projects/${projectId}/measurement-visits`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export function hasProductionMeasurementData(project: ProjectDetail): boolean {
  const siteMeasurement = project.stage_data?.site_measurement;
  if (siteMeasurement && (siteMeasurement.lines?.length ?? 0) > 0) {
    return true;
  }

  return hasSiteAssessmentOperationalData(project.stage_data?.site_assessment);
}

/** Site assessment (or later) — not awaiting/deposit-only stages. */
export function projectStageAllowsProductionMeasurements(stage: string): boolean {
  return stage !== "awaiting_deposit" && stage !== "deposit_received";
}

export function hasAssignedProductionMeasurementVisit(
  visits: Array<{
    measurement_context?: "quotation" | "production" | null;
    assigned_field_officer_id?: number | null;
    assigned_field_officer?: { id: number } | null;
  }>,
): boolean {
  return visits.some((visit) => {
    const context = visit.measurement_context ?? "production";
    if (context !== "production") return false;
    return Boolean(
      visit.assigned_field_officer_id ?? visit.assigned_field_officer?.id,
    );
  });
}

export async function uploadSiteAssessmentImage(projectId: number, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<{ data: SiteAssessmentImage }>(
    `/projects/${projectId}/site-assessment/images`,
    {
      method: "POST",
      formData,
    },
  );
}

export async function deleteSiteAssessmentImage(projectId: number, path: string) {
  return apiRequest<{ data: { deleted: boolean } }>(
    `/projects/${projectId}/site-assessment/images`,
    {
      method: "DELETE",
      body: { path },
    },
  );
}

export function hasSiteAssessmentImages(
  assessment?: ProjectStageSiteAssessment | null,
): boolean {
  if (!assessment) return false;

  if ((assessment.additional_images?.length ?? 0) > 0) {
    return true;
  }

  return [...(assessment.balconies ?? []), ...(assessment.bathrooms ?? [])].some(
    (item) => (item.images?.length ?? 0) > 0,
  );
}

export function hasSiteAssessmentOperationalData(
  assessment?: ProjectStageSiteAssessment | null,
): boolean {
  if (!assessment) return false;

  const hasCounts =
    (assessment.doors_count ?? 0) > 0 ||
    (assessment.windows_count ?? 0) > 0 ||
    (assessment.balconies_count ?? 0) > 0 ||
    (assessment.bathrooms_count ?? 0) > 0;

  const hasItems =
    (assessment.doors?.length ?? 0) > 0 ||
    (assessment.windows?.length ?? 0) > 0 ||
    (assessment.balconies?.length ?? 0) > 0 ||
    (assessment.bathrooms?.length ?? 0) > 0;

  const hasNotes = Boolean(
    assessment.operational_notes?.trim() ||
      assessment.access_constraints?.trim() ||
      assessment.fabrication_concerns?.trim(),
  );

  return hasCounts || hasItems || hasNotes || hasSiteAssessmentImages(assessment);
}

export async function getProjectBom(projectId: number) {
  return apiRequest<{ data: ProjectBom }>(`/projects/${projectId}/bom`);
}

export async function extractProjectBom(projectId: number, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<{ data: BomExtractionResult }>(`/projects/${projectId}/bom/extract`, {
    method: "POST",
    formData,
  });
}

export async function importProjectBom(
  projectId: number,
  payload: {
    lines: BomExtractedLine[];
    extracted_data?: BomExtractionResult;
    file?: File;
    notes?: string;
  },
) {
  if (payload.file) {
    const formData = new FormData();
    formData.append("lines", JSON.stringify(payload.lines));
    if (payload.extracted_data) {
      formData.append("extracted_data", JSON.stringify(payload.extracted_data));
    }
    formData.append("file", payload.file);
    if (payload.notes?.trim()) {
      formData.append("notes", payload.notes.trim());
    }
    return apiRequest<{ data: ProjectBom }>(`/projects/${projectId}/bom/import`, {
      method: "POST",
      formData,
    });
  }

  return apiRequest<{ data: ProjectBom }>(`/projects/${projectId}/bom/import`, {
    method: "POST",
    body: {
      lines: payload.lines,
      extracted_data: payload.extracted_data,
      notes: payload.notes?.trim() || undefined,
    },
  });
}

/** @deprecated Prefer extractProjectBom + importProjectBom */
export async function uploadProjectBom(projectId: number, file: File, notes?: string) {
  const formData = new FormData();
  formData.append("file", file);
  if (notes?.trim()) {
    formData.append("notes", notes.trim());
  }
  return apiRequest<{ data: ProjectBom }>(`/projects/${projectId}/bom`, {
    method: "POST",
    formData,
  });
}

export async function finalizeProjectBom(projectId: number) {
  return apiRequest<{ data: ProjectBom }>(`/projects/${projectId}/finalize-bom`, {
    method: "POST",
    body: {},
  });
}

export async function getProjectDocuments(projectId: number) {
  return apiRequest<{ data: ProjectDocument[] }>(`/projects/${projectId}/documents`);
}

export async function uploadProjectDocument(
  projectId: number,
  file: File,
  type: string,
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);
  return apiRequest<{ data: ProjectDocument }>(`/projects/${projectId}/documents`, {
    method: "POST",
    formData,
  });
}

export async function tagProjectDocumentBom(
  projectId: number,
  documentId: number,
  bomLineIds: number[],
) {
  return apiRequest<{ data: ProjectDocument }>(
    `/projects/${projectId}/documents/${documentId}`,
    {
      method: "PATCH",
      body: { bom_line_ids: bomLineIds },
    },
  );
}

export async function getProjectMaterialStatus(projectId: number) {
  return apiRequest<{ data: ProjectMaterialStatus }>(
    `/projects/${projectId}/material-status`,
  );
}

export async function reserveProjectMaterials(
  projectId: number,
  payload?: { notes?: string },
) {
  return apiRequest<{
    success: boolean;
    message?: string;
    topped_up?: boolean;
    project?: { id: number; stage: string };
    reservation?: { id: number; fifo_sequence: number; status: string };
    check?: unknown;
  }>(`/projects/${projectId}/reserve-materials`, {
    method: "POST",
    body: payload ?? {},
  });
}

export async function adjustProjectReservation(
  projectId: number,
  payload: {
    item_id: number;
    quantity_reserved: number | string;
    bom_line_ref?: string;
    notes?: string;
  },
) {
  return apiRequest<{
    success: boolean;
    previous_qty: string;
    quantity_reserved: string;
    reservation?: { id: number; status: string };
    message?: string;
  }>(`/projects/${projectId}/adjust-reservation`, {
    method: "POST",
    body: payload,
  });
}

export async function getProjectMaterialShortages() {
  return apiRequest<{
    data: ProjectMaterialShortageEntry[];
    meta?: { total_projects?: number };
  }>("/projects/material-shortages");
}


export function formatLocationType(locationType: string): string {
  if (locationType === "nairobi") {
    return "Nairobi (fab → install)";
  }
  if (locationType === "outside_nairobi") {
    return "Outside Nairobi (full install)";
  }
  return locationType.replace(/_/g, " ");
}

export function projectHasDesignDocument(project: Pick<ProjectDetail, "stage_readiness">): boolean {
  return project.stage_readiness?.has_design_document ?? false;
}

export function projectHasBomUploaded(project: Pick<ProjectDetail, "stage_readiness" | "latest_bom">): boolean {
  if (project.stage_readiness?.has_bom_uploaded) {
    return true;
  }

  const bom = project.latest_bom;
  return Boolean(bom && (bom.line_count ?? 0) > 0);
}

export function projectHasBomFinalized(project: Pick<ProjectDetail, "stage_readiness" | "latest_bom">): boolean {
  if (project.stage_readiness?.has_bom_finalized) {
    return true;
  }

  return project.latest_bom?.status === "finalized";
}

export function canAdvanceFromFinalDesignApproval(project: ProjectDetail): {
  ok: boolean;
  missingDesign: boolean;
  missingBomFinalize: boolean;
} {
  const missingDesign = !projectHasDesignDocument(project);
  const missingBomFinalize = !projectHasBomFinalized(project);

  return {
    ok: !missingDesign && !missingBomFinalize,
    missingDesign,
    missingBomFinalize,
  };
}

/** Requirements to enter final design approval from site assessment. */
export function canAdvanceToFinalDesignApproval(project: ProjectDetail): {
  ok: boolean;
  missingMeasurement: boolean;
  missingDesign: boolean;
  missingBomUpload: boolean;
} {
  const missingMeasurement = !hasProductionMeasurementData(project);
  const missingDesign = !projectHasDesignDocument(project);
  const missingBomUpload = !projectHasBomUploaded(project);

  return {
    ok: !missingMeasurement && !missingDesign && !missingBomUpload,
    missingMeasurement,
    missingDesign,
    missingBomUpload,
  };
}

/** User-friendly stage labels (match backend config/bibo.php). */
export const PROJECT_STAGE_LABELS: Record<string, string> = {
  awaiting_deposit: "Awaiting deposit",
  deposit_received: "Deposit received",
  site_assessment: "Site assessment",
  final_design_approval: "Final design approval",
  bom_finalized: "BOM finalized",
  material_check: "Material check",
  materials_reserved: "Materials reserved",
  awaiting_procurement: "Awaiting procurement",
  materials_ready: "Materials ready",
  materials_released: "Staged for production",
  cutting_stage: "Cutting",
  fabrication_stage: "Fabrication",
  glass_assembly: "Glass assembly",
  qc_pre_installation: "QC pre-installation",
  in_transit: "In transit",
  installation: "Installation",
  site_qc: "Site QC",
  snagging: "Snagging",
  project_complete: "Complete",
};

/** Stages driven by system/events — no manual advance for PM. */
export const AUTO_PROJECT_STAGES = new Set(["material_check"]);

/** Waiting hints when the current user cannot advance. */
export const STAGE_WAITING_MESSAGES: Record<string, string> = {
  material_check: "Waiting for warehouse to check stock and reserve materials.",
  materials_reserved:
    "Materials reserved — warehouse must confirm ready for production once stock is fully reserved to this project.",
  awaiting_procurement: "Waiting for procurement to fulfill material shortages.",
  materials_ready:
    "Stock reserved in warehouse — release to a named receiver (stock deducted at handover).",
  materials_released:
    "Materials handed to production — stock already deducted at warehouse release.",
};

/** Reservation completeness uses combined aluminium SKUs (one unit per nested profile). */
export function reservationUnitsTotal(
  summary: ProjectMaterialStatus["summary"] | null | undefined,
): number {
  if (!summary) return 0;
  return summary.reservation_units_total ?? summary.warehouse_lines ?? 0;
}

export function reservationUnitsReserved(
  summary: ProjectMaterialStatus["summary"] | null | undefined,
): number {
  if (!summary) return 0;
  return summary.reservation_units_reserved ?? summary.fully_reserved ?? 0;
}

export function isReservationComplete(
  summary: ProjectMaterialStatus["summary"] | null | undefined,
): boolean {
  if (!summary) return false;
  if (typeof summary.reservation_complete === "boolean") {
    return summary.reservation_complete;
  }
  const total = reservationUnitsTotal(summary);
  return total > 0 && reservationUnitsReserved(summary) >= total;
}

/** Gate for warehouse advance to materials_ready. */
export function canAdvanceToMaterialsReady(
  summary: ProjectMaterialStatus["summary"] | null | undefined,
): {
  ok: boolean;
  reason: string | null;
  shortageLines: boolean;
  openRequisitions: boolean;
  glassPending: boolean;
  missingBom: boolean;
} {
  if (!summary) {
    return {
      ok: false,
      reason:
        "Load material status first. Materials ready requires full reservation to this project.",
      shortageLines: true,
      openRequisitions: false,
      glassPending: false,
      missingBom: true,
    };
  }

  const unitsTotal = reservationUnitsTotal(summary);
  const unitsReserved = reservationUnitsReserved(summary);
  const notFullyReserved = unitsTotal > 0 && unitsReserved < unitsTotal;
  const openRequisitions =
    (summary.open_requisitions ?? 0) > 0 && notFullyReserved;
  const glassPending = (summary.glass_orders_pending ?? 0) > 0;
  const missingBom = (summary.total_lines ?? 0) === 0;

  let reason: string | null = null;
  if (missingBom) {
    reason = "Cannot mark materials ready: upload and finalize a BOM first.";
  } else if (notFullyReserved) {
    const missing = unitsTotal - unitsReserved;
    reason = `Cannot mark materials ready: ${missing} material unit(s) still short or not reserved (aluminium profiles count once per SKU). Stock reserved for other projects does not count.`;
  } else if (openRequisitions) {
    reason = "Cannot mark materials ready: open procurement requisitions remain.";
  } else if (glassPending) {
    reason = "Cannot mark materials ready: glass orders are still pending.";
  }

  return {
    ok: !notFullyReserved && !openRequisitions && !glassPending && !missingBom,
    reason,
    shortageLines: notFullyReserved,
    openRequisitions,
    glassPending,
    missingBom,
  };
}

/** PM-manual next stages from the current stage. */
export const PM_MANUAL_NEXT_STAGES: Record<string, string[]> = {
  awaiting_deposit: ["deposit_received"],
  deposit_received: ["site_assessment"],
  site_assessment: ["final_design_approval"],
  final_design_approval: ["bom_finalized"],
  qc_pre_installation: ["in_transit", "snagging"],
  in_transit: ["installation"],
  installation: [],
  site_qc: ["snagging", "project_complete"],
  snagging: ["project_complete"],
};

/** Warehouse manual advance targets. */
export const WAREHOUSE_MANUAL_NEXT_STAGES: Record<string, string[]> = {
  materials_reserved: ["materials_ready"],
  awaiting_procurement: ["materials_ready"],
  materials_ready: ["materials_released"],
};

/** Production manager manual advance targets. */
export const PRODUCTION_MANUAL_NEXT_STAGES: Record<string, string[]> = {
  materials_ready: ["cutting_stage"],
  materials_released: ["cutting_stage"],
  cutting_stage: ["fabrication_stage"],
  fabrication_stage: ["glass_assembly"],
  glass_assembly: ["qc_pre_installation"],
};

export function formatProjectStage(stage: string): string {
  return PROJECT_STAGE_LABELS[stage] ?? stage
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function contextualProjectStageLabel(
  stage: string,
  materialSummary?: ProjectMaterialStatus["summary"] | null,
): string {
  if (
    stage === "materials_reserved" &&
    materialSummary &&
    !isReservationComplete(materialSummary)
  ) {
    return "Awaiting materials reservation";
  }

  if (
    stage === "material_check" &&
    materialSummary &&
    materialSummary.shortage_lines === 0 &&
    !isReservationComplete(materialSummary)
  ) {
    return "Awaiting materials reservation";
  }

  return formatProjectStage(stage);
}

export function getStageWaitingMessage(stage: string): string | null {
  return STAGE_WAITING_MESSAGES[stage] ?? null;
}

export type StageAdvancePermission =
  | "projects.advance_stage"
  | "projects.advance_stage_sales"
  | "projects.advance_stage_warehouse"
  | "projects.advance_stage_production";

const STAGE_ADVANCE_BY_PERMISSION: Record<
  StageAdvancePermission,
  Record<string, string[]>
> = {
  "projects.advance_stage": PM_MANUAL_NEXT_STAGES,
  "projects.advance_stage_sales": {
    awaiting_deposit: ["deposit_received"],
    deposit_received: ["site_assessment"],
    site_assessment: ["final_design_approval"],
  },
  "projects.advance_stage_warehouse": WAREHOUSE_MANUAL_NEXT_STAGES,
  "projects.advance_stage_production": PRODUCTION_MANUAL_NEXT_STAGES,
};

export function getManualNextStages(
  stage: string,
  permissions: string[],
): string[] {
  const targets = new Set<string>();

  if (
    permissions.includes("projects.manage") ||
    permissions.includes("projects.view_all") ||
    permissions.includes("*")
  ) {
    for (const map of Object.values(STAGE_ADVANCE_BY_PERMISSION)) {
      map[stage]?.forEach((target) => targets.add(target));
    }
    return Array.from(targets);
  }

  for (const permission of permissions) {
    const map = STAGE_ADVANCE_BY_PERMISSION[permission as StageAdvancePermission];
    if (!map?.[stage]) continue;
    map[stage].forEach((target) => targets.add(target));
  }

  return Array.from(targets);
}
