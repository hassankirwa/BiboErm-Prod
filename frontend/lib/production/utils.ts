import {
  ASSEMBLY_STAGES,
  CUTTING_STAGES,
  PRODUCTION_STAGE_LABELS,
  type ProductionOrder,
  type ProductionStageValue,
  type ScheduleOrder,
} from "@/lib/api/production";

export const PRODUCTION_STAGE_OPTIONS = (
  Object.entries(PRODUCTION_STAGE_LABELS) as [ProductionStageValue, string][]
).map(([value, label]) => ({ value, label }));

export const TEAM_ROLE_OPTIONS = [
  { value: "cutting_lead", label: "Cutting lead" },
  { value: "fabrication_lead", label: "Fabrication lead" },
  { value: "assembly_lead", label: "Assembly lead" },
  { value: "qc_liaison", label: "QC liaison" },
] as const;

export function formatProductionStage(stage: string): string {
  return (
    PRODUCTION_STAGE_LABELS[stage as ProductionStageValue] ??
    stage.replace(/_/g, " ")
  );
}

export function isCuttingQueueOrder(order: ProductionOrder): boolean {
  return CUTTING_STAGES.includes(order.current_stage);
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
  const order: ProductionStageValue[] = [
    "material_prep",
    "qc_pre_check",
    "cutting",
    "fabrication",
    "sash",
    "glass_assembly",
    "finishing",
    "qc_post_fabrication",
  ];
  const index = order.indexOf(stage);
  if (index < 0) return 0;
  return Math.round(((index + 1) / order.length) * 100);
}
