"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  getDueDateTone,
  dueDateToneClasses,
  dueDateToneBgClasses,
} from "@/lib/activity-due-date";
import {
  leadActivityIcons,
  leadActivityLabels,
} from "@/lib/lead-activity-icons";
import { leadKanbanAssignees } from "@/lib/leads-kanban-data";
import type { LeadActivityType } from "@/lib/leads-kanban-data";

export function LeadsActivityModal({
  open,
  onOpenChange,
  activityType,
  leadTitle,
  onSave,
  onMarkDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityType: LeadActivityType | null;
  leadTitle: string;
  onSave?: (payload: {
    subject: string;
    description?: string;
    due_at?: string;
    activity_type?: string;
  }) => void | Promise<void>;
  onMarkDone?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [assignee, setAssignee] = useState(leadKanbanAssignees[0]);
  const [dueDate, setDueDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );

  useEffect(() => {
    if (open && activityType) {
      setTitle(`${leadActivityLabels[activityType]} — ${leadTitle}`);
      setNote("");
      setAssignee(leadKanbanAssignees[0]);
      setDueDate(new Date().toISOString().slice(0, 10));
    }
  }, [open, activityType, leadTitle]);

  const dueTone = useMemo(() => {
    if (!dueDate) return "green" as const;
    return getDueDateTone(new Date(dueDate + "T12:00:00"));
  }, [dueDate]);

  const Icon = activityType
    ? leadActivityIcons[activityType]
    : leadActivityIcons.schedule_call;

  const handleDiscard = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 pr-8">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                dueDateToneBgClasses(dueTone)
              )}
            >
              <Icon className={cn("h-5 w-5", dueDateToneClasses(dueTone))} />
            </span>
            <span className="text-left">
              {activityType ? leadActivityLabels[activityType] : "Activity"}
              <span className="mt-0.5 block text-sm font-normal text-muted-foreground">
                {leadTitle}
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="activity-title">Title</Label>
            <Input
              id="activity-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Activity title"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="activity-note">Brief note</Label>
            <Textarea
              id="activity-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add details about this activity…"
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="grid gap-2">
            <Label>Assign to</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {leadKanbanAssignees.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="activity-due" className="flex items-center gap-2">
              Due date
              <span
                className={cn(
                  "text-xs font-medium",
                  dueDateToneClasses(dueTone)
                )}
              >
                {dueTone === "green" && "Upcoming"}
                {dueTone === "orange" && "Due today"}
                {dueTone === "red" && "Overdue"}
              </span>
            </Label>
            <Input
              id="activity-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={cn(
                "border-border",
                dueTone === "orange" && "border-orange-300 focus-visible:ring-orange-400/30",
                dueTone === "red" && "border-red-300 focus-visible:ring-red-400/30",
                dueTone === "green" && "border-green-300 focus-visible:ring-green-400/30"
              )}
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="w-full sm:w-auto"
            onClick={handleDiscard}
          >
            Discard
          </Button>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                onMarkDone?.();
                onOpenChange(false);
              }}
            >
              Mark as done
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={async () => {
                await onSave?.({
                  subject: title,
                  description: note || undefined,
                  due_at: dueDate ? `${dueDate}T12:00:00` : undefined,
                  activity_type: activityType ?? undefined,
                });
                onOpenChange(false);
              }}
            >
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
