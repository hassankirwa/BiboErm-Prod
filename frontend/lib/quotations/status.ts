export function formatQuotationStatus(status: string | null | undefined): string {
  if (!status) return "Unknown";

  const labels: Record<string, string> = {
    draft: "Draft",
    internal_review: "Pending approval",
    approved: "Approved",
    sent: "Sent to client",
    revision_requested: "Revision requested",
    revised: "Revised",
    accepted: "Accepted",
    rejected: "Rejected",
    expired: "Expired",
  };

  return labels[status] ?? status.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function quotationStatusDescription(
  status: string | null | undefined,
): string | null {
  switch (status) {
    case "draft":
      return "Review line items and pricing, then submit for approval when the quotation is ready.";
    case "internal_review":
      return "Waiting for a manager to approve pricing before it can be sent to the client.";
    case "approved":
      return "Approved internally — send to the client when you are ready to release it to sales.";
    case "revised":
      return "Revised quotation ready — send the updated version to the client.";
    default:
      return null;
  }
}

export const APPROVABLE_QUOTATION_STATUSES = new Set(["internal_review"]);

export const SENDABLE_QUOTATION_STATUSES = new Set(["approved", "revised"]);

export const SUBMITTABLE_QUOTATION_STATUSES = new Set(["draft"]);

export const QUOTATION_APPROVE_PERMISSIONS = [
  "quotations.approve",
  "quotations.send",
  "crm.manage",
] as const;

export const QUOTATION_RELEASE_PERMISSIONS = [
  "quotations.send",
  "quotations.approve",
] as const;

export const QUOTATION_STATUS_BADGE_CLASS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  internal_review: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-success/10 text-success border-success/20",
  sent: "bg-primary/10 text-primary border-primary/20",
  revision_requested: "bg-chart-5/10 text-chart-5 border-chart-5/20",
  revised: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  accepted: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  expired: "bg-muted text-muted-foreground",
};

export function quotationReleaseActionLabel(
  status: string | null | undefined,
): string {
  if (status === "internal_review") return "Approve quotation";
  return "Send to client";
}
