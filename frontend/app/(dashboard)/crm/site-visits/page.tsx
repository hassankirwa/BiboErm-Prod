"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { Plus, MapPin, Calendar, Clock, Eye, CheckCircle2, Loader2 } from "lucide-react";
import { PermissionGate } from "@/components/auth/permission-gate";
import { DealPicker } from "@/components/crm/deal-picker";
import { LeadPicker } from "@/components/crm/lead-picker";
import { ScheduleSiteVisitFieldOfficerTag } from "@/components/crm/schedule-site-visit-field-officer-tag";
import {
  approveSiteVisit,
  fetchSiteVisits,
  scheduleSiteVisit,
  type ApiSiteVisit,
} from "@/lib/api/crm/site-visits";
import { dealDisplayName } from "@/lib/api/crm/deals";
import { leadDisplayName, type ApiLead } from "@/lib/api/crm/leads";
import type { ApiDeal } from "@/lib/api/crm/types";
import { fetchCrmAssignableUsers } from "@/lib/api/crm/lookups";
import {
  defaultSiteVisitAssigneeId,
  SiteVisitAssigneeSelect,
} from "@/components/crm/site-visit-assignee-select";
import { useAuth } from "@/contexts/auth-context";
import { ensureCsrfCookie } from "@/lib/api/client";
import { resolveFieldOfficerName, canApproveSiteVisit } from "@/lib/crm/site-visit-utils";
import { ApiError } from "@/lib/api/errors";
import { toast } from "sonner";

function formatStatus(status: string | null): string {
  if (!status) return "-";
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  approved: "default",
  submitted_for_review: "secondary",
  measurements_captured: "secondary",
  in_progress: "secondary",
  scheduled: "outline",
  assigned: "outline",
};

export default function SiteVisitsPage() {
  const { user, roles } = useAuth();
  const [visits, setVisits] = useState<ApiSiteVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fieldOfficers, setFieldOfficers] = useState<
    { id: number; name: string }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
  const [selectedDealLabel, setSelectedDealLabel] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<ApiDeal | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [selectedLeadLabel, setSelectedLeadLabel] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<ApiLead | null>(null);
  const [form, setForm] = useState({
    title: "",
    visit_date: "",
    visit_time: "",
    assigned_field_officer_id: "",
    site_address: "",
    notes_for_field_officer: "",
  });

  const loadVisits = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchSiteVisits({ per_page: 100 });
      setVisits(res.data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load site visits.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  useEffect(() => {
    fetchCrmAssignableUsers({ context: "site_visits" })
      .then((res) =>
        setFieldOfficers(res.data.map((u) => ({ id: u.id, name: u.name }))),
      )
      .catch(() => {});
  }, []);

  const leadFieldOfficerName = useMemo(
    () =>
      resolveFieldOfficerName(
        selectedLead?.assigned_field_officer,
        selectedLead?.assigned_field_officer_id,
        fieldOfficers,
      ),
    [selectedLead, fieldOfficers],
  );

  const dealFieldOfficerName = useMemo(
    () =>
      resolveFieldOfficerName(
        selectedDeal?.assigned_field_officer,
        selectedDeal?.assigned_field_officer_id,
        fieldOfficers,
      ),
    [selectedDeal, fieldOfficers],
  );

  function prefillFieldOfficerId(officerId: number | null | undefined) {
    if (officerId == null) return;
    setForm((f) => ({
      ...f,
      assigned_field_officer_id: String(officerId),
    }));
  }

  async function handleApproveVisit(visitId: number) {
    setApprovingId(visitId);
    try {
      await ensureCsrfCookie();
      await approveSiteVisit(visitId);
      toast.success("Site visit approved.");
      loadVisits();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to approve visit.",
      );
    } finally {
      setApprovingId(null);
    }
  }

  async function handleSchedule() {
    setSaving(true);
    try {
      await ensureCsrfCookie();
      await scheduleSiteVisit({
        title: form.title,
        visit_date: form.visit_date,
        visit_time: form.visit_time || undefined,
        assigned_field_officer_id: Number(form.assigned_field_officer_id),
        site_address: form.site_address || undefined,
        deal_id: selectedDealId ?? undefined,
        lead_id: selectedLeadId ?? undefined,
        measurement_context: "quotation",
        notes_for_field_officer: form.notes_for_field_officer || undefined,
      });
      setDialogOpen(false);
      setForm({
        title: "",
        visit_date: "",
        visit_time: "",
        assigned_field_officer_id: "",
        site_address: "",
        notes_for_field_officer: "",
      });
      setSelectedDealId(null);
      setSelectedDealLabel(null);
      setSelectedDeal(null);
      setSelectedLeadId(null);
      setSelectedLeadLabel(null);
      setSelectedLead(null);
      toast.success("Site visit scheduled.");
      loadVisits();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to schedule visit.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title="Site Visits"
        subtitle="Schedule and track field measurement visits"
        actions={
          <div className="flex gap-2">
            <PermissionGate anyOf={["site_visits.execute", "field_installation.log"]}>
              <Button size="sm" variant="outline" asChild>
                <Link href="/crm/site-visits/my-visits">My Visits</Link>
              </Button>
            </PermissionGate>
            <Button size="sm" variant="outline" asChild>
              <Link href="/crm/site-visits/today">Today</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/crm/field-day">Field Day</Link>
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => {
                setForm((f) => ({
                  ...f,
                  visit_date: f.visit_date || new Date().toISOString().slice(0, 10),
                  assigned_field_officer_id:
                    f.assigned_field_officer_id ||
                    defaultSiteVisitAssigneeId(user?.id, null),
                }));
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Schedule Visit
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8 text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-8 text-center text-sm text-destructive">
            {error}
          </div>
        ) : visits.length === 0 ? (
          <div className="rounded-md border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
            No site visits scheduled.
          </div>
        ) : (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">All Visits</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Visit</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Officer</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visits.map((visit) => (
                    <TableRow key={visit.id}>
                      <TableCell>
                        <Link
                          href={`/crm/site-visits/${visit.id}`}
                          className="hover:underline"
                        >
                          <p className="font-medium">{visit.title}</p>
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {visit.visit_number ?? `#${visit.id}`}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 text-sm">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {visit.visit_date
                              ? new Date(visit.visit_date).toLocaleDateString()
                              : "-"}
                          </span>
                          {visit.visit_time && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {visit.visit_time}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {visit.assigned_field_officer?.name ?? "-"}
                      </TableCell>
                      <TableCell>
                        {visit.site_address ? (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="line-clamp-1">{visit.site_address}</span>
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            STATUS_VARIANT[visit.status ?? ""] ?? "outline"
                          }
                        >
                          {formatStatus(visit.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/crm/site-visits/${visit.id}`}>
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              View
                            </Link>
                          </Button>
                          {visit.status === "submitted_for_review" &&
                            canApproveSiteVisit(visit, user?.id, roles) && (
                              <Button
                                size="sm"
                                disabled={approvingId === visit.id}
                                onClick={() => void handleApproveVisit(visit.id)}
                              >
                                {approvingId === visit.id ? (
                                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                )}
                                Approve
                              </Button>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Site Visit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sv-title">Title</Label>
              <Input
                id="sv-title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sv-date">Visit date</Label>
                <Input
                  id="sv-date"
                  type="date"
                  value={form.visit_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, visit_date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sv-time">Time</Label>
                <Input
                  id="sv-time"
                  type="time"
                  value={form.visit_time}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, visit_time: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Deal (optional)</Label>
                <DealPicker
                  value={selectedDealId}
                  displayLabel={selectedDealLabel}
                  disabled={saving}
                  onSelect={(deal: ApiDeal) => {
                    setSelectedDealId(deal.id);
                    setSelectedDealLabel(dealDisplayName(deal));
                    setSelectedDeal(deal);
                    setSelectedLeadId(null);
                    setSelectedLeadLabel(null);
                    setSelectedLead(null);
                    prefillFieldOfficerId(deal.assigned_field_officer_id);
                  }}
                  onClear={() => {
                    setSelectedDealId(null);
                    setSelectedDealLabel(null);
                    setSelectedDeal(null);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Lead (optional)</Label>
                <LeadPicker
                  value={selectedLeadId}
                  displayLabel={selectedLeadLabel}
                  disabled={saving}
                  onSelect={(lead: ApiLead) => {
                    setSelectedLeadId(lead.id);
                    setSelectedLeadLabel(leadDisplayName(lead));
                    setSelectedLead(lead);
                    setSelectedDealId(null);
                    setSelectedDealLabel(null);
                    setSelectedDeal(null);
                    prefillFieldOfficerId(lead.assigned_field_officer_id);
                  }}
                  onClear={() => {
                    setSelectedLeadId(null);
                    setSelectedLeadLabel(null);
                    setSelectedLead(null);
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <div className="flex flex-wrap gap-2">
                <ScheduleSiteVisitFieldOfficerTag
                  recordLabel="Lead"
                  officerName={leadFieldOfficerName}
                />
                <ScheduleSiteVisitFieldOfficerTag
                  recordLabel="Deal"
                  officerName={dealFieldOfficerName}
                />
              </div>
              <SiteVisitAssigneeSelect
                value={form.assigned_field_officer_id}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, assigned_field_officer_id: v }))
                }
                currentUserId={user?.id}
                currentUserName={user?.name}
                placeholder="Assigned To"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sv-address">Site address</Label>
              <Input
                id="sv-address"
                value={form.site_address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, site_address: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sv-notes">Notes</Label>
              <Textarea
                id="sv-notes"
                value={form.notes_for_field_officer}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    notes_for_field_officer: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSchedule}
              disabled={
                saving ||
                !form.title ||
                !form.visit_date ||
                !form.assigned_field_officer_id
              }
            >
              {saving ? "Scheduling..." : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

