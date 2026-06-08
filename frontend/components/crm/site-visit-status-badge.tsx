import { Badge } from "@/components/ui/badge";
import { formatSiteVisitStatus } from "@/lib/crm/site-visit-utils";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  approved: "default",
  submitted_for_review: "secondary",
  measurements_captured: "secondary",
  in_progress: "secondary",
  scheduled: "outline",
  assigned: "outline",
  revisit_required: "destructive",
  cancelled: "destructive",
};

export function SiteVisitStatusBadge({ status }: { status: string | null }) {
  const value = status ?? "scheduled";
  return (
    <Badge variant={STATUS_VARIANT[value] ?? "outline"}>
      {formatSiteVisitStatus(value)}
    </Badge>
  );
}
