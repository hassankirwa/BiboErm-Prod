export type SupplierCategoryOption = {
  value: string;
  label: string;
};

/** Mirrors `App\Enums\Procurement\SupplierCategory` labels for display when API options are unavailable. */
const SUPPLIER_CATEGORY_LABELS: Record<string, string> = {
  profiles: "Aluminium Profiles",
  accessories: "Accessories",
  rubbers: "Rubbers",
  glass: "Glass",
  general: "General",
  logistics: "Logistics",
};

export function supplierCategoryLabel(category: string | null | undefined): string {
  if (!category) {
    return "—";
  }

  return SUPPLIER_CATEGORY_LABELS[category] ?? category;
}
