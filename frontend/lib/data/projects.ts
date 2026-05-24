export { mockProjects } from "@/lib/mock-data";

export async function getProjects() {
  const { mockProjects } = await import("@/lib/mock-data");
  return mockProjects;
}
