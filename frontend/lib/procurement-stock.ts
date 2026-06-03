import type { ProcurementStockStatus } from "@/lib/api/procurement";

export function formatQuantity(value: number | string, unit?: string | null) {
  const amount =
    typeof value === "number" ? value : Number.parseFloat(value || "0");

  return `${amount.toFixed(3)}${unit ? ` ${unit}` : ""}`;
}

export function stockStatusLabel(status: ProcurementStockStatus) {
  switch (status) {
    case "in_stock":
      return "In Stock";
    case "low_stock":
      return "Low Stock";
    case "out_of_stock":
      return "Out of Stock";
    default:
      return status;
  }
}

export function stockStatusClassName(status: ProcurementStockStatus) {
  switch (status) {
    case "in_stock":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "low_stock":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "out_of_stock":
      return "bg-red-500/10 text-red-700 dark:text-red-300";
    default:
      return "";
  }
}

export function stockCategoryClassName(categoryLabel: string) {
  const normalizedLabel = categoryLabel.trim().toLowerCase();

  if (normalizedLabel.includes("rubber")) {
    return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300";
  }

  if (normalizedLabel.includes("aluminium")) {
    return "bg-red-500/10 text-red-700 dark:text-red-300";
  }

  if (normalizedLabel.includes("accessor")) {
    return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
  }

  return "";
}
