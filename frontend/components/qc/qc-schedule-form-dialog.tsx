"use client";

import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createQcSchedule,
  updateQcSchedule,
  QC_CONTEXT_LABELS,
  QC_INSPECTION_CONTEXTS,
  type QcInspectionContext,
  type QcInspectionSchedule,
  type QcScheduleFrequency,
} from "@/lib/api/qc";
import { toast } from "sonner";

const FREQUENCIES: QcScheduleFrequency[] = [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
];

const SCHEDULE_CONTEXTS = QC_INSPECTION_CONTEXTS.filter((c) =>
  [
    "warehouse_accessories_audit",
    "warehouse_aluminium_audit",
    "warehouse_rubbers_audit",
    "tools_periodic",
  ].includes(c),
);

type QcScheduleFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: QcInspectionSchedule | null;
  onSaved: () => void;
};

export function QcScheduleFormDialog({
  open,
  onOpenChange,
  schedule,
  onSaved,
}: QcScheduleFormDialogProps) {
  const isEdit = Boolean(schedule?.id);
  const [name, setName] = useState("");
  const [context, setContext] = useState<QcInspectionContext>("warehouse_accessories_audit");
  const [frequency, setFrequency] = useState<QcScheduleFrequency>("weekly");
  const [frequencyInterval, setFrequencyInterval] = useState("1");
  const [nextDueAt, setNextDueAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (schedule) {
      setName(schedule.name);
      setContext(schedule.context);
      setFrequency(schedule.frequency as QcScheduleFrequency);
      setFrequencyInterval(String(schedule.frequency_interval));
      setNextDueAt(schedule.next_due_at.slice(0, 16));
      setIsActive(schedule.is_active);
    } else {
      setName("");
      setContext("warehouse_accessories_audit");
      setFrequency("weekly");
      setFrequencyInterval("1");
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setNextDueAt(tomorrow.toISOString().slice(0, 16));
      setIsActive(true);
    }
  }, [open, schedule]);

  const handleSave = async () => {
    if (!name.trim() || !nextDueAt) {
      toast.error("Name and next due date are required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        context,
        frequency,
        frequency_interval: Number(frequencyInterval) || 1,
        next_due_at: new Date(nextDueAt).toISOString(),
        is_active: isActive,
      };

      if (isEdit && schedule) {
        await updateQcSchedule(schedule.id, payload);
        toast.success("Schedule updated.");
      } else {
        await createQcSchedule(payload);
        toast.success("Schedule created.");
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save schedule.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit schedule" : "New schedule"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Context</Label>
            <Select
              value={context}
              disabled={isEdit}
              onValueChange={(v) => setContext(v as QcInspectionContext)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULE_CONTEXTS.map((ctx) => (
                  <SelectItem key={ctx} value={ctx}>
                    {QC_CONTEXT_LABELS[ctx]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={frequency}
                onValueChange={(v) => setFrequency(v as QcScheduleFrequency)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Interval</Label>
              <Input
                type="number"
                min={1}
                value={frequencyInterval}
                onChange={(e) => setFrequencyInterval(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Next due</Label>
            <Input
              type="datetime-local"
              value={nextDueAt}
              onChange={(e) => setNextDueAt(e.target.value)}
            />
          </div>
          {isEdit && (
            <div className="space-y-2">
              <Label>Active</Label>
              <Select
                value={isActive ? "yes" : "no"}
                onValueChange={(v) => setIsActive(v === "yes")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Active</SelectItem>
                  <SelectItem value="no">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
