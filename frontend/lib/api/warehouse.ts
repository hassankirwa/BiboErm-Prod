import { apiBlobRequest, apiRequest } from "./client";
import { cachedRequest } from "./request-cache";

export type Paginated<T> = {
  data: T[];
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
};

export type WarehouseItem = {
  id: number;
  sku: string;
  name: string;
  category: string;
  unit_of_measure: string | null;
  door_type_id: number | null;
  min_stock_qty: string;
  is_active: boolean;
  catalog_tier?: string | null;
  description?: string | null;
  image_url?: string | null;
  catalog_metadata?: Record<string, unknown> | null;
  aluminium_profile?: {
    default_bin_id?: number | null;
    profile_family?: string | null;
  } | null;
  accessory?: {
    default_bin_id?: number | null;
    door_type_id?: number | null;
  } | null;
  rubber?: {
    default_section_id?: number | null;
  } | null;
};

export type WarehouseBin = {
  id: number;
  section_id: number;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

export type WarehouseDeck = {
  id: number;
  warehouse_id: number;
  slug: string;
  name: string;
  sort_order: number;
  sections?: WarehouseSection[];
};

export type WarehouseSection = {
  id: number;
  deck_id: number;
  door_type_id: number | null;
  code: string;
  name: string;
  section_type: string;
  sort_order: number;
  is_active: boolean;
  bins?: WarehouseBin[];
};

export type WarehouseLocationTree = {
  id: number;
  code: string;
  name: string;
  address: string | null;
  is_active: boolean;
  decks?: WarehouseDeck[];
};

export type StockLevel = {
  id: number;
  item_id: number;
  bin_id: number;
  quantity_on_hand: string;
  quantity_reserved: string;
  quantity_available: string;
  updated_at: string | null;
  item?: WarehouseItem;
  bin?: WarehouseBin;
  location?: {
    section: { id: number; code: string; name: string } | null;
    deck: { id: number; slug: string; name: string } | null;
  };
};

export type StockMovementLine = {
  item_id: number;
  from_bin_id: number | null;
  to_bin_id: number | null;
  quantity: string;
  unit_cost: string | null;
  item?: WarehouseItem;
  fromBin?: WarehouseBin | null;
  toBin?: WarehouseBin | null;
};

export type StockMovement = {
  id: number;
  movement_number: string;
  movement_type: string;
  reference_type: string | null;
  reference_id: number | null;
  notes: string | null;
  performed_by: number;
  performed_at: string | null;
  created_at: string | null;
  lines?: StockMovementLine[];
  performer?: { id: number; name: string };
};

export type Offcut = {
  id: number;
  offcut_number: string;
  item_id: number;
  bin_id: number;
  length_mm: number;
  quantity_pieces: number;
  source_project_id: number | null;
  status: string;
  allocated_project_id: number | null;
  logged_at: string | null;
  notes: string | null;
  item?: WarehouseItem;
  bin?: WarehouseBin;
};

export type OffcutAnalytics = {
  period: { from: string | null; to: string | null };
  summary: {
    pieces_logged: number;
    pieces_consumed: number;
    pieces_available: number;
    total_length_mm_logged: number;
    total_length_mm_consumed: number;
    reuse_rate_percent: number;
  };
  by_project: Array<{
    project_id: number | null;
    pieces_logged: number;
    pieces_consumed: number;
    total_length_mm_logged: number;
    reuse_rate_percent: number;
  }>;
};

export type Tool = {
  id: number;
  tool_code: string;
  name: string;
  tool_type: string | null;
  condition: string | null;
  purchase_date: string | null;
  is_active: boolean;
  tracking_mode: "serialized" | "quantity";
  total_qty: number;
  available_qty: number;
  on_site_qty: number;
  issued_qty?: number;
  qty_in_repair: number;
  is_issued: boolean;
  active_issuance?: {
    id: number;
    project_id: number | null;
    issued_to: number;
    quantity?: number;
    issue_date: string | null;
    project?: { id: number; reference: string; name: string; stage?: string } | null;
    issued_to_user?: { id: number; name: string } | null;
  } | null;
};

export type ToolIssuance = {
  id: number;
  tool_id: number;
  project_id: number | null;
  issued_to: number;
  issued_by: number | null;
  quantity: number;
  issue_date: string | null;
  return_date: string | null;
  condition_out: string | null;
  condition_in: string | null;
  damage_notes: string | null;
  is_open: boolean;
  tool?: {
    id: number;
    tool_code: string;
    name: string;
    tool_type: string | null;
    tracking_mode?: string;
  } | null;
  project?: {
    id: number;
    reference: string;
    name: string;
    stage: string;
    install_mode?: string | null;
  } | null;
  issued_to_user?: { id: number; name: string; email?: string } | null;
  issued_by_user?: { id: number; name: string } | null;
  field_job?: { id: number; reference: string; status: string } | null;
};

export type DoorType = {
  id: number;
  code: string;
  name: string;
  section_code: string | null;
  is_active: boolean;
};

export type CatalogTier = "premium" | "standard" | "balustrade" | "specialty";

export type CatalogInventoryItem = {
  id: number;
  sku: string;
  name: string;
  category: string;
  catalog_tier: CatalogTier | string | null;
  description?: string | null;
  unit_of_measure?: string | null;
  image_url?: string | null;
  catalog_metadata?: Record<string, unknown> | null;
  quantity_on_hand: string;
  quantity_reserved: string;
  quantity_available: string;
  min_stock_qty: string;
  stock_status: "in_stock" | "low_stock" | "out_of_stock" | string;
  profile_family?: string | null;
  width_mm?: number | null;
  depth_mm?: number | null;
  standard_bar_length_mm?: number | null;
  reference_total_qty?: number | null;
  locations?: ItemLocationLegendRow[];
  locations_count?: number;
};

/** Per-cage / per-bin stock row for the inventory location legend. */
export type ItemLocationLegendRow = {
  stock_level_id: number | null;
  bin_id: number;
  bin_code: string;
  display_bin_code: string;
  bin_name: string | null;
  section_code: string | null;
  section_name: string | null;
  deck_slug: string | null;
  deck_name: string | null;
  label: string;
  quantity_on_hand: string;
  quantity_reserved: string;
  quantity_available: string;
  is_default: boolean;
  is_mapped_section: boolean;
  has_stock_row: boolean;
};

export type ItemLocationLegendResponse = {
  data: ItemLocationLegendRow[];
  meta: {
    item_id: number;
    sku: string;
    category: string | null;
    catalog_tier: string | null;
    section_code: string | null;
    source: string | null;
    suggested_bin_id: number | null;
    locations_count: number;
    quantity_on_hand: string;
    quantity_reserved: string;
  };
};

export type BinCatalogCode = {
  id?: number;
  code: string;
  normalized_code?: string;
  name?: string | null;
  source_name?: string | null;
  description?: string | null;
  source_description?: string | null;
  sheet?: string | null;
  source_sheet?: string | null;
  image_path?: string | null;
  image_url?: string | null;
  _sync_status?: "new" | "changed" | "unchanged";
  _changed_fields?: string[];
  source_file?: string | null;
  bin_id?: number;
  bin_code?: string | null;
  section_code?: string | null;
};

export type MaterialCatalogExtractResult = {
  data: {
    codes: BinCatalogCode[];
    items?: Array<Record<string, unknown>>;
    summary: {
      total_codes: number;
      with_images?: number;
      with_descriptions?: number;
      new?: number;
      changed?: number;
      unchanged?: number;
      sample?: string[];
    };
    source_filename: string | null;
    catalog_tier: CatalogTier | null;
    section_code?: string | null;
    extract_token?: string | null;
  };
  meta?: {
    extract_token?: string | null;
  };
};

export type StoredCatalogItem = BinCatalogCode;

export type MaterialBinOption = {
  id: number;
  code: string;
  name: string | null;
  section_code: string | null;
  section_name: string | null;
  deck_slug: string | null;
  label: string;
};

export type MaterialMasterMappingItem = {
  code: string;
  description: string;
  bin_id: number | null;
  bin_label: string | null;
  section_code: string | null;
  mapping_method: "exact_code" | "description_match" | "unmapped" | "manual";
  mapping_confidence: number;
  matched_catalog_code: string | null;
  matched_catalog_name: string | null;
  matched_catalog_description: string | null;
  image_url: string | null;
  image_path?: string | null;
  _sync_status?: "new" | "changed" | "unchanged";
  _changed_fields?: string[];
};

function buildQuery(params?: Record<string, string | number | boolean | null | undefined>) {
  const search = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    search.set(key, String(value));
  });

  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function listInventory(params?: {
  deck?: string;
  section_id?: number;
  bin_id?: number;
  low_stock?: boolean;
  per_page?: number;
  page?: number;
  catalog_only?: boolean;
  catalog_tier?: CatalogTier;
  category?: string;
  search?: string;
  stock_status?: string;
  /** When true with catalog_only, embeds per-cage location rows (paginated). Prefer getItemLocationLegend for expand-on-demand. */
  include_locations?: boolean;
}) {
  if (params?.catalog_only) {
    return apiRequest<{
      data: CatalogInventoryItem[];
      meta?: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
      };
    }>(`/warehouse/inventory${buildQuery({ ...params, catalog_only: true })}`);
  }

  return apiRequest<Paginated<StockLevel>>(`/warehouse/inventory${buildQuery(params)}`);
}

/** Per-cage stock legend for one material (expand-on-demand). */
export async function getItemLocationLegend(itemId: number) {
  return apiRequest<ItemLocationLegendResponse>(
    `/warehouse/items/${itemId}/stock${buildQuery({ include_locations: true })}`,
  );
}

export async function listCatalogItems(params?: {
  catalog_tier?: CatalogTier | "all";
  category?: "aluminium_profile" | "accessory" | "rubber" | "all";
  search?: string;
  page?: number;
  per_page?: number;
}) {
  const query = {
    ...params,
    catalog_tier: params?.catalog_tier === "all" ? undefined : params?.catalog_tier,
    category: params?.category === "all" ? undefined : params?.category,
  };
  return apiRequest<{
    data: CatalogInventoryItem[];
    meta: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }>(`/warehouse/master-data/catalog-items${buildQuery(query)}`);
}

export async function listMovements(params?: { movement_type?: string; per_page?: number }) {
  return apiRequest<Paginated<StockMovement>>(`/warehouse/movements${buildQuery(params)}`);
}

export async function receiveStock(payload: {
  goods_receipt_id?: number;
  project_id?: number;
  reference_type?: string;
  notes?: string;
  lines: Array<{
    item_id: number;
    to_bin_id?: number;
    quantity: number;
    unit_cost?: number;
  }>;
}) {
  return apiRequest<{ data: StockMovement }>("/warehouse/movements/receive", {
    method: "POST",
    body: payload,
  });
}

export async function issueStock(payload: {
  project_id?: number;
  notes?: string;
  lines: Array<{ item_id: number; from_bin_id: number; quantity: number }>;
}) {
  return apiRequest<{ data: StockMovement }>("/warehouse/movements/issue", {
    method: "POST",
    body: payload,
  });
}

export async function listOffcuts(params?: {
  sku?: string;
  profile?: string;
  q?: string;
  item_id?: number;
  min_length?: number;
  status?: string;
  per_page?: number;
}) {
  return apiRequest<Paginated<Offcut>>(`/warehouse/offcuts${buildQuery(params)}`);
}

export async function logOffcut(payload: {
  item_id: number;
  bin_id: number;
  length_mm: number;
  quantity_pieces?: number;
  source_project_id?: number;
  notes?: string;
}) {
  return apiRequest<{ data: Offcut }>("/warehouse/offcuts", {
    method: "POST",
    body: payload,
  });
}

export async function consumeOffcut(id: number) {
  return apiRequest<{ data: Offcut }>(`/warehouse/offcuts/${id}`, {
    method: "PATCH",
    body: { status: "consumed" },
  });
}

export async function allocateOffcut(id: number, project_id: number) {
  return apiRequest<{ data: Offcut }>(`/warehouse/offcuts/${id}/allocate`, {
    method: "POST",
    body: { project_id },
  });
}

export async function getOffcutAnalytics(params?: { from?: string; to?: string }) {
  return apiRequest<{ data: OffcutAnalytics }>(`/warehouse/offcuts/analytics${buildQuery(params)}`);
}

export async function listTools(params?: { active_only?: boolean }) {
  return apiRequest<{ data: Tool[] }>(`/warehouse/tools${buildQuery(params)}`);
}

export async function listToolIssuances(params?: {
  open_only?: boolean;
  project_id?: number;
  installation_only?: boolean;
}) {
  return apiRequest<{ data: ToolIssuance[] }>(
    `/warehouse/tools/issuances${buildQuery(params)}`,
  );
}

export async function createTool(payload: {
  tool_code: string;
  name: string;
  tool_type?: string;
  condition?: string;
  purchase_date?: string;
  tracking_mode?: "serialized" | "quantity";
  total_qty?: number;
}) {
  return apiRequest<{ data: Tool }>("/warehouse/tools", {
    method: "POST",
    body: payload,
  });
}

export async function issueTool(
  toolId: number,
  payload: {
    issued_to: number;
    project_id?: number;
    condition_out?: string;
    quantity?: number;
  },
) {
  return apiRequest<{ data: Tool }>(`/warehouse/tools/${toolId}/issue`, {
    method: "POST",
    body: payload,
  });
}

export async function returnTool(
  issuanceId: number,
  payload: {
    disposition?: "returned" | "damaged" | "lost" | "replaced";
    condition_in?: string;
    damage_notes?: string;
    create_replacement?: boolean;
    replacement?: {
      tool_code?: string;
      name?: string;
      tool_type?: string;
    };
  },
) {
  return apiRequest<{
    id: number;
    tool_id: number;
    return_date: string | null;
    condition_in: string | null;
    damage_notes: string | null;
    disposition?: string | null;
    incident?: ToolIncident | null;
  }>(`/warehouse/tools/issuances/${issuanceId}/return`, {
    method: "POST",
    body: payload,
  });
}

export type ToolIncident = {
  id: number;
  tool_id: number;
  issuance_id: number | null;
  field_job_id: number | null;
  responsible_user_id: number;
  reported_by: number | null;
  type: "damage" | "loss" | "malfunction" | string;
  status: "open" | "in_repair" | "repaired" | "replaced" | "written_off" | string;
  notes: string | null;
  resolution_notes: string | null;
  quantity: number;
  replacement_tool_id: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  tool?: { id: number; tool_code: string; name: string; tool_type?: string | null } | null;
  responsible_user?: { id: number; name: string } | null;
  reported_by_user?: { id: number; name: string } | null;
  replacement_tool?: { id: number; tool_code: string; name: string } | null;
};

export async function listToolIncidents(params?: {
  status?: string;
  tool_id?: number;
}) {
  return apiRequest<{ data: ToolIncident[] }>(
    `/warehouse/tools/incidents${buildQuery(params)}`,
  );
}

export async function createToolIncident(payload: {
  tool_id: number;
  responsible_user_id: number;
  type: "damage" | "loss" | "malfunction";
  issuance_id?: number;
  field_job_id?: number;
  notes?: string;
  quantity?: number;
}) {
  return apiRequest<{ data: ToolIncident }>("/warehouse/tools/incidents", {
    method: "POST",
    body: payload,
  });
}

export async function updateToolIncident(
  id: number,
  payload: {
    status: "in_repair" | "repaired" | "replaced" | "written_off";
    resolution_notes?: string;
    replacement_tool_id?: number;
    create_replacement?: boolean;
    replacement?: { tool_code?: string; name?: string; tool_type?: string };
  },
) {
  return apiRequest<{ data: ToolIncident }>(`/warehouse/tools/incidents/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function getLocationTree(params?: { for_putaway?: boolean }) {
  const query = buildQuery(params);
  return cachedRequest(
    `GET:/warehouse/locations/tree${query}`,
    () =>
      apiRequest<{ data: WarehouseLocationTree[] }>(`/warehouse/locations/tree${query}`),
    { ttlMs: 180_000 },
  );
}

export type PutawayBinOption = {
  id: number;
  code: string;
  name?: string | null;
  section_code?: string | null;
  section_name?: string | null;
  deck_slug?: string | null;
  deck_name?: string | null;
  /** Short slot label e.g. "Cage 1" / "Bin 2". */
  tag?: string | null;
  label: string;
};

export type PutawayCatalogSlot = {
  id: number;
  sku: string;
  name: string;
  category: string | null;
  catalog_tier: string | null;
  image_url?: string | null;
  to_bin_id: number;
  label: string;
};

export type PutawayOptionsForItem = {
  warehouse_item_id: number;
  sku: string;
  category: string | null;
  catalog_tier: string | null;
  section_code: string | null;
  source: string;
  suggested_bin_id: number | null;
  /** Optional metadata only — not a putaway destination. */
  suggested_catalog_item_id?: number | null;
  /** Physical storage locations (CAGE1–3 / accessory BINs) — primary GRN dropdown. */
  bins: PutawayBinOption[];
  /** Optional metadata (inventory SKUs → mapped bin); do not use as putaway destinations. */
  catalog_slots?: PutawayCatalogSlot[];
};

/** Physical section bins (Premium/Standard/Balustrade/Specialty cages, accessory BINs) for GRN putaway. */
export async function getPutawayOptions(itemIds: number[]) {
  const ids = Array.from(new Set(itemIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (ids.length === 0) {
    return { data: [] as PutawayOptionsForItem[] };
  }

  const search = new URLSearchParams();
  ids.forEach((id) => search.append("item_ids[]", String(id)));

  return apiRequest<{ data: PutawayOptionsForItem[] }>(
    `/warehouse/inventory/putaway-options?${search.toString()}`,
  );
}

export async function listDoorTypes() {
  return apiRequest<{ data: DoorType[] }>("/warehouse/master-data/door-types");
}

export async function createDoorType(payload: {
  code: string;
  name: string;
  section_code?: string | null;
}) {
  return apiRequest<{ data: DoorType }>("/warehouse/master-data/door-types", {
    method: "POST",
    body: payload,
  });
}

export async function updateDoorType(
  id: number,
  payload: Partial<{
    code: string;
    name: string;
    section_code: string | null;
    is_active: boolean;
  }>,
) {
  return apiRequest<{ data: DoorType }>(`/warehouse/master-data/door-types/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deactivateDoorType(id: number) {
  return apiRequest<void>(`/warehouse/master-data/door-types/${id}`, {
    method: "DELETE",
  });
}

export async function createAluminiumProfile(payload: {
  sku: string;
  name: string;
  unit_of_measure?: string | null;
  profile_family?: string | null;
  min_stock_qty?: number;
}) {
  return apiRequest<{ data: WarehouseItem }>(
    "/warehouse/master-data/aluminium-profiles",
    {
      method: "POST",
      body: payload,
    },
  );
}

export async function updateAluminiumProfile(
  id: number,
  payload: Partial<{
    sku: string;
    name: string;
    unit_of_measure: string | null;
    profile_family: string | null;
    min_stock_qty: number;
    is_active: boolean;
  }>,
) {
  return apiRequest<{ data: WarehouseItem }>(
    `/warehouse/master-data/aluminium-profiles/${id}`,
    { method: "PATCH", body: payload },
  );
}

export async function deactivateAluminiumProfile(id: number) {
  return apiRequest<void>(`/warehouse/master-data/aluminium-profiles/${id}`, {
    method: "DELETE",
  });
}

export async function createAccessory(payload: {
  sku: string;
  name: string;
  unit_of_measure?: string | null;
  door_type_id?: number | null;
  min_stock_qty?: number;
}) {
  return apiRequest<{ data: WarehouseItem }>("/warehouse/master-data/accessories", {
    method: "POST",
    body: payload,
  });
}

export async function updateAccessory(
  id: number,
  payload: Partial<{
    sku: string;
    name: string;
    unit_of_measure: string | null;
    door_type_id: number | null;
    default_bin_id: number | null;
    min_stock_qty: number;
    standard_qty: number;
    is_active: boolean;
  }>,
) {
  return apiRequest<{ data: WarehouseItem }>(
    `/warehouse/master-data/accessories/${id}`,
    { method: "PATCH", body: payload },
  );
}

export async function deactivateAccessory(id: number) {
  return apiRequest<void>(`/warehouse/master-data/accessories/${id}`, {
    method: "DELETE",
  });
}

export async function createRubber(payload: {
  sku: string;
  name: string;
  unit_of_measure?: string | null;
  min_stock_qty?: number;
}) {
  return apiRequest<{ data: WarehouseItem }>("/warehouse/master-data/rubbers", {
    method: "POST",
    body: payload,
  });
}

export async function updateRubber(
  id: number,
  payload: Partial<{
    sku: string;
    name: string;
    unit_of_measure: string | null;
    min_stock_qty: number;
    compatible_profile_ids: number[];
    default_section_id: number | null;
    is_active: boolean;
  }>,
) {
  return apiRequest<{ data: WarehouseItem }>(`/warehouse/master-data/rubbers/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deactivateRubber(id: number) {
  return apiRequest<void>(`/warehouse/master-data/rubbers/${id}`, {
    method: "DELETE",
  });
}

export async function extractMaterialCatalog(file: File, catalogTier?: CatalogTier) {
  const formData = new FormData();
  formData.append("file", file);
  if (catalogTier) {
    formData.append("catalog_tier", catalogTier);
  }

  return apiRequest<MaterialCatalogExtractResult>(
    "/warehouse/master-data/material-catalog/extract",
    {
      method: "POST",
      formData,
    },
  );
}

export async function importMaterialCatalog(payload: {
  codes: BinCatalogCode[];
  catalog_tier: CatalogTier;
  items?: Array<Record<string, unknown>>;
  extract_token?: string | null;
}) {
  return apiRequest<{
    data: {
      stored: number;
      added: number;
      updated: number;
      unchanged: number;
      images_added: number;
      bin_id: number;
      bin_code: string;
      section_code: string | null;
      warehouse_items?: {
        stored?: number;
        added?: number;
        updated?: number;
        unchanged?: number;
      };
    };
  }>("/warehouse/master-data/material-catalog/import", {
    method: "POST",
    body: payload,
  });
}

export async function discardMaterialCatalogExtract(token: string) {
  return apiRequest<{ data: { discarded: boolean } }>(
    `/warehouse/master-data/material-catalog/extract/${encodeURIComponent(token)}`,
    { method: "DELETE" },
  );
}

export async function listMaterialCatalog(params?: {
  catalog_tier?: CatalogTier;
  search?: string;
}) {
  return apiRequest<{ data: StoredCatalogItem[] }>(
    `/warehouse/master-data/material-catalog${buildQuery(params)}`,
  );
}

export async function exportMaterialCatalog() {
  return apiBlobRequest("/warehouse/master-data/material-catalog/export");
}

export async function extractMaterialMaster(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<{
    data: {
      items: MaterialMasterMappingItem[];
      bins: MaterialBinOption[];
      summary: {
        total_items: number;
        mapped_items: number;
        unmapped_items: number;
        new?: number;
        changed?: number;
        unchanged?: number;
        sample_codes?: string[];
        by_section?: Record<string, number>;
      };
      source_filename: string | null;
    };
  }>("/warehouse/master-data/materials/extract", { method: "POST", formData });
}

export async function importMaterialMaster(payload: { items: MaterialMasterMappingItem[] }) {
  return apiRequest<{
    data: { added: number; updated: number; unchanged: number; mapped: number; unmapped: number };
  }>(
    "/warehouse/master-data/materials/import",
    { method: "POST", body: payload },
  );
}

export async function searchWarehouseItems(params?: { q?: string; code?: string }) {
  return apiRequest<{ data: WarehouseItem[] }>(`/warehouse/inventory/search${buildQuery(params)}`);
}

export async function listAluminiumProfiles() {
  return apiRequest<{ data: WarehouseItem[] }>("/warehouse/master-data/aluminium-profiles");
}

export async function listAccessories(params?: { door_type_id?: number }) {
  return apiRequest<{ data: WarehouseItem[] }>(
    `/warehouse/master-data/accessories${buildQuery(params)}`,
  );
}

export async function listRubbers() {
  return apiRequest<{ data: WarehouseItem[] }>("/warehouse/master-data/rubbers");
}

export type SelectOption = {
  id: number | string;
  label: string;
  /** Physical warehouse bin id when option value is a catalog slot id. */
  toBinId?: number;
};

export function deckSlugForItemCategory(
  category: string | null | undefined,
): WarehouseDeckSlug | null {
  switch (category) {
    case "aluminium_profile":
      return "aluminium";
    case "accessory":
      return "accessories";
    case "rubber":
      return "rubbers";
    default:
      return null;
  }
}

/** Display slot code for putaway dropdown (legacy aluminium rows may still use BIN* in DB). */
export function formatPutawaySlotCode(bin: WarehouseBin, deckSlug: string): string {
  if (deckSlug === "aluminium" && /^BIN/i.test(bin.code)) {
    return bin.code.replace(/^BIN/i, "CAGE");
  }

  return bin.code;
}

/** Human-readable slot tag: Cage 1 / Bin 2. */
export function formatPutawaySlotTag(
  code: string | null | undefined,
  deckSlug?: string | null,
): string {
  const raw = (code ?? "").trim();
  if (!raw) return "Location";

  let normalized = raw;
  if (deckSlug === "aluminium" && /^BIN/i.test(normalized)) {
    normalized = normalized.replace(/^BIN/i, "CAGE");
  }

  const cage = /^CAGE\s*(\d+)$/i.exec(normalized);
  if (cage) return `Cage ${cage[1]}`;

  const bin = /^BIN\s*(\d+)$/i.exec(normalized);
  if (bin) return deckSlug === "aluminium" ? `Cage ${bin[1]}` : `Bin ${bin[1]}`;

  return normalized;
}

const CATALOG_TIER_SHORT_LABELS: Record<string, string> = {
  "SEC-ALU-PREMIUM": "Premium",
  "SEC-ALU-STANDARD": "Standard",
  "SEC-ALU-BALUSTRADE": "Balustrade",
  "SEC-ALU-SPECIALTY": "Specialty",
};

export function formatPutawayBinLabel(input: {
  code?: string | null;
  tag?: string | null;
  section_code?: string | null;
  section_name?: string | null;
  deck_slug?: string | null;
  deck_name?: string | null;
  name?: string | null;
  label?: string | null;
}): string {
  if (input.tag && input.section_name) {
    return `${input.tag} · ${input.section_name}`;
  }
  if (input.tag && input.section_code) {
    const short =
      CATALOG_TIER_SHORT_LABELS[input.section_code] ?? input.section_code;
    return `${input.tag} · ${short}`;
  }

  const tag =
    input.tag ??
    formatPutawaySlotTag(input.code, input.deck_slug ?? null);
  const section =
    input.section_name ||
    (input.section_code
      ? CATALOG_TIER_SHORT_LABELS[input.section_code] ?? input.section_code
      : null) ||
    input.deck_name ||
    null;

  return section ? `${tag} · ${section}` : tag;
}

export function flattenBinsFromLocationTree(
  warehouses: WarehouseLocationTree[],
  options?: { deckSlugs?: WarehouseDeckSlug[] },
): SelectOption[] {
  const slugFilter = options?.deckSlugs ? new Set(options.deckSlugs) : null;

  return warehouses.flatMap((warehouse) =>
    (warehouse.decks ?? [])
      .filter((deck) => !slugFilter || slugFilter.has(deck.slug as WarehouseDeckSlug))
      .flatMap((deck) =>
        (deck.sections ?? []).flatMap((section) =>
          (section.bins ?? []).map((bin) => {
            const slot = formatPutawaySlotCode(bin, deck.slug);
            return {
              id: bin.id,
              label: formatPutawayBinLabel({
                code: slot,
                section_code: section.code,
                section_name: section.name,
                deck_slug: deck.slug,
                deck_name: deck.name,
                name: bin.name,
              }),
            };
          }),
        ),
      ),
  );
}

export function flattenBinsForItemCategory(
  warehouses: WarehouseLocationTree[],
  category: string | null | undefined,
): SelectOption[] {
  const deckSlug = deckSlugForItemCategory(category);

  if (!deckSlug) {
    return [];
  }

  return flattenBinsFromLocationTree(warehouses, { deckSlugs: [deckSlug] });
}

/** Catalog tier → aluminium section codes created by bin catalog uploads. */
export const CATALOG_TIER_SECTION_CODES: Record<string, string> = {
  premium: "SEC-ALU-PREMIUM",
  standard: "SEC-ALU-STANDARD",
  balustrade: "SEC-ALU-BALUSTRADE",
  specialty: "SEC-ALU-SPECIALTY",
};

export function catalogSectionCodeForItem(
  item: WarehouseItem | null | undefined,
): string | null {
  if (!item) {
    return null;
  }

  const fromMetadata = item.catalog_metadata?.bin_section_code;
  if (typeof fromMetadata === "string" && fromMetadata.trim() !== "") {
    return fromMetadata.trim();
  }

  const tier = item.catalog_tier;
  if (tier && CATALOG_TIER_SECTION_CODES[tier]) {
    return CATALOG_TIER_SECTION_CODES[tier];
  }

  return null;
}

export function suggestedPutawayBinId(
  item: WarehouseItem | null | undefined,
  warehouses?: WarehouseLocationTree[],
): number | null {
  if (!item) {
    return null;
  }

  const fromProfile = item.aluminium_profile?.default_bin_id;
  if (typeof fromProfile === "number" && fromProfile > 0) {
    return fromProfile;
  }

  const fromAccessory = item.accessory?.default_bin_id;
  if (typeof fromAccessory === "number" && fromAccessory > 0) {
    return fromAccessory;
  }

  const fromMetadata = item.catalog_metadata?.default_bin_id;
  if (typeof fromMetadata === "number" && fromMetadata > 0) {
    return fromMetadata;
  }
  if (typeof fromMetadata === "string" && /^\d+$/.test(fromMetadata)) {
    return Number(fromMetadata);
  }

  if (!warehouses || warehouses.length === 0) {
    return null;
  }

  const sectionCode = catalogSectionCodeForItem(item);
  if (!sectionCode) {
    return null;
  }

  // Catalog sections (Premium/Standard/Balustrade/Specialty) live on the aluminium
  // deck even when the item category is accessory (e.g. balustrade).
  let fallback: number | null = null;
  for (const warehouse of warehouses) {
    for (const deck of warehouse.decks ?? []) {
      for (const section of deck.sections ?? []) {
        if (section.code !== sectionCode) {
          continue;
        }
        for (const bin of section.bins ?? []) {
          if (!bin.is_active && bin.is_active !== undefined) {
            continue;
          }
          if (bin.code === "CAGE1") {
            return bin.id;
          }
          if (fallback === null) {
            fallback = bin.id;
          }
        }
      }
    }
  }

  return fallback;
}

/**
 * Prefer bins in the item's Master Data catalog section (uploaded PREMIUM /
 * STANDARD / BALUSTRADE / specialty workbooks). Do not dump the whole deck when
 * a catalog section is known.
 */
export function flattenBinsForWarehouseItem(
  warehouses: WarehouseLocationTree[],
  item: WarehouseItem | null | undefined,
  category?: string | null,
): SelectOption[] {
  const resolvedCategory = category ?? item?.category ?? null;
  const deckSlug = deckSlugForItemCategory(resolvedCategory);
  const suggestedId = suggestedPutawayBinId(item, warehouses);
  const allBins = flattenBinsFromLocationTree(warehouses);
  const catalogSectionCodes = new Set(Object.values(CATALOG_TIER_SECTION_CODES));

  let options: SelectOption[] = [];

  // Catalog-upload materials (incl. accessories with Premium/Standard/…) use tier cages.
  const sectionCode = catalogSectionCodeForItem(item);

  if (sectionCode) {
    for (const warehouse of warehouses) {
      for (const deck of warehouse.decks ?? []) {
        for (const section of deck.sections ?? []) {
          if (section.code !== sectionCode) {
            continue;
          }
          for (const bin of section.bins ?? []) {
            if (bin.is_active === false) {
              continue;
            }
            const slot = formatPutawaySlotCode(bin, deck.slug);
            options.push({
              id: bin.id,
              label: formatPutawayBinLabel({
                code: slot,
                section_code: section.code,
                section_name: section.name,
                deck_slug: deck.slug,
                deck_name: deck.name,
                name: bin.name,
              }),
            });
          }
        }
      }
    }
  }

  // Non-catalog accessories / rubbers: category deck only (no aluminium cages).
  if (
    options.length === 0 &&
    (resolvedCategory === "accessory" || resolvedCategory === "rubber") &&
    deckSlug
  ) {
    options = flattenBinsFromLocationTree(warehouses, {
      deckSlugs: [deckSlug],
    });
  }

  // Non-catalog aluminium: category deck excluding catalog-tier cages.
  if (options.length === 0 && deckSlug === "aluminium") {
    for (const warehouse of warehouses) {
      for (const deck of warehouse.decks ?? []) {
        if (deck.slug !== "aluminium") {
          continue;
        }
        for (const section of deck.sections ?? []) {
          if (catalogSectionCodes.has(section.code)) {
            continue;
          }
          for (const bin of section.bins ?? []) {
            if (bin.is_active === false) {
              continue;
            }
            const slot = formatPutawaySlotCode(bin, deck.slug);
            options.push({
              id: bin.id,
              label: formatPutawayBinLabel({
                code: slot,
                section_code: section.code,
                section_name: section.name,
                deck_slug: deck.slug,
                deck_name: deck.name,
                name: bin.name,
              }),
            });
          }
        }
      }
    }
  } else if (options.length === 0 && deckSlug) {
    options = flattenBinsFromLocationTree(warehouses, { deckSlugs: [deckSlug] });
  }

  if (suggestedId && !options.some((bin) => bin.id === suggestedId)) {
    const fromTree = allBins.find((bin) => bin.id === suggestedId);
    if (fromTree) {
      options = [fromTree, ...options];
    }
  }

  if (!suggestedId) {
    return options;
  }

  return options.map((bin) =>
    bin.id === suggestedId
      ? { ...bin, label: `${bin.label} (default)` }
      : bin,
  );
}

/**
 * Optional metadata only — catalog_slots are inventory materials with mapped
 * physical bins, NOT putaway destinations. GRN dropdown must use `bins`.
 */
export function hasPutawayCatalogSlots(
  options: PutawayOptionsForItem | null | undefined,
): boolean {
  return (options?.catalog_slots?.length ?? 0) > 0;
}

/** @deprecated Prefer selectOptionsFromPutawayBins — catalog SKUs are not storage locations. */
export function selectOptionsFromCatalogSlots(
  options: PutawayOptionsForItem | null | undefined,
): SelectOption[] {
  if (!options?.catalog_slots?.length) {
    return [];
  }

  const suggestedId = options.suggested_catalog_item_id ?? null;
  return options.catalog_slots.map((slot) => ({
    id: `c-${slot.id}`,
    label:
      suggestedId && slot.id === suggestedId
        ? `${slot.label} (default)`
        : slot.label,
    toBinId: slot.to_bin_id,
  }));
}

/** Physical storage bins (CAGE1–3 / accessory BINs) scoped to the receiving material. */
export function selectOptionsFromPutawayBins(
  options: PutawayOptionsForItem | null | undefined,
): SelectOption[] {
  if (!options) {
    return [];
  }

  const suggestedId = options.suggested_bin_id;
  return (options.bins ?? []).map((bin) => {
    const base = formatPutawayBinLabel(bin) || bin.label;
    return {
      id: bin.id,
      label:
        suggestedId && bin.id === suggestedId ? `${base} (default)` : base,
      toBinId: bin.id,
    };
  });
}

export function putawayLocationLabels(category: string | null | undefined): {
  fieldLabel: string;
  placeholder: string;
  hint: string;
  selectHint: string;
} {
  if (category === "aluminium_profile") {
    return {
      fieldLabel: "Storage location (cage)",
      placeholder: "Select cage…",
      hint: "Physical cage (CAGE1–3) in the material’s catalog section where accepted quantity will be stored.",
      selectHint: "Link a warehouse item to load section cages.",
    };
  }

  if (category === "accessory") {
    return {
      fieldLabel: "Storage location (bin)",
      placeholder: "Select bin…",
      hint: "Physical accessory bin where accepted quantity will be stored.",
      selectHint: "Link a warehouse item to load accessory bins.",
    };
  }

  if (category === "rubber") {
    return {
      fieldLabel: "Storage location (bin)",
      placeholder: "Select bin…",
      hint: "Physical rubber deck bin where accepted quantity will be stored.",
      selectHint: "Link a warehouse item to load rubber bins.",
    };
  }

  return {
    fieldLabel: "Storage location",
    placeholder: "Select bin…",
    hint: "Physical bin where accepted quantity of this material will be stored.",
    selectHint: "Link a warehouse item to load storage locations for that material type.",
  };
}

export function warehouseItemLabel(item: WarehouseItem) {
  return `${item.sku} · ${item.name}`;
}

export async function listWarehouseItems() {
  return cachedRequest(
    "GET:/warehouse/items/combined",
    async () => {
      const [profiles, accessories, rubbers] = await Promise.all([
        listAluminiumProfiles(),
        listAccessories(),
        listRubbers(),
      ]);

      const byId = new Map<number, WarehouseItem>();

      for (const item of [...profiles.data, ...accessories.data, ...rubbers.data]) {
        byId.set(item.id, item);
      }

      return Array.from(byId.values()).sort((left, right) => left.name.localeCompare(right.name));
    },
    { ttlMs: 120_000 },
  );
}

// --- Location hierarchy ---

export const WAREHOUSE_DECK_SLUGS = [
  "aluminium",
  "offcuts",
  "accessories",
  "rubbers",
] as const;

export type WarehouseDeckSlug = (typeof WAREHOUSE_DECK_SLUGS)[number];

export const SECTION_TYPES = [
  "profile_family",
  "offcut_profile",
  "door_accessories",
  "bathroom_accessories",
  "general_accessories",
  "rubber_profile",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

export function flattenDecksFromLocationTree(
  warehouses: WarehouseLocationTree[],
): SelectOption[] {
  return warehouses.flatMap((warehouse) =>
    (warehouse.decks ?? []).map((deck) => ({
      id: deck.id,
      label: `${warehouse.name} / ${deck.name}`,
    })),
  );
}

export function binsForSection(
  warehouses: WarehouseLocationTree[],
  sectionId: number,
): SelectOption[] {
  for (const warehouse of warehouses) {
    for (const deck of warehouse.decks ?? []) {
      for (const section of deck.sections ?? []) {
        if (section.id !== sectionId) {
          continue;
        }

        return (section.bins ?? []).map((bin) => ({
          id: bin.id,
          label: bin.name ? `${bin.code} — ${bin.name}` : bin.code,
        }));
      }
    }
  }

  return [];
}

export async function createSection(payload: {
  deck_id: number;
  code: string;
  name: string;
  section_type: SectionType | string;
  door_type_id?: number | null;
  sort_order?: number;
}) {
  return apiRequest<{ data: WarehouseSection }>("/warehouse/sections", {
    method: "POST",
    body: payload,
  });
}

export async function createBin(payload: {
  section_id: number;
  code: string;
  name?: string;
  description?: string;
  sort_order?: number;
}) {
  return apiRequest<{ data: WarehouseBin }>("/warehouse/bins", {
    method: "POST",
    body: payload,
  });
}

// --- Reservations ---

export const RESERVATION_STATUSES = [
  "pending",
  "partial",
  "fulfilled",
  "released",
  "cancelled",
] as const;

export type StockReservation = {
  id: number;
  reservation_number: string;
  project_id: number;
  status: string;
  reserved_at: string | null;
  reserved_by: number | null;
  released_at?: string | null;
  release_notes?: string | null;
  received_by?: number | null;
  received_by_user?: { id: number; name: string } | null;
  fifo_sequence: number | null;
  fifo_order?: number | null;
  notes: string | null;
  lines?: Array<{
    id: number;
    item_id: number;
    bin_id: number;
    quantity: string;
    item?: WarehouseItem;
    bin?: WarehouseBin;
  }>;
  project?: { id: number; reference: string; name: string; fifo_order?: number | null };
};

export async function listReservations(params?: {
  status?: string;
  project_id?: number;
  per_page?: number;
}) {
  return apiRequest<Paginated<StockReservation>>(`/warehouse/reservations${buildQuery(params)}`);
}

export async function releaseReservation(
  reservationId: number,
  payload?: { item_ids?: number[]; production_stage?: "cutting" | "fabrication" },
) {
  return apiRequest<{ data: StockReservation }>(
    `/warehouse/reservations/${reservationId}/release`,
    {
      method: "POST",
      body: payload ?? {},
    },
  );
}

export type ProjectMaterialsReleaseOffcutLine = {
  item_id: number;
  sku: string | null;
  name: string | null;
  qty_to_release: string;
  required_length_mm: number;
  offcut_metres_available: string;
  note: string;
};

export type ProjectMaterialsReleaseResult = {
  reservation: StockReservation;
  movement_id: number | null;
  offcut_lines: ProjectMaterialsReleaseOffcutLine[];
  project_stage: string;
};

export async function releaseProjectMaterials(
  projectId: number,
  payload: { received_by: number; notes?: string },
) {
  return apiRequest<{ data: ProjectMaterialsReleaseResult }>(
    `/warehouse/projects/${projectId}/release-materials`,
    {
      method: "POST",
      body: payload,
    },
  );
}

// --- Stock take ---

export type StockTakeSnapshotLine = {
  item_id: number;
  bin_id: number;
  sku: string | null;
  item_name: string | null;
  bin_code: string | null;
  system_qty: string;
  quantity_reserved?: string;
};

export type StockTakeVarianceLine = {
  item_id: number;
  bin_id: number;
  sku: string | null;
  item_name: string | null;
  bin_code: string | null;
  system_qty: string;
  counted_qty: string;
  variance: string;
  direction: "increase" | "decrease" | "none";
  has_variance: boolean;
  quantity_reserved?: string;
};

type StockTakeSnapshotApiLine = {
  item_id: number;
  bin_id: number;
  sku: string | null;
  item_name: string | null;
  bin_code: string | null;
  quantity_on_hand: string;
  quantity_reserved?: string;
};

export async function stockTakeSnapshot(params?: {
  deck?: string;
  section_id?: number;
  bin_id?: number;
}) {
  const raw = await apiRequest<{
    snapshot_at: string;
    line_count: number;
    lines: StockTakeSnapshotApiLine[];
  }>(`/warehouse/stock-take/snapshot${buildQuery(params)}`);

  return {
    data: {
      snapshot_at: raw.snapshot_at,
      line_count: raw.line_count,
      lines: raw.lines.map(
        (line): StockTakeSnapshotLine => ({
          item_id: line.item_id,
          bin_id: line.bin_id,
          sku: line.sku,
          item_name: line.item_name,
          bin_code: line.bin_code,
          system_qty: line.quantity_on_hand,
          quantity_reserved: line.quantity_reserved,
        }),
      ),
    },
  };
}

export async function stockTakeVariance(payload: {
  lines: Array<{ item_id: number; bin_id: number; counted_qty: number }>;
}) {
  const raw = await apiRequest<{
    snapshot_at: string;
    summary: Record<string, string | number>;
    lines: Array<{
      item_id: number;
      bin_id: number;
      sku: string | null;
      item_name: string | null;
      bin_code: string | null;
      system_qty: string;
      counted_qty: string;
      variance: string;
      direction: StockTakeVarianceLine["direction"];
      has_variance: boolean;
      quantity_reserved?: string;
    }>;
  }>("/warehouse/stock-take/variance", {
    method: "POST",
    body: payload,
  });

  return { data: raw };
}

export async function stockTakeApply(payload: {
  notes?: string;
  lines: Array<{ item_id: number; bin_id: number; counted_qty: number }>;
}) {
  return apiRequest<{ data: StockMovement }>("/warehouse/stock-take/apply", {
    method: "POST",
    body: payload,
  });
}

// --- Rubbers ---

export async function suggestRubbers(warehouseItemId: number) {
  return apiRequest<{ data: WarehouseItem[] }>(
    `/warehouse/master-data/rubbers/suggest${buildQuery({ warehouse_item_id: warehouseItemId })}`,
  );
}
