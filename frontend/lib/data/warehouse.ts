export { mockWarehouseItems } from "@/lib/mock-data";

export async function getWarehouseItems() {
  const { mockWarehouseItems } = await import("@/lib/mock-data");
  return mockWarehouseItems;
}
