export { mockDashboardMetrics, mockActivities } from "@/lib/mock-data";

export async function getDashboardMetrics() {
  const { mockDashboardMetrics } = await import("@/lib/mock-data");
  return mockDashboardMetrics;
}

export async function getRecentActivities() {
  const { mockActivities } = await import("@/lib/mock-data");
  return mockActivities;
}
