"use client";

import { useMemo, useSyncExternalStore } from "react";
import { resolveLeadRecord } from "@/lib/lead-record-resolver";
import {
  leadKanbanCards,
  type LeadActivityType,
  type LeadKanbanCard,
  type LeadKanbanStageId,
} from "@/lib/leads-kanban-data";

let cards: LeadKanbanCard[] = [...leadKanbanCards];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getLeadCards(): LeadKanbanCard[] {
  return cards;
}

export function getLeadById(id: string): LeadKanbanCard | undefined {
  return resolveLeadRecord(id, cards);
}

export function setLeadCards(next: LeadKanbanCard[]) {
  cards = next;
  emit();
}

export function updateLead(id: string, patch: Partial<LeadKanbanCard>) {
  const existing = cards.find((c) => c.id === id);
  if (existing) {
    cards = cards.map((c) => (c.id === id ? { ...c, ...patch } : c));
  } else {
    const resolved = resolveLeadRecord(id, cards);
    if (resolved) {
      cards = [...cards, { ...resolved, ...patch }];
    }
  }
  emit();
}

export function moveLeadToStage(id: string, stageId: LeadKanbanStageId) {
  updateLead(id, { stageId });
}

export function addLead(card: LeadKanbanCard) {
  cards = [...cards, card];
  emit();
}

export function setLeadActivity(id: string, activityType: LeadActivityType) {
  updateLead(id, { lastActivityType: activityType });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLeadCards() {
  return useSyncExternalStore(subscribe, getLeadCards, getLeadCards);
}

export function useLeadById(id: string) {
  const all = useLeadCards();
  return useMemo(() => resolveLeadRecord(id, all), [id, all]);
}
