"use client";

import { use, useEffect, useState } from "react";
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
import { Spinner } from "@/components/ui/spinner";
import { PermissionGate } from "@/components/auth/permission-gate";
import { LeadPicker } from "@/components/crm/lead-picker";
import { usePermissions } from "@/hooks/use-permissions";
import { ChevronLeft, Mail, Phone, Building2, Pencil, UserRound } from "lucide-react";
import {
  contactDisplayName,
  fetchContact,
  updateContact,
  type ApiContact,
} from "@/lib/api/crm/contacts";
import { leadDisplayName } from "@/lib/api/crm/leads";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { toast } from "sonner";

function contactToForm(contact: ApiContact) {
  return {
    name: contact.name ?? contactDisplayName(contact),
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    whatsapp: contact.whatsapp ?? "",
    job_title: contact.job_title ?? "",
    status: contact.status ?? "new_contact",
    notes: contact.notes ?? "",
    source_lead_id: contact.source_lead_id,
  };
}

function leadLabelFromContact(contact: ApiContact): string | null {
  if (contact.source_lead) {
    return leadDisplayName(contact.source_lead);
  }
  return contact.source_lead_id ? `Lead #${contact.source_lead_id}` : null;
}

export default function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const contactId = Number(id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can } = usePermissions();
  const canEdit = can("contacts.update");

  const [contact, setContact] = useState<ApiContact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedLeadLabel, setSelectedLeadLabel] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    job_title: "",
    status: "new_contact",
    notes: "",
    source_lead_id: null as number | null,
  });

  useEffect(() => {
    if (searchParams.get("edit") === "1" && canEdit) {
      setIsEditing(true);
    }
  }, [searchParams, canEdit]);

  useEffect(() => {
    if (!Number.isFinite(contactId) || contactId <= 0) {
      setError("Invalid contact id.");
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchContact(contactId)
      .then((data) => {
        if (!cancelled) {
          setContact(data);
          setForm(contactToForm(data));
          setSelectedLeadLabel(leadLabelFromContact(data));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Failed to load contact.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [contactId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await ensureCsrfCookie();
      const updated = await updateContact(contactId, {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        whatsapp: form.whatsapp.trim() || undefined,
        job_title: form.job_title.trim() || undefined,
        status: form.status || undefined,
        notes: form.notes.trim() || undefined,
        source_lead_id: form.source_lead_id,
      });
      setContact(updated);
      setForm(contactToForm(updated));
      setSelectedLeadLabel(leadLabelFromContact(updated));
      setIsEditing(false);
      router.replace(`/crm/contacts/${contactId}`);
      toast.success("Contact updated.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to update contact.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    if (contact) {
      setForm(contactToForm(contact));
      setSelectedLeadLabel(leadLabelFromContact(contact));
    }
    setIsEditing(false);
    router.replace(`/crm/contacts/${contactId}`);
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="flex h-full flex-col">
        <AppHeader
          title="Contact"
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href="/crm/contacts">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Link>
            </Button>
          }
        />
        <div className="p-6 text-sm text-destructive">
          {error ?? "Contact not found."}
        </div>
      </div>
    );
  }

  const name = contactDisplayName(contact);

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title={name}
        subtitle={contact.contact_number ?? `#${contact.id}`}
        actions={
          <div className="flex items-center gap-2">
            {!isEditing && (
              <PermissionGate permission="contacts.update">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  Edit
                </Button>
              </PermissionGate>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/crm/contacts">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>
        }
      />
      <div className="flex-1 overflow-auto p-6">
        <Card className="max-w-2xl border-border">
          <CardHeader>
            <CardTitle className="text-base">
              {isEditing ? "Edit Contact" : "Contact Details"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing && canEdit ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input
                    id="edit-name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-whatsapp">WhatsApp</Label>
                  <Input
                    id="edit-whatsapp"
                    value={form.whatsapp}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, whatsapp: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-job-title">Job title</Label>
                  <Input
                    id="edit-job-title"
                    value={form.job_title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, job_title: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Lead (optional)</Label>
                  <LeadPicker
                    value={form.source_lead_id}
                    displayLabel={selectedLeadLabel}
                    onSelect={(lead) => {
                      setForm((f) => ({ ...f, source_lead_id: lead.id }));
                      setSelectedLeadLabel(leadDisplayName(lead));
                    }}
                    onClear={() => {
                      setForm((f) => ({ ...f, source_lead_id: null }));
                      setSelectedLeadLabel(null);
                    }}
                    disabled={saving}
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
                      <SelectItem value="new_contact">New Contact</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    value={form.notes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    rows={4}
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
                {contact.status && (
                  <Badge variant="outline" className="capitalize">
                    {contact.status.replace(/_/g, " ")}
                  </Badge>
                )}
                {contact.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${contact.email}`}
                      className="hover:underline"
                    >
                      {contact.email}
                    </a>
                  </p>
                )}
                {contact.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {contact.phone}
                  </p>
                )}
                {contact.whatsapp && (
                  <p>
                    <span className="text-muted-foreground">WhatsApp:</span>{" "}
                    {contact.whatsapp}
                  </p>
                )}
                {contact.account && (
                  <p className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <Link
                      href={`/crm/accounts/${contact.account.id}`}
                      className="text-primary hover:underline"
                    >
                      {contact.account.name}
                    </Link>
                  </p>
                )}
                {contact.source_lead_id && (
                  <p className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                    <Link
                      href={`/crm/leads/${contact.source_lead_id}`}
                      className="text-primary hover:underline"
                    >
                      {leadLabelFromContact(contact)}
                    </Link>
                  </p>
                )}
                {contact.job_title && (
                  <p>
                    <span className="text-muted-foreground">Job title:</span>{" "}
                    {contact.job_title}
                  </p>
                )}
                {contact.notes && (
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {contact.notes}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
