"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { fetchLead } from "@/lib/api/crm/leads";
import type { ApiLeadDetail } from "@/lib/api/crm/types";
import { Spinner } from "@/components/ui/spinner";

type RelatedSection = {
  id: string;
  label: string;
  count?: number;
  items?: { id: string; title: string; meta?: string; href?: string }[];
  emptyLabel?: string;
};

function RelatedSectionBlock({ section }: { section: RelatedSection }) {
  const [open, setOpen] = useState(
    section.id === "open-activities" || section.id === "notes",
  );
  const hasItems = (section.items?.length ?? 0) > 0;

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-[#1e3a5f] hover:bg-[#ebf2ff]/40"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="flex-1 truncate">{section.label}</span>
        {section.count !== undefined && (
          <span className="text-xs font-normal text-muted-foreground">
            {section.count}
          </span>
        )}
      </button>
      {open && (
        <div className="border-t border-border/60 bg-muted/10 px-3 py-2">
          {hasItems ? (
            <ul className="space-y-2">
              {section.items!.map((item) => (
                <li key={item.id}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="block rounded-md px-2 py-1.5 text-left text-xs hover:bg-[#ebf2ff]/50"
                    >
                      <p className="font-medium text-[#1e3a5f]">{item.title}</p>
                      {item.meta && (
                        <p className="text-muted-foreground">{item.meta}</p>
                      )}
                    </Link>
                  ) : (
                    <div className="rounded-md px-2 py-1.5 text-left text-xs">
                      <p className="font-medium text-[#1e3a5f]">{item.title}</p>
                      {item.meta && (
                        <p className="text-muted-foreground">{item.meta}</p>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-1 py-1 text-xs text-muted-foreground">
              {section.emptyLabel ?? "No records"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function buildSections(lead: ApiLeadDetail): RelatedSection[] {
  const activities = (lead.activities ?? []) as Array<{
    id: number;
    subject: string;
    status: string;
    due_at?: string | null;
  }>;
  const openActivities = activities.filter((a) => a.status !== "completed");
  const closedActivities = activities.filter((a) => a.status === "completed");
  const attachments = (lead.attachments ?? []) as Array<{
    id: number;
    file_name?: string;
    original_name?: string;
  }>;

  const connected: RelatedSection["items"] = [];
  if (lead.converted_contact) {
    connected.push({
      id: `contact-${lead.converted_contact.id}`,
      title: lead.converted_contact.name ?? "Contact",
      meta: "Contact",
      href: `/crm/contacts/${lead.converted_contact.id}`,
    });
  }
  if (lead.converted_account) {
    connected.push({
      id: `account-${lead.converted_account.id}`,
      title: lead.converted_account.name ?? "Account",
      meta: "Account",
      href: `/crm/accounts/${lead.converted_account.id}`,
    });
  }

  return [
    {
      id: "notes",
      label: "Notes",
      count: lead.notes || lead.internal_notes ? 1 : 0,
      items: lead.notes || lead.internal_notes
        ? [{ id: "note-1", title: lead.notes ?? lead.internal_notes ?? "" }]
        : [],
      emptyLabel: "No notes yet",
    },
    {
      id: "connected",
      label: "Connected Records",
      count: connected.length,
      items: connected,
      emptyLabel: "No connected records",
    },
    {
      id: "attachments",
      label: "Attachments",
      count: attachments.length,
      items: attachments.map((a) => ({
        id: String(a.id),
        title: a.original_name ?? a.file_name ?? `Attachment ${a.id}`,
      })),
      emptyLabel: "No attachments",
    },
    {
      id: "open-activities",
      label: "Open Activities",
      count: openActivities.length,
      items: openActivities.map((a) => ({
        id: String(a.id),
        title: a.subject,
        meta: a.due_at ? `Due ${a.due_at.slice(0, 10)}` : undefined,
      })),
      emptyLabel: "No open activities",
    },
    {
      id: "closed-activities",
      label: "Closed Activities",
      count: closedActivities.length,
      items: closedActivities.map((a) => ({
        id: String(a.id),
        title: a.subject,
      })),
      emptyLabel: "No completed activities",
    },
    {
      id: "deals",
      label: "Deals",
      count: lead.converted_deal ? 1 : 0,
      items: lead.converted_deal
        ? [
            {
              id: String(lead.converted_deal.id),
              title: lead.converted_deal.title ?? lead.converted_deal.name ?? "Deal",
              href: `/crm/deals/${lead.converted_deal.id}`,
            },
          ]
        : [],
      emptyLabel: "No deals linked",
    },
    {
      id: "site-visits",
      label: "Site Visits",
      count: (lead.site_visits ?? []).length,
      items: (lead.site_visits ?? []).map((v) => ({
        id: String(v.id),
        title: v.title ?? v.visit_number ?? `Visit ${v.id}`,
        meta: v.visit_date?.slice?.(0, 10) ?? v.visit_date,
        href: `/crm/site-visits`,
      })),
      emptyLabel: "No site visits",
    },
  ];
}

export function LeadRelatedLists({ leadId }: { leadId?: number }) {
  const [lead, setLead] = useState<ApiLeadDetail | null>(null);
  const [loading, setLoading] = useState(!!leadId);

  useEffect(() => {
    if (!leadId) return;
    setLoading(true);
    fetchLead(leadId)
      .then(setLead)
      .catch(() => setLead(null))
      .finally(() => setLoading(false));
  }, [leadId]);

  const sections = useMemo(
    () => (lead ? buildSections(lead) : []),
    [lead],
  );

  if (!leadId) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="h-6 w-6 text-primary" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-[#ebf2ff]/30 px-3 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#1e3a5f]">
          Related List
        </h2>
      </div>
      <nav>
        {sections.map((section) => (
          <RelatedSectionBlock key={section.id} section={section} />
        ))}
      </nav>
    </div>
  );
}
