import {
  ASSEMBLY_STAGES,
  CUTTING_STAGES,
  FABRICATION_STAGES,
  PRODUCTION_STAGE_LABELS,
  type ProductionOrder,
  type ProductionStageValue,
  type ScheduleOrder,
} from "@/lib/api/production";

/** Production flow order — use this instead of Object.entries so dropdown order stays stable. */
export const PRODUCTION_STAGE_ORDER: ProductionStageValue[] = [
  "material_prep",
  "cutting",
  "fabrication",
  "sash",
  "glass_assembly",
  "finishing",
  "qc_post_fabrication",
];

export const PRODUCTION_STAGE_OPTIONS = PRODUCTION_STAGE_ORDER.map((value) => ({
  value,
  label: PRODUCTION_STAGE_LABELS[value],
}));

export const TEAM_ROLE_OPTIONS = [
  { value: "cutting_lead", label: "Cutting lead" },
  { value: "fabrication_lead", label: "Fabrication lead" },
  { value: "assembly_lead", label: "Assembly lead" },
  { value: "qc_liaison", label: "QC liaison" },
] as const;

export type TeamRoleValue = (typeof TEAM_ROLE_OPTIONS)[number]["value"];

/** Default team role for a production stage. */
export function defaultRoleForStage(stage: ProductionStageValue): TeamRoleValue {
  switch (stage) {
    case "material_prep":
    case "cutting":
      return "cutting_lead";
    case "fabrication":
    case "sash":
      return "fabrication_lead";
    case "glass_assembly":
    case "finishing":
      return "assembly_lead";
    case "qc_pre_check":
    case "qc_post_fabrication":
      return "qc_liaison";
    default:
      return "cutting_lead";
  }
}

export function formatProductionStage(stage: string): string {
  return (
    PRODUCTION_STAGE_LABELS[stage as ProductionStageValue] ??
    stage.replace(/_/g, " ")
  );
}

export function isCuttingQueueOrder(order: ProductionOrder): boolean {
  return CUTTING_STAGES.includes(order.current_stage);
}

export function isFabricationQueueOrder(order: ProductionOrder): boolean {
  return FABRICATION_STAGES.includes(order.current_stage);
}

export function isAssemblyQueueOrder(order: ProductionOrder): boolean {
  return ASSEMBLY_STAGES.includes(order.current_stage);
}

export function isProductionManager(can: (permission: string) => boolean): boolean {
  return can("production.schedule.manage") || can("production.manage");
}

/** Mirrors backend ProductionOrderPolicy::manageStages */
export function canManageProductionStages(
  can: (permission: string) => boolean,
  userId: number | undefined,
  order: ProductionOrder,
): boolean {
  if (!can("production.manage")) {
    return false;
  }

  if (isProductionManager(can)) {
    return true;
  }

  if (!userId) {
    return false;
  }

  return (order.teams ?? []).some(
    (t) => t.user_id === userId && t.stage === order.current_stage,
  );
}

export function materialReadinessLabel(
  label?: ScheduleOrder["material_readiness"] extends { label: infer L } ? L : string,
): string {
  switch (label) {
    case "released":
      return "Released";
    case "ready":
      return "Materials ready";
    case "shortage":
      return "Shortage";
    case "procurement_pending":
      return "Procurement pending";
    case "partial":
      return "Partially reserved";
    default:
      return "Unknown";
  }
}

export function stageProgressPercent(stage: ProductionStageValue): number {
  const index = PRODUCTION_STAGE_ORDER.indexOf(stage);
  if (index < 0) return 0;
  return Math.round(((index + 1) / PRODUCTION_STAGE_ORDER.length) * 100);
}
