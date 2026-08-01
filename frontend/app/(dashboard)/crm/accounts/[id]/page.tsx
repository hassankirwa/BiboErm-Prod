"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { PermissionGate } from "@/components/auth/permission-gate";
import { usePermissions } from "@/hooks/use-permissions";
import {
  ChevronLeft,
  Mail,
  Phone,
  MapPin,
  Globe,
  Pencil,
  FolderKanban,
  Upload,
  FileText,
} from "lucide-react";
import {
  fetchAccount,
  fetchAccountDeals,
  fetchAccountDocuments,
  updateAccount,
  uploadAccountDocument,
  type ApiAccount,
  type ApiAccountDocument,
} from "@/lib/api/crm/accounts";
import { contactDisplayName } from "@/lib/api/crm/contacts";
import type { ApiDeal } from "@/lib/api/crm/types";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { hasRecordedDeposit } from "@/lib/crm-lead-status";
import { toast } from "sonner";

function accountToForm(account: ApiAccount) {
  return {
    name: account.name,
    account_type: account.account_type ?? "",
    industry: account.industry ?? "",
    phone: account.phone ?? "",
    email: account.email ?? "",
    website: account.website ?? "",
    status: account.status ?? "prospect",
    physical_address: account.physical_address ?? "",
    billing_address: account.billing_address ?? "",
  };
}

function formatStatus(status: string | null): string {
  if (!status) return "-";
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function dealTitle(deal: ApiDeal): string {
  return deal.name ?? deal.title ?? deal.reference ?? `Deal #${deal.id}`;
}

export default function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const accountId = Number(id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can } = usePermissions();
  const canEdit = can("accounts.update");
  const canViewDeals = can("deals.view");
  const canCreateProject = can("projects.create");
  const shouldLoadDeals = canViewDeals || canCreateProject;

  const [account, setAccount] = useState<ApiAccount | null>(null);
  const [deals, setDeals] = useState<ApiDeal[]>([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    account_type: "",
    industry: "",
    phone: "",
    email: "",
    website: "",
    status: "prospect",
    physical_address: "",
    billing_address: "",
  });
  const [documents, setDocuments] = useState<ApiAccountDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [documentType, setDocumentType] = useState<
    "bom" | "design" | "accounting" | "site_photo" | "other"
  >("other");

  useEffect(() => {
    if (searchParams.get("edit") === "1" && canEdit) {
      setIsEditing(true);
    }
  }, [searchParams, canEdit]);

  useEffect(() => {
    if (!Number.isFinite(accountId) || accountId <= 0) {
      setError("Invalid account id.");
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchAccount(accountId)
      .then((data) => {
        if (!cancelled) {
          setAccount(data);
          setForm(accountToForm(data));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Failed to load account.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accountId]);

  useEffect(() => {
    if (!shouldLoadDeals || !Number.isFinite(accountId) || accountId <= 0) {
      return;
    }

    let cancelled = false;
    setDealsLoading(true);

    fetchAccountDeals(accountId, { per_page: 50 })
      .then((response) => {
        if (!cancelled) setDeals(response.data);
      })
      .catch(() => {
        if (!cancelled) setDeals([]);
      })
      .finally(() => {
        if (!cancelled) setDealsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accountId, shouldLoadDeals]);

  useEffect(() => {
    if (!Number.isFinite(accountId) || accountId <= 0) return;

    let cancelled = false;
    setDocumentsLoading(true);

    fetchAccountDocuments(accountId)
      .then((res) => {
        if (!cancelled) setDocuments(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setDocuments([]);
      })
      .finally(() => {
        if (!cancelled) setDocumentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accountId]);

  async function handleDocumentUpload(file: File) {
    setUploadingDocument(true);
    try {
      await ensureCsrfCookie();
      const res = await uploadAccountDocument(accountId, file, documentType);
      setDocuments((current) => [res.data, ...current]);
      toast.success("Document uploaded.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to upload document.",
      );
    } finally {
      setUploadingDocument(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await ensureCsrfCookie();
      const updated = await updateAccount(accountId, {
        name: form.name.trim(),
        account_type: form.account_type.trim() || undefined,
        industry: form.industry.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        website: form.website.trim() || undefined,
        status: form.status || undefined,
        physical_address: form.physical_address.trim() || undefined,
        billing_address: form.billing_address.trim() || undefined,
      });
      setAccount(updated);
      setForm(accountToForm(updated));
      setIsEditing(false);
      router.replace(`/crm/accounts/${accountId}`);
      toast.success("Account updated.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to update account.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    if (account) setForm(accountToForm(account));
    setIsEditing(false);
    router.replace(`/crm/accounts/${accountId}`);
  }

  const depositReadyDeal = useMemo(() => {
    const withDeposit = deals.filter((deal) => hasRecordedDeposit(deal));
    return (
      withDeposit.find((deal) => !deal.project_id) ?? withDeposit[0] ?? null
    );
  }, [deals]);

  const canCreateProjectAfterDeposit =
    !dealsLoading && depositReadyDeal != null;

  const createProjectHref = useMemo(() => {
    const params = new URLSearchParams({
      account_id: String(accountId),
    });
    if (account?.name) {
      params.set("account_name", account.name);
    }
    if (depositReadyDeal) {
      params.set("deal_id", String(depositReadyDeal.id));
      params.set("deal_label", dealTitle(depositReadyDeal));
    }
    return `/crm/projects/new?${params.toString()}`;
  }, [account?.name, accountId, depositReadyDeal]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="flex min-h-full flex-col">
        <AppHeader
          title="Account"
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href="/crm/accounts">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Link>
            </Button>
          }
        />
        <div className="p-6 text-sm text-destructive">
          {error ?? "Account not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader
        title={account.name}
        subtitle={account.account_number ?? `#${account.id}`}
        actions={
          <div className="flex items-center gap-2">
            {account.source_lead_id ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/crm/leads/${account.source_lead_id}`}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back to lead
                </Link>
              </Button>
            ) : null}
            {!isEditing && (
              <>
                <PermissionGate permission="projects.create">
                  {canCreateProjectAfterDeposit ? (
                    <Button size="sm" asChild>
                      <Link href={createProjectHref}>
                        <FolderKanban className="mr-1 h-4 w-4" />
                        Create Project
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled
                      title="Record a deposit on a related deal before creating a project"
                    >
                      <FolderKanban className="mr-1 h-4 w-4" />
                      Create Project
                    </Button>
                  )}
                </PermissionGate>
                <PermissionGate permission="accounts.update">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  Edit
                </Button>
                </PermissionGate>
              </>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/crm/accounts">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>
        }
      />
      <div className="flex-1 space-y-6 p-6">
        <Card className="max-w-2xl border-border">
          <CardHeader>
            <CardTitle className="text-base">
              {isEditing ? "Edit Account" : "Account Details"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing && canEdit ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-account-name">Name *</Label>
                  <Input
                    id="edit-account-name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-industry">Industry</Label>
                  <Input
                    id="edit-industry"
                    value={form.industry}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, industry: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-account-type">Account type</Label>
                  <Input
                    id="edit-account-type"
                    value={form.account_type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, account_type: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-account-email">Email</Label>
                  <Input
                    id="edit-account-email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-account-phone">Phone</Label>
                  <Input
                    id="edit-account-phone"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-website">Website</Label>
                  <Input
                    id="edit-website"
                    value={form.website}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, website: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      setForm((f) => ({ ...f, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="active_opportunity">
                        Active Opportunity
                      </SelectItem>
                      <SelectItem value="active_customer">
                        Active Customer
                      </SelectItem>
                      <SelectItem value="repeat_customer">
                        Repeat Customer
                      </SelectItem>
                      <SelectItem value="dormant">Dormant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-physical-address">Physical address</Label>
                  <Textarea
                    id="edit-physical-address"
                    value={form.physical_address}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        physical_address: e.target.value,
                      }))
                    }
                    rows={2}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-billing-address">Billing address</Label>
                  <Textarea
                    id="edit-billing-address"
                    value={form.billing_address}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        billing_address: e.target.value,
                      }))
                    }
                    rows={2}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving…" : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-sm">
                {account.status && (
                  <Badge variant="outline" className="capitalize">
                    {account.status.replace(/_/g, " ")}
                  </Badge>
                )}
                {account.account_type && (
                  <p>
                    <span className="text-muted-foreground">Type:</span>{" "}
                    {account.account_type}
                  </p>
                )}
                {account.industry && (
                  <p>
                    <span className="text-muted-foreground">Industry:</span>{" "}
                    {account.industry}
                  </p>
                )}
                {account.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {account.email}
                  </p>
                )}
                {account.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {account.phone}
                  </p>
                )}
                {account.website && (
                  <p className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    {account.website}
                  </p>
                )}
                {(account.physical_address || account.billing_address) && (
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    {account.physical_address ?? account.billing_address}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {(() => {
          const contacts =
            account.contacts && account.contacts.length > 0
              ? account.contacts
              : account.primary_contact
                ? [account.primary_contact]
                : [];

          return (
            <Card className="max-w-2xl border-border">
              <CardHeader>
                <CardTitle className="text-base">Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                {contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No contacts linked to this account yet.
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {contacts.map((contact) => {
                      const name = contactDisplayName(contact);
                      const isPrimary =
                        account.primary_contact_id === contact.id;

                      return (
                        <li
                          key={contact.id}
                          className="rounded-lg border border-border/70 p-4"
                        >
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <Link
                              href={`/crm/contacts/${contact.id}`}
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              {name}
                            </Link>
                            {isPrimary ? (
                              <Badge variant="outline" className="font-normal">
                                Primary
                              </Badge>
                            ) : null}
                            {contact.status ? (
                              <Badge
                                variant="outline"
                                className="font-normal capitalize"
                              >
                                {contact.status.replace(/_/g, " ")}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="space-y-2 text-sm">
                            {contact.job_title ? (
                              <p>
                                <span className="text-muted-foreground">
                                  Job title:
                                </span>{" "}
                                {contact.job_title}
                              </p>
                            ) : null}
                            {contact.email ? (
                              <p className="flex items-center gap-2">
                                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <a
                                  href={`mailto:${contact.email}`}
                                  className="hover:underline"
                                >
                                  {contact.email}
                                </a>
                              </p>
                            ) : null}
                            {contact.phone ? (
                              <p className="flex items-center gap-2">
                                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                                {contact.phone}
                              </p>
                            ) : null}
                            {contact.whatsapp ? (
                              <p>
                                <span className="text-muted-foreground">
                                  WhatsApp:
                                </span>{" "}
                                {contact.whatsapp}
                              </p>
                            ) : null}
                            {contact.preferred_contact_method ? (
                              <p>
                                <span className="text-muted-foreground">
                                  Preferred contact:
                                </span>{" "}
                                <span className="capitalize">
                                  {contact.preferred_contact_method.replace(
                                    /_/g,
                                    " ",
                                  )}
                                </span>
                              </p>
                            ) : null}
                            {contact.contact_number ? (
                              <p className="text-xs text-muted-foreground">
                                {contact.contact_number}
                              </p>
                            ) : null}
                            {contact.notes ? (
                              <p className="whitespace-pre-wrap text-muted-foreground">
                                {contact.notes}
                              </p>
                            ) : null}
                            {!contact.email &&
                            !contact.phone &&
                            !contact.whatsapp &&
                            !contact.job_title &&
                            !contact.notes ? (
                              <p className="text-muted-foreground">
                                No additional contact details on file.
                              </p>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })()}

        <Card className="max-w-3xl border-border">
          <CardHeader>
            <CardTitle className="text-base">Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PermissionGate permission="accounts.update">
              <div className="flex flex-wrap items-end gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="document-type">Document type</Label>
                  <Select
                    value={documentType}
                    onValueChange={(value) =>
                      setDocumentType(
                        value as
                          | "bom"
                          | "design"
                          | "accounting"
                          | "site_photo"
                          | "other",
                      )
                    }
                  >
                    <SelectTrigger id="document-type" className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bom">BOM</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="accounting">Accounting sheet</SelectItem>
                      <SelectItem value="site_photo">Site photo</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <input
                    id="account-document-upload"
                    type="file"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleDocumentUpload(file);
                      event.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={uploadingDocument}
                    onClick={() =>
                      document.getElementById("account-document-upload")?.click()
                    }
                  >
                    <Upload className="h-4 w-4" />
                    {uploadingDocument ? "Uploading…" : "Upload"}
                  </Button>
                </div>
              </div>
            </PermissionGate>

            {documentsLoading ? (
              <div className="flex justify-center py-6">
                <Spinner className="h-6 w-6 text-primary" />
              </div>
            ) : documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No documents uploaded yet. Add BOMs, designs, or accounting sheets
                for quotation prep.
              </p>
            ) : (
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium">{doc.filename}</span>
                      <Badge variant="outline" className="shrink-0 capitalize">
                        {doc.document_type.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    {doc.firebase_url ? (
                      <a
                        href={doc.firebase_url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-primary hover:underline"
                      >
                        Open
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {canViewDeals && (
          <Card className="max-w-3xl border-border">
            <CardHeader>
              <CardTitle className="text-base">Related Deals</CardTitle>
            </CardHeader>
            <CardContent>
              {dealsLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner className="h-6 w-6 text-primary" />
                </div>
              ) : deals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No deals linked to this account.
                </p>
              ) : (
                <div className="rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Deal</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deals.map((deal) => (
                        <TableRow key={deal.id}>
                          <TableCell>
                            <Link
                              href={`/crm/deals/${deal.id}`}
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              {dealTitle(deal)}
                            </Link>
                            {deal.deal_number && (
                              <p className="text-xs text-muted-foreground">
                                {deal.deal_number}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm capitalize">
                              {formatStatus(deal.stage)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {deal.status ? (
                              <Badge variant="outline" className="capitalize">
                                {formatStatus(deal.status)}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                -
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
