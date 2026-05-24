export { mockPurchaseOrders, mockSuppliers } from "@/lib/mock-data";

export async function getPurchaseOrders() {
  const { mockPurchaseOrders } = await import("@/lib/mock-data");
  return mockPurchaseOrders;
}

export async function getSuppliers() {
  const { mockSuppliers } = await import("@/lib/mock-data");
  return mockSuppliers;
}
