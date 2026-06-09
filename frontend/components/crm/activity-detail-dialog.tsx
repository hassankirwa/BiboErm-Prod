"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDisplayDate } from "@/lib/activity-due-date";
import { activityTypeLabel } from "@/lib/crm-activity-types";
import type { ApiActivity } from "@/lib/api/crm/types";

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function ActivityDetailDialog({
  activity,
  open,
  onOpenChange,
}: {
  activity: ApiActivity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!activity) return null;

  const type = activity.activity_type ?? activity.type;
  const assigneeName = activity.assignee?.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle className="pr-8 text-left">{activity.subject}</DialogTitle>
        </DialogHeader>

        <dl className="grid gap-3 py-1">
          <DetailField label="Type">{activityTypeLabel(type)}</DetailField>

          <DetailField label="Status">
            <Badge variant="outline" className="rounded-[5px] capitalize">
              {formatStatus(activity.status)}
            </Badge>
          </DetailField>

          {activity.due_at && (
            <DetailField label="Due date">
              {formatDisplayDate(activity.due_at.slice(0, 10))}
            </DetailField>
          )}

          {assigneeName && (
            <DetailField label="Assigned to">{assigneeName}</DetailField>
          )}

          {(activity.description || activity.body) && (
            <DetailField label="Description">
              <p className="whitespace-pre-wrap text-muted-foreground">
                {activity.description ?? activity.body}
              </p>
            </DetailField>
          )}

          {activity.completed_at && (
            <DetailField label="Completed">
              {formatDisplayDate(activity.completed_at.slice(0, 10))}
            </DetailField>
          )}

          {activity.created_at && (
            <DetailField label="Created">
              {formatDisplayDate(activity.created_at.slice(0, 10))}
            </DetailField>
          )}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
