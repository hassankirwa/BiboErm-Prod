import type { LeadViewMode } from "@/lib/leads-list-data";

export function leadDetailHref(
  leadId: string,
  view: LeadViewMode = "list"
): string {
  return `/crm/leads/${leadId}?view=${view}`;
}
