/**
 * Data access layer — swap implementations here when backend APIs ship.
 * Components should import from @/lib/data/*, not mock-data directly.
 */
export {
  mockLeads,
  mockDeals,
  mockContacts,
  mockAccounts,
  mockActivities,
  mockUsers,
} from "@/lib/mock-data";

export async function getLeads() {
  const { mockLeads } = await import("@/lib/mock-data");
  return mockLeads;
}

export async function getDeals() {
  const { mockDeals } = await import("@/lib/mock-data");
  return mockDeals;
}

export async function getContacts() {
  const { mockContacts } = await import("@/lib/mock-data");
  return mockContacts;
}

export async function getAccounts() {
  const { mockAccounts } = await import("@/lib/mock-data");
  return mockAccounts;
}

export async function getActivities() {
  const { mockActivities } = await import("@/lib/mock-data");
  return mockActivities;
}

export async function getUsers() {
  const { mockUsers } = await import("@/lib/mock-data");
  return mockUsers;
}
