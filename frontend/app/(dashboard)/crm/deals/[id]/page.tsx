"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  Calendar,
  FileText,
  Banknote,
  Trophy,
  FolderKanban,
  XCircle,
  Loader2,
  Send,
  ExternalLink,
  MapPin,
  Pencil,
} from "lucide-react";
import {
  BIBO_DEAL_STAGES,
  dealDisplayName,
  dealValue,
  fetchDeal,
  fetchDealPayments,
  markDealLost,
  markDealWon,
  recordPayment,
  updateDeal,
  updateDealStage,
  type ApiDeal,
} from "@/lib/api/crm/deals";
import {
  acceptQuotation,
  createQuotation,
  quotationAmount,
  reviseQuotation,
  sendQuotation,
  submitQuotationForReview,
  type ApiQuotation,
} from "@/lib/api/crm/quotations";
import { QUOTATION_RELEASE_PERMISSIONS, SENDABLE_QUOTATION_STATUSES, SUBMITTABLE_QUOTATION_STATUSES } from "@/lib/quotations/status";
import { scheduleSiteVisit } from "@/lib/api/crm/site-visits";
import type { ApiDealPayment } from "@/lib/api/crm/types";
import { fetchCrmAssignableUsers } from "@/lib/api/crm/lookups";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { projectDetailPath } from "@/lib/projects/paths";
import { hasRecordedDeposit } from "@/lib/crm-lead-status";
import { PermissionGate } from "@/components/auth/permission-gate";
import { AccountPicker } from "@/components/crm/account-picker";
import { ScheduleSiteVisitFieldOfficerTag } from "@/components/crm/schedule-site-visit-field-officer-tag";
import {
  defaultSiteVisitAssigneeId,
  SiteVisitAssigneeSelect,
} from "@/components/crm/site-visit-assignee-select";
import { Checkbox } from "@/components/ui/checkbox";
import { resolveFieldOfficerName } from "@/lib/crm/site-visit-utils";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

const STAGE_COLORS: Record<string, string> = {
  new_deal: "bg-info/10 text-info border-info/20",
  site_visit_pending: "bg-warning/10 text-warning border-warning/20",
  measurements_completed: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  quotation_preparation: "bg-warning/10 text-warning border-warning/20",
  quotation_sent: "bg-primary/10 text-primary border-primary/20",
  negotiation_revision: "bg-chart-5/10 text-chart-5 border-chart-5/20",
  accepted: "bg-success/10 text-success border-success/20",
  deposit_pending: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  deposit_recorded: "bg-success/10 text-success border-success/20",
  won: "bg-success/10 text-success border-success/20",
  project_created: "bg-success/10 text-success border-success/20",
  lost: "bg-destructive/10 text-destructive border-destructive/20",
};

function formatStage(stage: string): string {
  return (
    BIBO_DEAL_STAGES.find((s) => s.id === stage)?.label ??
    stage
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

function formatCurrency(value: string | number | null | undefined): string {
  if (value == null) return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(num)) return "-";
  return `KES ${num.toLocaleString()}`;
}

function dealTitle(deal: ApiDeal): string {
  return deal.name ?? deal.title ?? deal.reference;
}

export default function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const dealId = Number(id);
  const router = useRouter();
  const { user, roles } = useAuth();
  const canOverrideDeposit = roles.includes("super_admin");

  const [deal, setDeal] = useState<ApiDeal | null>(null);
  const [quotations, setQuotations] = useState<ApiQuotation[]>([]);
  const [payments, setPayments] = useState<ApiDealPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [quotationDialogOpen, setQuotationDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [wonDialogOpen, setWonDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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

  const [quotationForm, setQuotationForm] = useState({
    description: "",
    quantity: "1",
    unit_price: "",
    valid_until: "",
    terms_conditions: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    payment_reference: "",
    payment_date: new Date().toISOString().slice(0, 10),
    amount_paid: "",
    payment_method: "bank_transfer",
    notes: "",
  });
  const [proofFile, setProofFile] = useState<File | null>(null);

  const [lossNotes, setLossNotes] = useState("");
  const [overrideDeposit, setOverrideDeposit] = useState(false);

  const [editForm, setEditForm] = useState({
    name: "",
    estimated_value: "",
    expected_close_date: "",
    site_address: "",
    requirement_summary: "",
    account_id: "",
    assigned_field_officer_id: "",
  });
  const [editAccountLabel, setEditAccountLabel] = useState<string | null>(null);

  const latestQuotation = useMemo(
    () => (quotations.length > 0 ? quotations[quotations.length - 1] : null),
    [quotations],
  );

  const dealFieldOfficerName = useMemo(
    () =>
      resolveFieldOfficerName(
        deal?.assigned_field_officer,
        deal?.assigned_field_officer_id,
        fieldOfficers,
      ),
    [deal, fieldOfficers],
  );

  const loadDeal = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchDeal(dealId);
      setDeal(data);
      setQuotations(data.quotations ?? []);
      setPayments(data.payments ?? []);
      setEditForm({
        name: data.name ?? data.title ?? "",
        estimated_value: String(dealValue(data) || ""),
        expected_close_date: data.expected_close_date?.slice(0, 10) ?? "",
        site_address: data.site_address ?? "",
        requirement_summary: data.requirement_summary ?? "",
        account_id: data.account_id ? String(data.account_id) : "",
        assigned_field_officer_id: data.assigned_field_officer_id
          ? String(data.assigned_field_officer_id)
          : "",
      });
      setEditAccountLabel(data.account?.name ?? null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load deal.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [dealId]);

  const refreshPayments = useCallback(async () => {
    try {
      const list = await fetchDealPayments(dealId);
      setPayments(list);
    } catch {
      /* keep embedded payments from fetchDeal */
    }
  }, [dealId]);

  useEffect(() => {
    loadDeal();
  }, [loadDeal]);

  useEffect(() => {
    fetchCrmAssignableUsers({ context: "site_visits" })
      .then((res) =>
        setFieldOfficers(res.data.map((u) => ({ id: u.id, name: u.name }))),
      )
      .catch(() => {});
  }, []);

  async function runAction(key: string, fn: () => Promise<void>) {
    setActionLoading(key);
    try {
      await ensureCsrfCookie();
      await fn();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Action failed.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleScheduleVisit() {
    await runAction("schedule-visit", async () => {
      const visit = await scheduleSiteVisit({
        title: visitForm.title || dealTitle(deal!),
        deal_id: dealId,
        account_id: deal?.account_id ?? undefined,
        contact_id: deal?.primary_contact_id ?? deal?.contact_id ?? undefined,
        site_address: visitForm.site_address || deal?.site_address || undefined,
        assigned_field_officer_id: Number(visitForm.assigned_field_officer_id),
        visit_date: visitForm.visit_date,
        visit_time: visitForm.visit_time || undefined,
        measurement_context: "quotation",
        notes_for_field_officer: visitForm.notes_for_field_officer || undefined,
      });
      const updated = await updateDealStage(dealId, "site_visit_pending");
      setDeal(updated);
      setVisitDialogOpen(false);
      toast.success(`Site visit ${visit.visit_number ?? visit.id} scheduled.`);
    });
  }

  async function handleCreateQuotation(revisionOfId?: number) {
    await runAction("create-quotation", async () => {
      const payload = {
        valid_until: quotationForm.valid_until || undefined,
        terms_conditions: quotationForm.terms_conditions || undefined,
        lines: [
          {
            description:
              quotationForm.description ||
              deal?.requirement_summary ||
              "Quotation line item",
            quantity: parseFloat(quotationForm.quantity) || 1,
            unit_price: parseFloat(quotationForm.unit_price) || dealValue(deal!),
          },
        ],
      };

      const quotation = revisionOfId
        ? await reviseQuotation(dealId, revisionOfId, payload)
        : await createQuotation(dealId, payload);

      setQuotations((prev) => [...prev, quotation]);
      if (quotation.deal) setDeal(quotation.deal);
      else await loadDeal();
      setQuotationDialogOpen(false);
      toast.success("Quotation created.");
      router.push(`/crm/quotations/${quotation.id}`);
    });
  }

  async function handleSubmitQuotationForReview() {
    if (!latestQuotation) return;
    await runAction("submit-quotation", async () => {
      const updated = await submitQuotationForReview(latestQuotation.id);
      setQuotations((prev) =>
        prev.map((q) => (q.id === updated.id ? updated : q)),
      );
      toast.success("Quotation submitted for approval.");
    });
  }

  async function handleSendQuotation() {
    if (!latestQuotation) return;
    await runAction("send-quotation", async () => {
      const updated = await sendQuotation(latestQuotation.id);
      setQuotations((prev) =>
        prev.map((q) => (q.id === updated.id ? updated : q)),
      );
      if (updated.deal) setDeal(updated.deal);
      toast.success("Quotation sent to client.");
    });
  }

  async function handleAcceptQuotation() {
    if (!latestQuotation) return;
    await runAction("accept-quotation", async () => {
      const updated = await acceptQuotation(latestQuotation.id);
      setQuotations((prev) =>
        prev.map((q) => (q.id === updated.id ? updated : q)),
      );
      if (updated.deal) setDeal(updated.deal);
      toast.success("Quotation accepted.");
    });
  }

  async function handleRecordPayment() {
    await runAction("record-payment", async () => {
      const result = await recordPayment(dealId, {
        payment_reference: paymentForm.payment_reference,
        payment_date: paymentForm.payment_date,
        amount_paid: parseFloat(paymentForm.amount_paid),
        payment_method: paymentForm.payment_method,
        payment_status: "confirmed",
        quotation_id: latestQuotation?.id,
        notes: paymentForm.notes || undefined,
        proof_file: proofFile ?? undefined,
      });
      setDeal(result.data.deal);
      await refreshPayments();
      setPaymentDialogOpen(false);
      setProofFile(null);
      toast.success("Payment recorded.");
    });
  }

  async function handleMarkWon() {
    await runAction("mark-won", async () => {
      const updated = await markDealWon(dealId, {
        override_deposit: overrideDeposit || undefined,
      });
      setDeal(updated);
      setWonDialogOpen(false);
      setOverrideDeposit(false);
      toast.success("Deal marked as won.");
    });
  }

  async function handleUpdateDeal() {
    if (!editForm.account_id) {
      toast.error("Please select an account for this deal.");
      return;
    }
    await runAction("update-deal", async () => {
      const updated = await updateDeal(dealId, {
        name: editForm.name.trim() || undefined,
        account_id: Number(editForm.account_id),
        estimated_value: editForm.estimated_value
          ? Number(editForm.estimated_value)
          : undefined,
        expected_close_date: editForm.expected_close_date || undefined,
        site_address: editForm.site_address.trim() || undefined,
        requirement_summary: editForm.requirement_summary.trim() || undefined,
        assigned_field_officer_id: editForm.assigned_field_officer_id
          ? Number(editForm.assigned_field_officer_id)
          : undefined,
      });
      setDeal(updated);
      setEditDialogOpen(false);
      toast.success("Deal updated.");
    });
  }

  async function handleMarkLost() {
    await runAction("mark-lost", async () => {
      const updated = await markDealLost(dealId, { loss_notes: lossNotes });
      setDeal(updated);
      setLostDialogOpen(false);
      toast.success("Deal marked as lost.");
    });
  }

  function handleCreateProject() {
    if (!deal) return;

    const params = new URLSearchParams();
    params.set("deal_id", String(dealId));
    if (deal.account_id) {
      params.set("account_id", String(deal.account_id));
    }
    params.set("deal_label", dealDisplayName(deal));
    if (deal.account?.name) {
      params.set("account_name", deal.account.name);
    }

    router.push(`/crm/projects/new?${params.toString()}`);
  }

  function renderActions() {
    if (!deal) return null;
    const stage = String(deal.stage);

    const btn = (
      key: string,
      label: string,
      onClick: () => void,
      variant: "default" | "outline" | "secondary" | "destructive" = "default",
      icon?: React.ReactNode,
      permission?: string,
      anyOf?: string[],
    ) => {
      const button = (
        <Button
          key={key}
          size="sm"
          variant={variant}
          disabled={!!actionLoading}
          onClick={onClick}
        >
          {actionLoading === key ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            icon
          )}
          {label}
        </Button>
      );
      if (anyOf?.length) {
        return (
          <PermissionGate key={key} anyOf={anyOf}>
            {button}
          </PermissionGate>
        );
      }
      if (!permission) return button;
      return (
        <PermissionGate key={key} permission={permission}>
          {button}
        </PermissionGate>
      );
    };

    switch (stage) {
      case "new_deal":
      case "site_visit_pending":
        return btn(
          "schedule",
          "Schedule Site Visit",
          () => {
            setVisitForm((f) => ({
              ...f,
              title: dealTitle(deal),
              site_address: deal.site_address ?? f.site_address,
              assigned_field_officer_id: defaultSiteVisitAssigneeId(
                user?.id,
                deal.assigned_field_officer_id ??
                  (f.assigned_field_officer_id
                    ? Number(f.assigned_field_officer_id)
                    : null),
              ),
            }));
            setVisitDialogOpen(true);
          },
          "secondary",
          <Calendar className="mr-2 h-4 w-4" />,
        );
      case "measurements_completed":
        return btn(
          "prepare",
          "Prepare Quotation",
          () => setQuotationDialogOpen(true),
          "default",
          <FileText className="mr-2 h-4 w-4" />,
        );
      case "quotation_preparation":
        return (
          <>
            {latestQuotation &&
            SUBMITTABLE_QUOTATION_STATUSES.has(latestQuotation.status ?? "") ?
              btn(
                "submit-quotation",
                "Submit for approval",
                handleSubmitQuotationForReview,
                "default",
                <FileText className="mr-2 h-4 w-4" />,
                "quotations.create",
              ) : null}
            {latestQuotation &&
            SENDABLE_QUOTATION_STATUSES.has(latestQuotation.status ?? "") ?
              btn(
                "send",
                "Send to client",
                handleSendQuotation,
                "default",
                <Send className="mr-2 h-4 w-4" />,
                undefined,
                [...QUOTATION_RELEASE_PERMISSIONS],
              ) : null}
            {btn(
              "prepare",
              "Prepare Quotation",
              () => setQuotationDialogOpen(true),
              "outline",
              <FileText className="mr-2 h-4 w-4" />,
            )}
          </>
        );
      case "quotation_sent":
        return (
          <>
            {!hasRecordedDeposit(deal)
              ? btn(
                  "deposit",
                  "Record Deposit",
                  () => setPaymentDialogOpen(true),
                  "default",
                  <Banknote className="mr-2 h-4 w-4" />,
                  "deal_payments.record",
                )
              : null}
            {btn("accept", "Mark Accepted", handleAcceptQuotation, "default")}
            {latestQuotation &&
              btn(
                "revise",
                "Request Revision",
                () => {
                  updateDealStage(dealId, "negotiation_revision").then(setDeal);
                },
                "outline",
              )}
            {btn(
              "lost",
              "Mark Lost",
              () => setLostDialogOpen(true),
              "destructive",
              <XCircle className="mr-2 h-4 w-4" />,
              "deals.mark_lost",
            )}
          </>
        );
      case "negotiation_revision":
        return (
          <>
            {!hasRecordedDeposit(deal)
              ? btn(
                  "deposit",
                  "Record Deposit",
                  () => setPaymentDialogOpen(true),
                  "default",
                  <Banknote className="mr-2 h-4 w-4" />,
                  "deal_payments.record",
                )
              : null}
            {btn(
              "revise-quote",
              "Create Revised Quotation",
              () => {
                if (latestQuotation) {
                  setQuotationDialogOpen(true);
                } else {
                  toast.error("No quotation to revise.");
                }
              },
              "default",
              <FileText className="mr-2 h-4 w-4" />,
            )}
          </>
        );
      case "accepted":
      case "deposit_pending":
        return btn(
          "deposit",
          "Record Deposit",
          () => setPaymentDialogOpen(true),
          "default",
          <Banknote className="mr-2 h-4 w-4" />,
          "deal_payments.record",
        );
      case "deposit_recorded":
        return btn(
          "won",
          "Mark Won",
          () => setWonDialogOpen(true),
          "default",
          <Trophy className="mr-2 h-4 w-4" />,
          "deals.mark_won",
        );
      case "won":
        return deal.project_id ? (
          <Button size="sm" asChild>
            <Link href={projectDetailPath(deal.project_id, "crm")}>
              <ExternalLink className="mr-2 h-4 w-4" />
              View Project
            </Link>
          </Button>
        ) : (
          btn(
            "project",
            "Create Project",
            handleCreateProject,
            "default",
            <FolderKanban className="mr-2 h-4 w-4" />,
            "deals.create_project",
          )
        );
      case "project_created":
        return deal.project_id ? (
          <Button size="sm" asChild>
            <Link href={projectDetailPath(deal.project_id, "crm")}>
              <ExternalLink className="mr-2 h-4 w-4" />
              View Project
            </Link>
          </Button>
        ) : null;
      default:
        return btn(
          "lost",
          "Mark Lost",
          () => setLostDialogOpen(true),
          "outline",
          <XCircle className="mr-2 h-4 w-4" />,
          "deals.mark_lost",
        );
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="flex h-full flex-col">
        <AppHeader
          title="Deal"
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href="/crm/deals">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Link>
            </Button>
          }
        />
        <div className="p-6 text-sm text-destructive">
          {error ?? "Deal not found."}
        </div>
      </div>
    );
  }

  const title = dealTitle(deal);

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title={title}
        subtitle={deal.deal_number ?? deal.reference}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={STAGE_COLORS[String(deal.stage)] ?? ""}
            >
              {formatStage(String(deal.stage))}
            </Badge>
            <Button variant="outline" size="sm" asChild>
              <Link href="/crm/deals">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Link>
            </Button>
            <PermissionGate permission="deals.update">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditDialogOpen(true)}
              >
                <Pencil className="mr-1 h-4 w-4" />
                Edit
              </Button>
            </PermissionGate>
          </div>
        }
      />

      <div className="flex-1 space-y-6 overflow-auto p-6">
        <div className="flex flex-wrap gap-2">{renderActions()}</div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Deal Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Value</p>
                  <p className="font-medium">{formatCurrency(dealValue(deal))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Deposit paid</p>
                  <p className="font-medium">
                    {formatCurrency(deal.deposit_paid_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expected close</p>
                  <p className="font-medium">
                    {deal.expected_close_date
                      ? new Date(deal.expected_close_date).toLocaleDateString()
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment status</p>
                  <p className="font-medium capitalize">
                    {deal.payment_status ?? "-"}
                  </p>
                </div>
              </div>
              {deal.account && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground">Account</p>
                    <Link
                      href={`/crm/accounts?search=${encodeURIComponent(deal.account.name)}`}
                      className="font-medium hover:underline"
                    >
                      {deal.account.name}
                    </Link>
                  </div>
                </>
              )}
              {deal.site_address && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  {deal.site_address}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Requirement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {deal.product_interests && deal.product_interests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {deal.product_interests.map((pi) => (
                    <Badge key={pi} variant="secondary">
                      {pi}
                    </Badge>
                  ))}
                </div>
              )}
              <p>{deal.requirement_summary ?? "-"}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Quotations</CardTitle>
          </CardHeader>
          <CardContent>
            {quotations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No quotations yet. Create one using the action buttons above.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotations.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-medium">
                        {q.quotation_number ?? `#${q.id}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{q.status ?? "draft"}</Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(quotationAmount(q))}</TableCell>
                      <TableCell>
                        {q.sent_at
                          ? new Date(q.sent_at).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/crm/quotations/${q.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No payments recorded yet.
                {deal.deposit_paid_amount
                  ? ` Deposit on deal: ${formatCurrency(deal.deposit_paid_amount)}`
                  : ""}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.payment_reference}</TableCell>
                      <TableCell>
                        {new Date(p.payment_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{formatCurrency(p.amount_paid)}</TableCell>
                      <TableCell className="capitalize">
                        {p.payment_method.replace(/_/g, " ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={visitDialogOpen} onOpenChange={setVisitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Site Visit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="visit-title">Title</Label>
              <Input
                id="visit-title"
                value={visitForm.title}
                onChange={(e) =>
                  setVisitForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder={title}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="visit-date">Visit date</Label>
                <Input
                  id="visit-date"
                  type="date"
                  value={visitForm.visit_date}
                  onChange={(e) =>
                    setVisitForm((f) => ({ ...f, visit_date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="visit-time">Time</Label>
                <Input
                  id="visit-time"
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
                recordLabel="Deal"
                officerName={dealFieldOfficerName}
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
              <Label htmlFor="visit-address">Site address</Label>
              <Input
                id="visit-address"
                value={visitForm.site_address}
                onChange={(e) =>
                  setVisitForm((f) => ({ ...f, site_address: e.target.value }))
                }
                placeholder={deal.site_address ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visit-notes">Notes for assignee</Label>
              <Textarea
                id="visit-notes"
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
              onClick={handleScheduleVisit}
              disabled={
                !visitForm.visit_date || !visitForm.assigned_field_officer_id
              }
            >
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quotationDialogOpen} onOpenChange={setQuotationDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {deal.stage === "negotiation_revision"
                ? "Create Revised Quotation"
                : "Prepare Quotation"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="line-desc">Line description</Label>
              <Input
                id="line-desc"
                value={quotationForm.description}
                onChange={(e) =>
                  setQuotationForm((f) => ({
                    ...f,
                    description: e.target.value,
                  }))
                }
                placeholder={deal.requirement_summary ?? "Product / service"}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="line-qty">Quantity</Label>
                <Input
                  id="line-qty"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={quotationForm.quantity}
                  onChange={(e) =>
                    setQuotationForm((f) => ({ ...f, quantity: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="line-price">Unit price (KES)</Label>
                <Input
                  id="line-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={quotationForm.unit_price}
                  onChange={(e) =>
                    setQuotationForm((f) => ({
                      ...f,
                      unit_price: e.target.value,
                    }))
                  }
                  placeholder={String(dealValue(deal))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="valid-until">Valid until</Label>
              <Input
                id="valid-until"
                type="date"
                value={quotationForm.valid_until}
                onChange={(e) =>
                  setQuotationForm((f) => ({
                    ...f,
                    valid_until: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() =>
                handleCreateQuotation(
                  deal.stage === "negotiation_revision"
                    ? latestQuotation?.id
                    : undefined,
                )
              }
            >
              Create Quotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Deposit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pay-ref">Payment reference</Label>
              <Input
                id="pay-ref"
                value={paymentForm.payment_reference}
                onChange={(e) =>
                  setPaymentForm((f) => ({
                    ...f,
                    payment_reference: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pay-date">Payment date</Label>
                <Input
                  id="pay-date"
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) =>
                    setPaymentForm((f) => ({
                      ...f,
                      payment_date: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-amount">Amount (KES)</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  min="0.01"
                  value={paymentForm.amount_paid}
                  onChange={(e) =>
                    setPaymentForm((f) => ({
                      ...f,
                      amount_paid: e.target.value,
                    }))
                  }
                  placeholder={
                    deal.deposit_required_amount
                      ? String(deal.deposit_required_amount)
                      : undefined
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select
                value={paymentForm.payment_method}
                onValueChange={(v) =>
                  setPaymentForm((f) => ({ ...f, payment_method: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-proof">Payment proof (optional)</Label>
              <Input
                id="pay-proof"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) =>
                  setProofFile(e.target.files?.[0] ?? null)
                }
              />
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WebP, or PDF up to 10 MB
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-notes">Notes</Label>
              <Textarea
                id="pay-notes"
                value={paymentForm.notes}
                onChange={(e) =>
                  setPaymentForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleRecordPayment}
              disabled={
                !paymentForm.payment_reference || !paymentForm.amount_paid
              }
            >
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={lostDialogOpen} onOpenChange={setLostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Deal Lost</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="loss-notes">Loss notes</Label>
            <Textarea
              id="loss-notes"
              value={lossNotes}
              onChange={(e) => setLossNotes(e.target.value)}
              placeholder="Reason for losing this deal..."
            />
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={handleMarkLost}>
              Mark Lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={wonDialogOpen} onOpenChange={setWonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Deal Won</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Confirm this deal is won. Deposit recorded:{" "}
            {formatCurrency(deal.deposit_paid_amount)}
            {deal.deposit_required_amount
              ? ` of ${formatCurrency(deal.deposit_required_amount)} required`
              : ""}
            .
          </p>
          {canOverrideDeposit && (
            <div className="flex items-start gap-2 rounded-md border border-border p-3">
              <Checkbox
                id="override-deposit"
                checked={overrideDeposit}
                onCheckedChange={(c) => setOverrideDeposit(!!c)}
              />
              <div className="space-y-1">
                <Label htmlFor="override-deposit" className="font-medium">
                  Override deposit requirement
                </Label>
                <p className="text-xs text-muted-foreground">
                  Super admin only — mark won even if deposit threshold is not met.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setWonDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkWon} disabled={!!actionLoading}>
              Mark Won
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Deal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Account *</Label>
              <AccountPicker
                required
                value={editForm.account_id ? Number(editForm.account_id) : null}
                displayLabel={editAccountLabel}
                onSelect={(account) => {
                  setEditForm((f) => ({ ...f, account_id: String(account.id) }));
                  setEditAccountLabel(account.name);
                }}
                onClear={() => {
                  setEditForm((f) => ({ ...f, account_id: "" }));
                  setEditAccountLabel(null);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Deal name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-value">Estimated value (KES)</Label>
                <Input
                  id="edit-value"
                  type="number"
                  min={0}
                  value={editForm.estimated_value}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      estimated_value: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-close">Expected close</Label>
                <Input
                  id="edit-close"
                  type="date"
                  value={editForm.expected_close_date}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      expected_close_date: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-site">Site address</Label>
              <Input
                id="edit-site"
                value={editForm.site_address}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, site_address: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-req">Requirement summary</Label>
              <Textarea
                id="edit-req"
                value={editForm.requirement_summary}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    requirement_summary: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Field installation officer</Label>
              <Select
                value={editForm.assigned_field_officer_id || undefined}
                onValueChange={(v) =>
                  setEditForm((f) => ({ ...f, assigned_field_officer_id: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assign field officer (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {fieldOfficers.map((officer) => (
                    <SelectItem key={officer.id} value={String(officer.id)}>
                      {officer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateDeal}
              disabled={!!actionLoading || !editForm.account_id}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

