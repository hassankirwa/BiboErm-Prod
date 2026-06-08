import { Calendar, CheckSquare, Clock, Phone } from "lucide-react";
import type { LeadActivityType } from "@/lib/leads-kanban-data";

export const leadActivityIcons: Record<
  LeadActivityType,
  React.ComponentType<{ className?: string }>
> = {
  create_task: CheckSquare,
  follow_up: Clock,
  schedule_meeting: Calendar,
  schedule_call: Phone,
};

export const leadActivityLabels: Record<LeadActivityType, string> = {
  create_task: "Create task",
  follow_up: "Follow-up",
  schedule_meeting: "Schedule a meeting",
  schedule_call: "Schedule a call",
};

export function LeadActivityIcon({
  type,
  className,
}: {
  type: LeadActivityType;
  className?: string;
}) {
  const Icon = leadActivityIcons[type];
  return <Icon className={className} />;
}
