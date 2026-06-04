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

export async function getLocationTree(params?: { for_putaway?: boolean }) {
  return apiRequest<{ data: WarehouseLocationTree[] }>(
    `/warehouse/locations/tree${buildQuery(params)}`,
  );
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
            const slotName = bin.name
              ? bin.name.replace(/\bbin\b/gi, deck.slug === "aluminium" ? "cage" : "bin")
              : null;

            return {
              id: bin.id,
              label: slotName
                ? `${deck.name} / ${section.code} / ${slot} — ${slotName}`
                : `${deck.name} / ${section.code} / ${slot}`,
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

export function putawayLocationLabels(category: string | null | undefined): {
  fieldLabel: string;
  placeholder: string;
  hint: string;
  selectHint: string;
} {
  if (category === "aluminium_profile") {
    return {
      fieldLabel: "Putaway cage",
      placeholder: "Select cage…",
      hint: "Cage in the aluminium deck where accepted profile stock will be stored.",
      selectHint: "Link a warehouse item to load aluminium cages.",
    };
  }

  if (category === "accessory") {
    return {
      fieldLabel: "Putaway bin",
      placeholder: "Select bin…",
      hint: "Accessory section bin where accepted quantity will be stored.",
      selectHint: "Link a warehouse item to load accessory bins.",
    };
  }

  if (category === "rubber") {
    return {
      fieldLabel: "Putaway bin",
      placeholder: "Select bin…",
      hint: "Rubber deck bin where accepted gasket stock will be stored.",
      selectHint: "Link a warehouse item to load rubber bins.",
    };
  }

  return {
    fieldLabel: "Putaway bin",
    placeholder: "Select bin…",
    hint: "Where accepted quantity will be stored.",
    selectHint: "Link a warehouse item to load putaway locations for that material type.",
  };
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
  fifo_sequence: number | null;
  notes: string | null;
  lines?: Array<{
    id: number;
    item_id: number;
    bin_id: number;
    quantity: string;
    item?: WarehouseItem;
    bin?: WarehouseBin;
  }>;
  project?: { id: number; reference: string; name: string };
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
  payload?: { notes?: string },
) {
  return apiRequest<{ data: ProjectMaterialsReleaseResult }>(
    `/warehouse/projects/${projectId}/release-materials`,
    {
      method: "POST",
      body: payload ?? {},
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
