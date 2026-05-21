"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clock, FileText, Mail, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CrmPillToggle } from "@/components/crm/crm-pill-toggle";
import { formatDisplayDate } from "@/lib/activity-due-date";
import { leadActivityLabels } from "@/lib/lead-activity-icons";
import { formatKesFull, leadKanbanStages } from "@/lib/leads-kanban-data";
import { getStageLabel } from "@/lib/lead-record-resolver";
import { useLeadById } from "@/lib/leads-state";
import {
  CrmDetailField,
  CrmRecordDetailShell,
} from "@/components/crm/crm-record-detail-shell";
import { LeadRelatedLists } from "@/components/crm/lead-related-lists";
import { LeadComposeEmailDialog } from "@/components/crm/lead-compose-email-dialog";

function leadsBackHref(view: string | null) {
  const v =
    view && ["list", "kanban", "calendar", "map"].includes(view) ? view : "list";
  return `/crm/leads?view=${v}`;
}

type LeadDetailPanel = "details" | "timeline";

const detailPanels = [
  { id: "details" as const, label: "Details", icon: FileText, title: "Details" },
  { id: "timeline" as const, label: "Timeline", icon: Clock, title: "Timeline" },
];

export function LeadDetailView({ leadId }: { leadId: string }) {
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const lead = useLeadById(leadId);
  const backHref = leadsBackHref(view);
  const [panel, setPanel] = useState<LeadDetailPanel>("details");
  const [emailOpen, setEmailOpen] = useState(false);

  if (!lead) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">Lead not found.</p>
        <Button variant="link" asChild className="mt-2 text-[#1e3a5f]">
          <Link href={backHref}>Back to leads</Link>
        </Button>
      </div>
    );
  }

  const stage = leadKanbanStages.find((s) => s.id === lead.stageId);
  const convertHref = `/crm/leads/${leadId}/convert${view ? `?view=${view}` : ""}`;
  const editHref = `/crm/leads/${leadId}/edit${view ? `?view=${view}` : ""}`;
  return (
    <>
    <CrmRecordDetailShell
      backHref={backHref}
      recordTitle={lead.title}
      headerBadges={
        <div className="flex flex-wrap items-center gap-2">
          {stage && (
            <Badge className={cn("border-0 font-medium", stage.tagClass)}>
              {stage.label}
            </Badge>
          )}
          <Badge variant="outline" className="font-normal text-[#1e3a5f]">
            {lead.tag}
          </Badge>
        </div>
      }
      recordMeta={
        <p className="text-xs text-muted-foreground">
          Last updated · {formatDisplayDate(lead.nextActionDate)} · Owner:{" "}
          <span className="font-medium text-foreground">{lead.owner}</span>
        </p>
      }
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-border text-[#1e3a5f] hover:bg-[#ebf2ff]/50"
            onClick={() => setEmailOpen(true)}
          >
            <Mail className="mr-1.5 h-3.5 w-3.5" />
            Send Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-border text-[#1e3a5f] hover:bg-[#ebf2ff]/50"
            asChild
          >
            <Link href={convertHref}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Convert Lead
            </Link>
          </Button>
          <Button size="sm" className="h-9 gap-1.5" asChild>
            <Link href={editHref}>
              <Pencil className="h-3.5 w-3.5" />
              Edit Lead
            </Link>
          </Button>
        </>
      }
      sidebar={<LeadRelatedLists />}
    >
      <div className="mb-3 flex flex-wrap items-center gap-3 border-b border-border/80 pb-3">
        <CrmPillToggle
          value={panel}
          onChange={setPanel}
          options={detailPanels}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {panel === "details" && (
          <div className="p-4 sm:p-6">
            <h3 className="mb-4 text-sm font-semibold text-[#1e3a5f]">
              Lead Information
            </h3>
            <dl className="grid gap-x-8 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
              <CrmDetailField label="Lead Name" value={lead.title} />
              <CrmDetailField label="Company" value={lead.company} />
              <CrmDetailField label="Location" value={lead.location} />
              <CrmDetailField
                label="Email"
                value={lead.email}
                href={lead.email ? `mailto:${lead.email}` : undefined}
              />
              <CrmDetailField
                label="Phone"
                value={lead.phone}
                href={
                  lead.phone
                    ? `tel:${lead.phone.replace(/\s/g, "")}`
                    : undefined
                }
              />
              <CrmDetailField label="Lead Source" value={lead.source} />
              <CrmDetailField
                label="Lead Stage"
                value={getStageLabel(lead.stageId)}
              />
              <CrmDetailField label="Lead Owner" value={lead.owner} />
              <CrmDetailField
                label="Estimated Value"
                value={formatKesFull(lead.estimatedValue)}
              />
              <CrmDetailField
                label="Next Action Date"
                value={formatDisplayDate(lead.nextActionDate)}
              />
              <CrmDetailField label="Tag" value={lead.tag} />
              <CrmDetailField
                label="Latest Activity"
                value={
                  lead.lastActivityType
                    ? leadActivityLabels[lead.lastActivityType]
                    : null
                }
              />
              <CrmDetailField
                label="Notes"
                value={lead.notes}
                className="sm:col-span-2 xl:col-span-3"
              />
            </dl>
          </div>
        )}

        {panel === "timeline" && (
          <div className="p-4 sm:p-6">
            <p className="text-sm text-muted-foreground">
              Activity timeline will appear here as calls, meetings, and tasks
              are logged on this lead.
            </p>
          </div>
        )}
      </div>
    </CrmRecordDetailShell>

      <LeadComposeEmailDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        lead={lead}
        leadId={leadId}
        returnView={view}
      />
    </>
  );
}
