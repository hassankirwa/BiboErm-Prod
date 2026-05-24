"use client";

import { useEffect, useState } from "react";
import { fetchLead } from "@/lib/api/crm/leads";
import { apiLeadToKanbanCard } from "@/lib/crm-lead-mapper";
import type { ApiLeadDetail } from "@/lib/api/crm/types";
import type { LeadKanbanCard } from "@/lib/leads-kanban-data";

export function useCrmLead(leadId: string) {
  const [lead, setLead] = useState<ApiLeadDetail | null>(null);
  const [card, setCard] = useState<LeadKanbanCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = Number(leadId);
    if (!Number.isFinite(id) || id <= 0) {
      setLead(null);
      setCard(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchLead(id)
      .then((data) => {
        if (cancelled) return;
        setLead(data);
        setCard(apiLeadToKanbanCard(data));
      })
      .catch(() => {
        if (cancelled) return;
        setLead(null);
        setCard(null);
        setError("Failed to load lead.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [leadId]);

  return { lead, card, loading, error };
}
