import { Badge } from "@/components/ui/badge";
import type { LeaveStatus } from "@/lib/api/leave";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<LeaveStatus, string> = {
  pending: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  approved: "bg-green-100 text-green-800 hover:bg-green-100",
  rejected: "bg-red-100 text-red-800 hover:bg-red-100",
  cancelled: "bg-slate-100 text-slate-700 hover:bg-slate-100",
};

const STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export function LeaveStatusBadge({
  status,
  className,
}: {
  status: LeaveStatus;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn(STATUS_STYLES[status], className)}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
