import {
  ASSEMBLY_STAGES,
  CUTTING_STAGES,
  PRODUCTION_STAGE_LABELS,
  type ProductionOrder,
  type ProductionStageValue,
  type ScheduleOrder,
} from "@/lib/api/production";

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
  return can("production.schedule.manage");
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
