export const PROFILE_FIELD_LABELS: Record<string, string> = {
  name: "Full name",
  email: "Email",
  phone: "Phone",
  gender: "Gender",
  address: "Address",
  emergency_contact_name: "Emergency contact",
  emergency_contact_phone: "Emergency phone",
  emergency_contact_relationship: "Relationship",
};

export function formatProfileFieldValue(value: string | null | undefined): string {
  if (!value) return "—";
  return value;
}
