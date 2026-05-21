import {
  leadSourceOptions,
  type LeadFormValues,
} from "@/lib/lead-form-config";
import type { LeadKanbanCard } from "@/lib/leads-kanban-data";

export function cardToFormValues(card: LeadKanbanCard): LeadFormValues {
  return {
    title: card.title,
    company: card.company ?? "",
    location: card.location,
    phone: card.phone ?? "",
    email: card.email ?? "",
    source: card.source ?? leadSourceOptions[0],
    stageId: card.stageId,
    owner: card.owner,
    estimatedValue: card.estimatedValue,
    nextActionDate: card.nextActionDate,
    tag: card.tag,
    notes: card.notes ?? "",
  };
}
