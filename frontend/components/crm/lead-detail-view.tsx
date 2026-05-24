"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clock, FileText, Mail, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { CrmPillToggle } from "@/components/crm/crm-pill-toggle";
import { formatDisplayDate } from "@/lib/activity-due-date";
import { leadActivityLabels } from "@/lib/lead-activity-icons";
import { formatKesFull, leadKanbanStages } from "@/lib/leads-kanban-data";
import { getStageLabel } from "@/lib/lead-record-resolver";
import { useCrmLead } from "@/lib/use-crm-lead";
import { fetchActivities } from "@/lib/api/crm/activities";
import type { ApiActivity } from "@/lib/api/crm/types";
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
  const { card: lead, loading, error } = useCrmLead(leadId);
  const backHref = leadsBackHref(view);
  const [panel, setPanel] = useState<LeadDetailPanel>("details");
  const [emailOpen, setEmailOpen] = useState(false);
  const [activities, setActivities] = useState<ApiActivity[]>([]);

  useEffect(() => {
    const id = Number(leadId);
    if (!Number.isFinite(id) || id <= 0) return;
    fetchActivities({ lead_id: id, per_page: 50 })
      .then((res) => setActivities(res.data ?? []))
      .catch(() => setActivities([]));
  }, [leadId]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">
          {error ?? "Lead not found."}
        </p>
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
        sidebar={<LeadRelatedLists leadId={Number(leadId)} />}
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
                <CrmDetailField label="Source" value={lead.source} />
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
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No activities logged yet for this lead.
                </p>
              ) : (
                <ul className="space-y-3">
                  {activities.map((activity) => (
                    <li
                      key={activity.id}
                      className="rounded-md border border-border/80 px-3 py-2 text-sm"
                    >
                      <p className="font-medium text-foreground">
                        {activity.subject}
                      </p>
                      {activity.due_at && (
                        <p className="text-xs text-muted-foreground">
                          Due {formatDisplayDate(activity.due_at.slice(0, 10))}
                        </p>
                      )}
                      {activity.description && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {activity.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
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
