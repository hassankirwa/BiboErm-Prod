"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type RelatedSection = {
  id: string;
  label: string;
  count?: number;
  items?: { id: string; title: string; meta?: string }[];
  emptyLabel?: string;
};

const defaultSections: RelatedSection[] = [
  {
    id: "notes",
    label: "Notes",
    count: 0,
    emptyLabel: "No notes yet",
  },
  {
    id: "connected",
    label: "Connected Records",
    count: 0,
    emptyLabel: "No connected records",
  },
  {
    id: "attachments",
    label: "Attachments",
    count: 0,
    emptyLabel: "No attachments",
  },
  {
    id: "open-activities",
    label: "Open Activities",
    count: 2,
    items: [
      { id: "a1", title: "Follow-up call", meta: "Due May 20" },
      { id: "a2", title: "Send quotation", meta: "Due May 22" },
    ],
  },
  {
    id: "closed-activities",
    label: "Closed Activities",
    count: 1,
    items: [{ id: "c1", title: "Intro email sent", meta: "May 15" }],
  },
  {
    id: "deals",
    label: "Deals",
    count: 0,
    emptyLabel: "No deals linked",
  },
  {
    id: "contacts",
    label: "Contacts",
    count: 1,
    items: [{ id: "p1", title: "Primary contact", meta: "Not set" }],
  },
];

function RelatedSectionBlock({ section }: { section: RelatedSection }) {
  const [open, setOpen] = useState(
    section.id === "open-activities" || section.id === "notes"
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
                  <button
                    type="button"
                    className="w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-[#ebf2ff]/50"
                  >
                    <p className="font-medium text-[#1e3a5f]">{item.title}</p>
                    {item.meta && (
                      <p className="text-muted-foreground">{item.meta}</p>
                    )}
                  </button>
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

export function LeadRelatedLists() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-[#ebf2ff]/30 px-3 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#1e3a5f]">
          Related List
        </h2>
      </div>
      <nav>
        {defaultSections.map((section) => (
          <RelatedSectionBlock key={section.id} section={section} />
        ))}
      </nav>
    </div>
  );
}
