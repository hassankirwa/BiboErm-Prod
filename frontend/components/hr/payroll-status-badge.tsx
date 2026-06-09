import { Badge } from "@/components/ui/badge";
import type { PayrollRunStatus } from "@/lib/api/payroll";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<PayrollRunStatus, string> = {
  draft: "bg-slate-100 text-slate-700 hover:bg-slate-100",
  pending_finance: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  approved: "bg-green-100 text-green-800 hover:bg-green-100",
  processed: "bg-blue-100 text-blue-800 hover:bg-blue-100",
};

const STATUS_LABELS: Record<PayrollRunStatus, string> = {
  draft: "Draft",
  pending_finance: "Pending finance",
  approved: "Approved",
  processed: "Processed",
};

export function PayrollStatusBadge({
  status,
  className,
}: {
  status: PayrollRunStatus;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn(STATUS_STYLES[status], className)}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
