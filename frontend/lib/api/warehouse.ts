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

export type WarehouseItem = {
  id: number;
  sku: string;
  name: string;
  category: string;
  unit_of_measure: string | null;
  door_type_id: number | null;
  min_stock_qty: string;
  is_active: boolean;
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
  is_issued: boolean;
  active_issuance?: {
    id: number;
    project_id: number | null;
    issued_to: number;
    issue_date: string | null;
  } | null;
};

export type DoorType = {
  id: number;
  code: string;
  name: string;
  section_code: string | null;
  is_active: boolean;
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
}) {
  return apiRequest<Paginated<StockLevel>>(`/warehouse/inventory${buildQuery(params)}`);
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
  profile?: string;
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

export async function createTool(payload: {
  tool_code: string;
  name: string;
  tool_type?: string;
  condition?: string;
  purchase_date?: string;
}) {
  return apiRequest<{ data: Tool }>("/warehouse/tools", {
    method: "POST",
    body: payload,
  });
}

export async function issueTool(
  toolId: number,
  payload: { issued_to: number; project_id?: number; condition_out?: string },
) {
  return apiRequest<{ data: Tool }>(`/warehouse/tools/${toolId}/issue`, {
    method: "POST",
    body: payload,
  });
}

export async function returnTool(
  issuanceId: number,
  payload: { condition_in?: string; damage_notes?: string },
) {
  return apiRequest<{
    id: number;
    tool_id: number;
    return_date: string | null;
    condition_in: string | null;
    damage_notes: string | null;
  }>(`/warehouse/tools/issuances/${issuanceId}/return`, {
    method: "POST",
    body: payload,
  });
}

export async function getLocationTree() {
  return apiRequest<{ data: WarehouseLocationTree[] }>("/warehouse/locations/tree");
}

export async function listDoorTypes() {
  return apiRequest<{ data: DoorType[] }>("/warehouse/master-data/door-types");
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
  id: number;
  label: string;
};

export function flattenBinsFromLocationTree(warehouses: WarehouseLocationTree[]): SelectOption[] {
  return warehouses.flatMap((warehouse) =>
    (warehouse.decks ?? []).flatMap((deck) =>
      (deck.sections ?? []).flatMap((section) =>
        (section.bins ?? []).map((bin) => ({
          id: bin.id,
          label: `${deck.name} / ${section.code} / ${bin.code}`,
        })),
      ),
    ),
  );
}

export function warehouseItemLabel(item: WarehouseItem) {
  return `${item.sku} · ${item.name}`;
}

export async function listWarehouseItems() {
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
}
