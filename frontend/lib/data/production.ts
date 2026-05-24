export { mockProductionOrders } from "@/lib/mock-data";

export async function getProductionOrders() {
  const { mockProductionOrders } = await import("@/lib/mock-data");
  return mockProductionOrders;
}
