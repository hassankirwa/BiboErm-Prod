"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { LeadKanbanCard } from "@/lib/leads-kanban-data";
import { LeadComposeEmail } from "@/components/crm/lead-compose-email";

export function LeadComposeEmailDialog({
  open,
  onOpenChange,
  lead,
  leadId,
  returnView,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadKanbanCard;
  leadId: string;
  returnView?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-3xl lg:max-w-4xl"
        )}
      >
        <DialogTitle className="sr-only">
          Send email to {lead.company || lead.title}
        </DialogTitle>
        <LeadComposeEmail
          lead={lead}
          leadId={leadId}
          returnView={returnView}
          variant="modal"
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
