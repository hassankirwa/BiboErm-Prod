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
import { Spinner } from "@/components/ui/spinner";
import { leadKanbanStages, type LeadKanbanStageId } from "@/lib/leads-kanban-data";
import {
  emptyLeadForm,
  leadFormValuesToKanbanCard,
  type LeadFormValues,
} from "@/lib/lead-form-config";
import { LeadFormFields } from "@/components/crm/lead-form-ui";
import { useCrmFormLookups } from "@/hooks/use-crm-form-lookups";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

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
  const { user } = useAuth();
  const { lookups, loading, error } = useCrmFormLookups({
    assignableRole: "sales_representative",
  });
  const [form, setForm] = useState<LeadFormValues>(() =>
    emptyLeadForm(defaultStageId),
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        emptyLeadForm(defaultStageId, {
          ownerId: user?.id ?? null,
          leadSourceId: lookups?.lead_sources[0]?.id ?? null,
          leadTypeId: lookups?.lead_types[0]?.id ?? null,
        }),
      );
    }
  }, [open, defaultStageId, user?.id, lookups]);

  const update = <K extends keyof LeadFormValues>(
    key: K,
    value: LeadFormValues[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (form.needSiteVisit && !form.assignedFieldOfficerId) {
      toast.error("Assign a field officer when a site visit is required.");
      return;
    }
    setSubmitting(true);
    Promise.resolve(onSubmit(form))
      .then(() => onOpenChange(false))
      .finally(() => setSubmitting(false));
  };

  const stageLabel =
    leadKanbanStages.find((s) => s.id === defaultStageId)?.label ?? "New Lead";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Lead</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Adding to{" "}
            <span className="font-medium text-foreground">{stageLabel}</span>
          </p>
        </DialogHeader>

        {loading && !lookups ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-8 w-8 text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4 py-2">
            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : null}
            <LeadFormFields form={form} update={update} variant="modal" />
            <DialogFooter className="gap-2 pt-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create Lead"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
