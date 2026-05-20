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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { leadKanbanStages, type LeadKanbanStageId } from "@/lib/leads-kanban-data";
import {
  emptyLeadForm,
  leadFormValuesToKanbanCard,
  leadSourceOptions,
  tagOptions,
  type LeadFormValues,
} from "@/lib/lead-form-config";
import { leadKanbanAssignees } from "@/lib/leads-kanban-data";

/** @deprecated Use LeadFormValues from @/lib/lead-form-config */
export type AddLeadFormValues = LeadFormValues;

export const addLeadFormToKanbanCard = leadFormValuesToKanbanCard;

export function LeadsAddLeadModal({
  open,
  onOpenChange,
  defaultStageId,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStageId: LeadKanbanStageId;
  onSubmit: (values: LeadFormValues) => void;
}) {
  const [form, setForm] = useState<LeadFormValues>(() =>
    emptyLeadForm(defaultStageId)
  );

  useEffect(() => {
    if (open) {
      setForm(emptyLeadForm(defaultStageId));
    }
  }, [open, defaultStageId]);

  const update = <K extends keyof LeadFormValues>(
    key: K,
    value: LeadFormValues[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.location.trim()) return;
    onSubmit(form);
    onOpenChange(false);
  };

  const stageLabel =
    leadKanbanStages.find((s) => s.id === defaultStageId)?.label ?? "New Lead";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Lead</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Adding to <span className="font-medium text-foreground">{stageLabel}</span>
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="lead-title">
              Lead name <span className="text-primary">*</span>
            </Label>
            <Input
              id="lead-title"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Kilimani Apartment"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="lead-company">Company</Label>
            <Input
              id="lead-company"
              value={form.company}
              onChange={(e) => update("company", e.target.value)}
              placeholder="Company or client name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="lead-location">
              Location <span className="text-primary">*</span>
            </Label>
            <Input
              id="lead-location"
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="e.g. Kilimani, Nairobi"
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="lead-phone">Phone</Label>
              <Input
                id="lead-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="0712 345 678"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-email">Email</Label>
              <Input
                id="lead-email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="name@company.co.ke"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Lead source</Label>
              <Select
                value={form.source}
                onValueChange={(v) => update("source", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {leadSourceOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Stage</Label>
              <Select
                value={form.stageId}
                onValueChange={(v) =>
                  update("stageId", v as LeadKanbanStageId)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {leadKanbanStages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Owner</Label>
              <Select
                value={form.owner}
                onValueChange={(v) => update("owner", v)}
              >
                <SelectTrigger>
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
              <Label htmlFor="lead-value">Estimated value (KES)</Label>
              <Input
                id="lead-value"
                type="number"
                min={0}
                step={1000}
                value={form.estimatedValue || ""}
                onChange={(e) =>
                  update("estimatedValue", Number(e.target.value) || 0)
                }
                placeholder="950000"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="lead-next-action">Next action date</Label>
              <Input
                id="lead-next-action"
                type="date"
                value={form.nextActionDate}
                onChange={(e) => update("nextActionDate", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Tag</Label>
              <Select value={form.tag} onValueChange={(v) => update("tag", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tagOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="lead-notes">Notes</Label>
            <Textarea
              id="lead-notes"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Brief notes about this lead…"
              rows={3}
              className="resize-none"
            />
          </div>

          <DialogFooter className="gap-2 pt-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Lead</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
