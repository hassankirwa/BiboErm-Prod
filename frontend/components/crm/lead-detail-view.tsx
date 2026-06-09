"use client";



import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import { useSearchParams } from "next/navigation";

import {

  Calendar,

  CheckCircle2,

  Clock,

  FileText,

  Mail,

  Pencil,

  Phone,

  RefreshCw,

  ThumbsDown,

  ThumbsUp,

  Upload,

} from "lucide-react";

import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";

import { Spinner } from "@/components/ui/spinner";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";

import {

  Dialog,

  DialogContent,

  DialogFooter,

  DialogHeader,

  DialogTitle,

} from "@/components/ui/dialog";

import {

  Select,

  SelectContent,

  SelectItem,

  SelectTrigger,

  SelectValue,

} from "@/components/ui/select";

import { cn } from "@/lib/utils";

import { CrmPillToggle } from "@/components/crm/crm-pill-toggle";

import { formatDisplayDate } from "@/lib/activity-due-date";

import { leadKanbanStages } from "@/lib/leads-kanban-data";

import { useCrmLead } from "@/lib/use-crm-lead";

import { fetchActivities, createActivity } from "@/lib/api/crm/activities";

import {

  fetchLead,

  leadDisplayName,

  updateLead,

  updateLeadStatus,

  uploadLeadAttachment,

} from "@/lib/api/crm/leads";

import { fetchCrmAssignableUsers } from "@/lib/api/crm/lookups";

import { scheduleSiteVisit } from "@/lib/api/crm/site-visits";

import { ScheduleSiteVisitFieldOfficerTag } from "@/components/crm/schedule-site-visit-field-officer-tag";

import {
  defaultSiteVisitAssigneeId,
  SiteVisitAssigneeSelect,
} from "@/components/crm/site-visit-assignee-select";

import { useAuth } from "@/contexts/auth-context";

import { resolveFieldOfficerName } from "@/lib/crm/site-visit-utils";

import type { ApiLeadDetail } from "@/lib/api/crm/types";

import type { ApiActivity } from "@/lib/api/crm/types";

import { apiLeadToKanbanCard } from "@/lib/crm-lead-mapper";

import { ensureCsrfCookie } from "@/lib/api/client";

import { ApiError } from "@/lib/api/errors";

import { CrmRecordDetailShell } from "@/components/crm/crm-record-detail-shell";

import { LeadRelatedLists } from "@/components/crm/lead-related-lists";
import { LeadDetailIntake } from "@/components/crm/lead-detail-intake";
import { LeadQuotationActions } from "@/components/crm/lead-quotation-actions";
import { useCrmFormLookups } from "@/hooks/use-crm-form-lookups";

import { PermissionGate } from "@/components/auth/permission-gate";

import { LeadComposeEmailDialog } from "@/components/crm/lead-compose-email-dialog";

import { LeadsActivityModal } from "@/components/crm/leads-activity-modal";

import {
  LeadNotesCanvas,
  LeadStageNotesDialog,
  appendLeadNote,
  hasLeadNotes,
} from "@/components/crm/lead-notes-canvas";

import {
  canCommercialConvertLead,
  canProvisionAccountFromLead,
  hasApprovedSiteVisit,
  hasQuotationSentToClient,
  statusToKanbanStage,
} from "@/lib/crm-lead-status";

import type { LeadActivityType } from "@/lib/leads-kanban-data";

import { toast } from "sonner";



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



type LeadOverride = {

  lead: ApiLeadDetail;

  card: ReturnType<typeof apiLeadToKanbanCard>;

};

type PendingStageAction =

  | { kind: "contact"; label: "Contact Lead" }

  | { kind: "status"; label: string; status: string; message: string };



export function LeadDetailView({ leadId }: { leadId: string }) {

  const { user } = useAuth();

  const searchParams = useSearchParams();

  const view = searchParams.get("view");

  const hook = useCrmLead(leadId);
  const { lookups } = useCrmFormLookups();

  const [override, setOverride] = useState<LeadOverride | null>(null);

  const lead = override?.lead ?? hook.lead;

  const card = override?.card ?? hook.card;

  const loading = hook.loading && !override;

  const error = hook.error;

  const backHref = leadsBackHref(view);

  const [panel, setPanel] = useState<LeadDetailPanel>("details");

  const [emailOpen, setEmailOpen] = useState(false);

  const [activities, setActivities] = useState<ApiActivity[]>([]);

  const [actionLoading, setActionLoading] = useState(false);

  const [visitDialogOpen, setVisitDialogOpen] = useState(false);

  const [fieldOfficers, setFieldOfficers] = useState<

    { id: number; name: string }[]

  >([]);

  const [visitForm, setVisitForm] = useState({

    title: "",

    visit_date: "",

    visit_time: "",

    assigned_field_officer_id: "",

    site_address: "",

    notes_for_field_officer: "",

  });

  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const [activityModalOpen, setActivityModalOpen] = useState(false);

  const [activityType, setActivityType] = useState<LeadActivityType | null>(null);

  const [stageNotesOpen, setStageNotesOpen] = useState(false);

  const [pendingStageAction, setPendingStageAction] =
    useState<PendingStageAction | null>(null);

  const [notesSaving, setNotesSaving] = useState(false);

  const attachmentInputRef = useRef<HTMLInputElement>(null);



  const reloadLead = useCallback(async () => {

    const id = Number(leadId);

    if (!Number.isFinite(id) || id <= 0) return;

    const data = await fetchLead(id, { skipCache: true });

    setOverride({ lead: data, card: apiLeadToKanbanCard(data) });

    const res = await fetchActivities({ lead_id: id, per_page: 50 });

    setActivities(res.data ?? []);

  }, [leadId]);



  useEffect(() => {

    const id = Number(leadId);

    if (!Number.isFinite(id) || id <= 0) return;

    fetchActivities({ lead_id: id, per_page: 50 })

      .then((res) => setActivities(res.data ?? []))

      .catch(() => setActivities([]));

  }, [leadId]);



  useEffect(() => {

    fetchCrmAssignableUsers({ context: "site_visits" })

      .then((res) =>

        setFieldOfficers(res.data.map((u) => ({ id: u.id, name: u.name }))),

      )

      .catch(() => {});

  }, []);



  const status = (lead?.status ?? card?.statusKey ?? "new").toLowerCase();

  useEffect(() => {
    const id = Number(leadId);
    if (!Number.isFinite(id) || id <= 0) return;
    const hasLinkedAccount = Boolean(
      lead?.converted_account_id ?? lead?.converted_account?.id,
    );
    if (status !== "interested" || hasLinkedAccount) return;

    const timer = window.setInterval(() => {
      fetchLead(id)
        .then((data) => {
          const linkedAccountId =
            data.converted_account_id ?? data.converted_account?.id ?? null;
          if (linkedAccountId || data.status === "account_created") {
            setOverride({ lead: data, card: apiLeadToKanbanCard(data) });
          }
        })
        .catch(() => {});
    }, 4000);

    return () => window.clearInterval(timer);
  }, [
    leadId,
    status,
    lead?.converted_account_id,
    lead?.converted_account?.id,
  ]);

  const latestSiteVisitId = useMemo(() => {

    const visits = lead?.site_visits ?? [];

    if (visits.length === 0) return null;

    return visits[visits.length - 1]?.id ?? null;

  }, [lead?.site_visits]);

  const latestSiteVisit = useMemo(() => {
    const visits = lead?.site_visits ?? [];
    if (visits.length === 0) return null;
    return visits[visits.length - 1] ?? null;
  }, [lead?.site_visits]);

  const linkedAccountId =
    lead?.converted_account_id ?? lead?.converted_account?.id ?? null;



  const leadFieldOfficerName = useMemo(

    () =>

      resolveFieldOfficerName(

        lead?.assigned_field_officer,

        lead?.assigned_field_officer_id,

        fieldOfficers,

      ),

    [lead, fieldOfficers],



  );



  async function runStageAction(fn: () => Promise<void>) {

    setActionLoading(true);

    try {

      await ensureCsrfCookie();

      await fn();

      await reloadLead();

    } catch (err) {

      toast.error(

        err instanceof ApiError ? err.message : "Action failed.",

      );

    } finally {

      setActionLoading(false);

    }

  }



  function requestStageAction(action: PendingStageAction) {

    setPendingStageAction(action);

    setStageNotesOpen(true);

  }



  async function saveAppendedNote(noteText: string, label?: string) {

    const updatedNotes = appendLeadNote(lead?.notes, noteText, { label });

    await updateLead(Number(leadId), { notes: updatedNotes });

  }



  async function handleAddNote(noteText: string) {

    setNotesSaving(true);

    try {

      await ensureCsrfCookie();

      await saveAppendedNote(noteText);

      await reloadLead();

      toast.success("Note added.");

    } catch (err) {

      toast.error(

        err instanceof ApiError ? err.message : "Failed to save note.",

      );

      throw err;

    } finally {

      setNotesSaving(false);

    }

  }



  async function executePendingStageAction(action: PendingStageAction) {

    if (action.kind === "contact") {

      await createActivity({

        lead_id: Number(leadId),

        subject: `Contacted — ${card?.title ?? "Lead"}`,

        activity_type: "schedule_call",

        type: "schedule_call",

      });

      await updateLeadStatus(Number(leadId), "contacted");

      toast.success("Lead marked as contacted.");

      return;

    }

    await updateLeadStatus(Number(leadId), action.status);

    toast.success(action.message);

  }



  async function handleStageNotesConfirm(noteText: string) {

    if (!pendingStageAction || !noteText.trim()) return;

    setNotesSaving(true);

    try {

      await ensureCsrfCookie();

      await saveAppendedNote(noteText, pendingStageAction.label);

      const action = pendingStageAction;

      setStageNotesOpen(false);

      setPendingStageAction(null);

      setActionLoading(true);

      try {

        await executePendingStageAction(action);

        await reloadLead();

      } finally {

        setActionLoading(false);

      }

    } catch (err) {

      toast.error(

        err instanceof ApiError ? err.message : "Failed to complete action.",

      );

    } finally {

      setNotesSaving(false);

    }

  }



  async function handleScheduleVisit() {

    await runStageAction(async () => {

      await scheduleSiteVisit({

        title: visitForm.title || leadDisplayName(lead!),

        lead_id: Number(leadId),

        account_id: lead?.converted_account_id ?? undefined,

        site_address:

          visitForm.site_address || lead?.site_address || undefined,

        assigned_field_officer_id: Number(visitForm.assigned_field_officer_id),

        visit_date: visitForm.visit_date,

        visit_time: visitForm.visit_time || undefined,

        visit_purpose: "assessment",

        requires_measurements: false,

        notes_for_field_officer: visitForm.notes_for_field_officer || undefined,

      });

      setVisitDialogOpen(false);

      toast.success("Site visit scheduled.");

    });

  }



  async function handleAttachmentUpload(file: File) {

    setUploadingAttachment(true);

    try {

      await ensureCsrfCookie();

      await uploadLeadAttachment(Number(leadId), file);

      toast.success("Attachment uploaded.");

      await reloadLead();

    } catch (err) {

      toast.error(

        err instanceof ApiError ? err.message : "Failed to upload attachment.",

      );

    } finally {

      setUploadingAttachment(false);

    }

  }



  async function handleActivitySave(payload: {

    subject: string;

    description?: string;

    due_at?: string;

    activity_type?: string;

    assigned_to?: number;

  }) {

    await runStageAction(async () => {

      await createActivity({

        lead_id: Number(leadId),

        subject: payload.subject,

        description: payload.description,

        due_at: payload.due_at,

        activity_type: payload.activity_type,

        type: payload.activity_type,

        assigned_to: payload.assigned_to,

      });

      setActivityModalOpen(false);

      toast.success("Activity logged.");

    });

  }



  const stageActions = useMemo(() => {

    const convertHref = `/crm/leads/${leadId}/convert${view ? `?view=${view}` : ""}`;

    const disabled = actionLoading;

    const activityButtons = (

      <>

        <Button

          size="sm"

          variant="outline"

          className="h-9"

          disabled={disabled}

          onClick={() => {

            setActivityType("schedule_call");

            setActivityModalOpen(true);

          }}

        >

          <Phone className="mr-1.5 h-3.5 w-3.5" />

          Log Call

        </Button>

        <Button

          size="sm"

          variant="outline"

          className="h-9"

          disabled={disabled}

          onClick={() => {

            setActivityType("follow_up");

            setActivityModalOpen(true);

          }}

        >

          <Clock className="mr-1.5 h-3.5 w-3.5" />

          Follow-up

        </Button>

      </>

    );



    const accountId =
      lead?.converted_account_id ?? lead?.converted_account?.id ?? null;
    const accountHref = accountId ? `/crm/accounts/${accountId}` : null;

    switch (statusToKanbanStage(status)) {

      case "new":

        return (

          <PermissionGate permission="leads.update">

            <div className="flex flex-wrap gap-2">

              {activityButtons}

              <Button

              size="sm"

              className="h-9"

              disabled={disabled}

              onClick={() =>

                requestStageAction({ kind: "contact", label: "Contact Lead" })

              }

              title={

                lead && !hasLeadNotes(lead)

                  ? "Add a note before contacting this lead"

                  : undefined

              }

            >

              <Phone className="mr-1.5 h-3.5 w-3.5" />

              Contact Lead

            </Button>

            </div>

          </PermissionGate>

        );

      case "contacted":

        return (

          <PermissionGate permission="leads.update">

            <div className="flex flex-wrap gap-2">

              {activityButtons}

              <Button

                size="sm"

                className="h-9"

                disabled={disabled}

                onClick={() =>

                  requestStageAction({

                    kind: "status",

                    label: "Mark Interested",

                    status: "interested",

                    message: "Marked as interested.",

                  })

                }

                title={

                  lead && !hasLeadNotes(lead)

                    ? "Add a note before changing stage"

                    : undefined

                }

              >

                <ThumbsUp className="mr-1.5 h-3.5 w-3.5" />

                Mark Interested

              </Button>

              <Button

                size="sm"

                variant="outline"

                className="h-9"

                disabled={disabled}

                onClick={() =>

                  requestStageAction({

                    kind: "status",

                    label: "Not Interested",

                    status: "unqualified",

                    message: "Marked as not interested.",

                  })

                }

                title={

                  lead && !hasLeadNotes(lead)

                    ? "Add a note before changing stage"

                    : undefined

                }

              >

                <ThumbsDown className="mr-1.5 h-3.5 w-3.5" />

                Not Interested

              </Button>

            </div>

          </PermissionGate>

        );

      case "interested":

        return (

          <PermissionGate permission="leads.update">

            <div className="flex flex-wrap items-center gap-2">

              {activityButtons}

              {accountHref ? (

                <Button size="sm" className="h-9" asChild>

                  <Link href={accountHref}>Open Account</Link>

                </Button>

              ) : (

                <Badge variant="secondary" className="h-9 px-3 font-normal">

                  Account provisioning…

                </Badge>

              )}

            </div>

          </PermissionGate>

        );

      case "account_created":

        return (

          <div className="flex flex-wrap gap-2">

            {activityButtons}

            {accountHref ? (

              <Button size="sm" className="h-9" asChild>

                <Link href={accountHref}>Open Account</Link>

              </Button>

            ) : null}

            <PermissionGate permission="site_visits.schedule">

              <Button

                size="sm"

                variant="outline"

                className="h-9"

                disabled={disabled}

                onClick={() => {

                  setVisitForm((f) => ({

                    ...f,

                    title: card?.title ?? "",

                    site_address: lead?.site_address ?? "",

                    visit_date: new Date().toISOString().slice(0, 10),

                    assigned_field_officer_id: defaultSiteVisitAssigneeId(

                      user?.id,

                      lead?.assigned_field_officer_id ??

                        (f.assigned_field_officer_id

                          ? Number(f.assigned_field_officer_id)

                          : null),

                    ),

                  }));

                  setVisitDialogOpen(true);

                }}

              >

                <Calendar className="mr-1.5 h-3.5 w-3.5" />

                Schedule Site Visit

              </Button>

            </PermissionGate>

            {latestSiteVisitId ? (

              <Button size="sm" variant="outline" className="h-9" asChild>

                <Link href={`/crm/site-visits/${latestSiteVisitId}`}>

                  View Visit

                </Link>

              </Button>

            ) : null}

            {((latestSiteVisit?.status === "approved" && linkedAccountId) ||
              lead?.latest_quotation ||
              lead?.sales_deal?.id) ? (
              <LeadQuotationActions
                latestQuotation={lead?.latest_quotation}
                salesDeal={lead?.sales_deal ?? lead?.converted_deal ?? undefined}
                linkedAccountId={linkedAccountId}
                showCreateQuotation={
                  latestSiteVisit?.status === "approved" && !lead?.latest_quotation
                }
                disabled={disabled}
                onRefresh={reloadLead}
              />
            ) : latestSiteVisit &&
              ["submitted_for_review", "measurements_captured"].includes(
                latestSiteVisit.status ?? "",
              ) ? (

              <Badge variant="secondary" className="h-9 px-3 font-normal">

                Awaiting visit approval

              </Badge>

            ) : null}

          </div>

        );

      default:

        return null;

    }

  }, [

    status,

    actionLoading,

    leadId,

    view,

    latestSiteVisitId,

    latestSiteVisit,

    linkedAccountId,

    lead?.converted_deal_id,

    lead?.converted_account_id,

    lead?.latest_quotation,

    lead?.sales_deal,

    lead?.converted_deal,

    reloadLead,

    lead?.site_address,

    lead?.notes,

    lead?.internal_notes,

    card?.title,

  ]);



  if (loading) {

    return (

      <div className="flex justify-center py-16">

        <Spinner className="h-8 w-8 text-primary" />

      </div>

    );

  }



  if (error || !lead || !card) {

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



  const stage = leadKanbanStages.find((s) => s.id === card.stageId);

  const convertHref = `/crm/leads/${leadId}/convert${view ? `?view=${view}` : ""}`;

  const headerAccountId =
    lead?.converted_account_id ?? lead?.converted_account?.id ?? null;
  const headerSalesDeal = lead?.sales_deal ?? lead?.converted_deal ?? null;
  const headerDepositMet =
    headerSalesDeal?.payment_status === "deposit_met" ||
    (() => {
      const required =
        parseFloat(String(headerSalesDeal?.deposit_required_amount ?? 0)) || 0;
      const paid =
        parseFloat(
          String(
            headerSalesDeal?.deposit_paid_amount ??
              headerSalesDeal?.deposit_amount ??
              0,
          ),
        ) || 0;
      return required > 0 && paid >= required;
    })();
  const showCommercialConvert = canCommercialConvertLead({
    hasLinkedAccount: Boolean(headerAccountId),
    hasDeal: Boolean(headerSalesDeal?.id ?? lead?.converted_deal_id),
    depositMet: headerDepositMet,
    hasApprovedSiteVisit: hasApprovedSiteVisit(lead?.site_visits),
    hasSentQuotation: hasQuotationSentToClient(lead?.latest_quotation),
  });
  const showProvisionConvert = canProvisionAccountFromLead(
    status,
    Boolean(headerAccountId),
  );
  const convertLabel = showCommercialConvert
    ? "Record Deposit & Create Deal"
    : "Convert Lead";

  const editHref = `/crm/leads/${leadId}/edit${view ? `?view=${view}` : ""}`;



  return (

    <>

      <CrmRecordDetailShell

        backHref={backHref}

        recordTitle={card.title}

        headerBadges={

          <div className="flex flex-wrap items-center gap-2">

            {stage && (

              <Badge className={cn("border-0 font-medium", stage.tagClass)}>

                {stage.label}

              </Badge>

            )}

            <Badge variant="outline" className="font-normal text-[#1e3a5f]">

              {card.tag}

            </Badge>

          </div>

        }

        recordMeta={

          <p className="text-xs text-muted-foreground">

            Last updated · {formatDisplayDate(card.nextActionDate)} · Owner:{" "}

            <span className="font-medium text-foreground">{card.owner}</span>

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

            <PermissionGate permission="leads.convert">

              {showCommercialConvert || showProvisionConvert ? (

                <Button

                  variant="outline"

                  size="sm"

                  className="h-9 border-border text-[#1e3a5f] hover:bg-[#ebf2ff]/50"

                  asChild

                >

                  <Link href={convertHref}>

                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />

                    {convertLabel}

                  </Link>

                </Button>

              ) : null}

            </PermissionGate>

            <Button size="sm" className="h-9 gap-1.5" asChild>

              <Link href={editHref}>

                <Pencil className="h-3.5 w-3.5" />

                Edit Lead

              </Link>

            </Button>

          </>

        }

        sidebar={<LeadRelatedLists leadId={Number(leadId)} lead={lead} />}

      >

        {stageActions && (

          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">

            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">

              Stage actions

            </span>

            {stageActions}

          </div>

        )}



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

              <LeadDetailIntake
                lead={lead}
                productInterestLookups={lookups?.product_interests}
              />

              <PermissionGate permission="leads.update">

                <LeadNotesCanvas
                  lead={lead}
                  leadTitle={card.title}
                  saving={notesSaving}
                  onAddNote={handleAddNote}
                />

              </PermissionGate>

              <PermissionGate permission="leads.update">

                <div className="mt-8 border-t border-border/80 pt-6">

                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">

                    <h3 className="text-sm font-semibold text-[#1e3a5f]">

                      Attachments

                    </h3>

                    <div>

                      <input

                        ref={attachmentInputRef}

                        type="file"

                        className="hidden"

                        onChange={(e) => {

                          const file = e.target.files?.[0];

                          if (file) void handleAttachmentUpload(file);

                          e.target.value = "";

                        }}

                      />

                      <Button

                        type="button"

                        size="sm"

                        variant="outline"

                        disabled={uploadingAttachment}

                        onClick={() => attachmentInputRef.current?.click()}

                      >

                        <Upload className="mr-1.5 h-3.5 w-3.5" />

                        {uploadingAttachment ? "Uploading..." : "Upload file"}

                      </Button>

                    </div>

                  </div>

                  {(lead.attachments?.length ?? 0) === 0 ? (

                    <p className="text-sm text-muted-foreground">

                      No attachments uploaded yet.

                    </p>

                  ) : (

                    <ul className="space-y-2">

                      {lead.attachments?.map((attachment) => (

                        <li

                          key={attachment.id}

                          className="flex items-center gap-2 rounded-md border border-border/80 px-3 py-2 text-sm"

                        >

                          <FileText className="h-4 w-4 text-muted-foreground" />

                          <span>

                            {attachment.original_name ??

                              attachment.file_name ??

                              `Attachment #${attachment.id}`}

                          </span>

                        </li>

                      ))}

                    </ul>

                  )}

                </div>

              </PermissionGate>

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

        lead={card}

        leadId={leadId}

        returnView={view}

      />



      <Dialog open={visitDialogOpen} onOpenChange={setVisitDialogOpen}>

        <DialogContent className="max-w-lg">

          <DialogHeader>

            <DialogTitle>Schedule Site Visit</DialogTitle>

          </DialogHeader>

          <div className="space-y-4">

            <div className="space-y-2">

              <Label htmlFor="ld-visit-title">Title</Label>

              <Input

                id="ld-visit-title"

                value={visitForm.title}

                onChange={(e) =>

                  setVisitForm((f) => ({ ...f, title: e.target.value }))

                }

              />

            </div>

            <div className="grid gap-4 sm:grid-cols-2">

              <div className="space-y-2">

                <Label htmlFor="ld-visit-date">Visit date</Label>

                <Input

                  id="ld-visit-date"

                  type="date"

                  value={visitForm.visit_date}

                  onChange={(e) =>

                    setVisitForm((f) => ({ ...f, visit_date: e.target.value }))

                  }

                />

              </div>

              <div className="space-y-2">

                <Label htmlFor="ld-visit-time">Time</Label>

                <Input

                  id="ld-visit-time"

                  type="time"

                  value={visitForm.visit_time}

                  onChange={(e) =>

                    setVisitForm((f) => ({ ...f, visit_time: e.target.value }))

                  }

                />

              </div>

            </div>

            <div className="space-y-2">

              <Label>Assigned to</Label>

              <ScheduleSiteVisitFieldOfficerTag

                recordLabel="Lead"

                officerName={leadFieldOfficerName}

              />

              <SiteVisitAssigneeSelect

                value={visitForm.assigned_field_officer_id}

                onValueChange={(v) =>

                  setVisitForm((f) => ({

                    ...f,

                    assigned_field_officer_id: v,

                  }))

                }

                currentUserId={user?.id}

                currentUserName={user?.name}

                placeholder="Select assignee"

              />

            </div>

            <div className="space-y-2">

              <Label htmlFor="ld-visit-address">Site address</Label>

              <Input

                id="ld-visit-address"

                value={visitForm.site_address}

                onChange={(e) =>

                  setVisitForm((f) => ({ ...f, site_address: e.target.value }))

                }

              />

            </div>

            <div className="space-y-2">

              <Label htmlFor="ld-visit-notes">Notes for assignee</Label>

              <Textarea

                id="ld-visit-notes"

                value={visitForm.notes_for_field_officer}

                onChange={(e) =>

                  setVisitForm((f) => ({

                    ...f,

                    notes_for_field_officer: e.target.value,

                  }))

                }

              />

            </div>

          </div>

          <DialogFooter>

            <Button

              onClick={() => void handleScheduleVisit()}

              disabled={

                actionLoading ||

                !visitForm.visit_date ||

                !visitForm.assigned_field_officer_id

              }

            >

              {actionLoading ? "Scheduling..." : "Schedule visit"}

            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>



      <LeadsActivityModal

        open={activityModalOpen}

        onOpenChange={setActivityModalOpen}

        activityType={activityType}

        leadTitle={card?.title ?? "Lead"}

        onSave={handleActivitySave}

      />



      <LeadStageNotesDialog

        open={stageNotesOpen}

        onOpenChange={(open) => {

          setStageNotesOpen(open);

          if (!open) setPendingStageAction(null);

        }}

        actionLabel={pendingStageAction?.label ?? "continue"}

        hasExistingNotes={lead ? hasLeadNotes(lead) : false}

        saving={notesSaving || actionLoading}

        onConfirm={handleStageNotesConfirm}

      />

    </>

  );

}


