import type { ApiContact, ApiLead, ApiLeadDetail } from "@/lib/api/crm/types";

type LeadWithContacts = Pick<
  ApiLead | ApiLeadDetail,
  "linked_contacts" | "source_contact" | "converted_contact"
>;

export function resolvePrimaryLinkedContact(
  lead: LeadWithContacts,
): ApiContact | null {
  const linked = lead.linked_contacts ?? [];
  if (linked.length > 0) return linked[0];
  if (lead.source_contact) return lead.source_contact;
  if (lead.converted_contact) return lead.converted_contact;
  return null;
}

export function resolveLeadListCompany(lead: ApiLead): string {
  const linked = resolvePrimaryLinkedContact(lead);
  return (
    lead.account_name ??
    lead.company ??
    linked?.account?.name ??
    linked?.name ??
    "—"
  );
}

export function resolveLeadListEmail(lead: ApiLead): string {
  const linked = resolvePrimaryLinkedContact(lead);
  return lead.email ?? linked?.email ?? "—";
}

export function resolveLeadListPhone(lead: ApiLead): string {
  const linked = resolvePrimaryLinkedContact(lead);
  return lead.phone ?? linked?.phone ?? "—";
}
