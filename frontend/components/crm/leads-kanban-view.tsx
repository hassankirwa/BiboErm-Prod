"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  leadKanbanStages,
  type LeadActivityType,
  type LeadKanbanCard,
  type LeadKanbanStageId,
} from "@/lib/leads-kanban-data";
import {
  addLead,
  moveLeadToStage,
  setLeadActivity,
  useLeadCards,
} from "@/lib/leads-state";
import { LeadsKanbanCard } from "@/components/crm/leads-kanban-card";
import { LeadsActivityModal } from "@/components/crm/leads-activity-modal";
import {
  LeadsAddLeadModal,
  addLeadFormToKanbanCard,
} from "@/components/crm/leads-add-lead-modal";

export function LeadsKanbanView({
  returnView = "kanban",
  apiCards,
  onStageChange,
  onAddLead,
  onActivitySave,
}: {
  returnView?: string;
  apiCards?: LeadKanbanCard[];
  onStageChange?: (leadId: string, stageId: LeadKanbanStageId) => Promise<void>;
  onAddLead?: (values: import("@/lib/lead-form-config").LeadFormValues) => Promise<void>;
  onActivitySave?: (
    leadId: string,
    payload: { subject: string; description?: string; due_at?: string; activity_type?: string },
  ) => Promise<void>;
}) {
  const localCards = useLeadCards();
  const cards = apiCards ?? localCards;
  const [addLeadStage, setAddLeadStage] = useState<LeadKanbanStageId | null>(
    null
  );
  const [activityModal, setActivityModal] = useState<{
    cardId: string;
    leadTitle: string;
    activityType: LeadActivityType;
  } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetStage, setDropTargetStage] = useState<LeadKanbanStageId | null>(
    null
  );

  const cardsByStage = useMemo(() => {
    const map = new Map<string, typeof cards>();
    leadKanbanStages.forEach((s) => map.set(s.id, []));
    cards.forEach((card) => {
      const list = map.get(card.stageId) ?? [];
      list.push(card);
      map.set(card.stageId, list);
    });
    return map;
  }, [cards]);

  const handleActivitySelect = (leadId: string, type: LeadActivityType) => {
    const card = cards.find((c) => c.id === leadId);
    if (!card) return;
    setActivityModal({
      cardId: leadId,
      leadTitle: card.title,
      activityType: type,
    });
  };

  const handleDrop = async (stageId: LeadKanbanStageId, leadId: string) => {
    if (!leadId) return;
    if (onStageChange) {
      await onStageChange(leadId, stageId);
    } else {
      moveLeadToStage(leadId, stageId);
    }
    setDraggingId(null);
    setDropTargetStage(null);
  };

  return (
    <>
      <div className="min-w-0 overflow-x-auto pb-2">
        <div
          className={cn(
            "grid gap-3 sm:gap-4",
            "w-max min-w-full",
            "grid-flow-col auto-cols-[min(88vw,240px)]",
            "sm:auto-cols-[min(46vw,220px)]",
            "md:auto-cols-[min(32vw,200px)]",
            "lg:auto-cols-[min(30vw,190px)]",
            "xl:w-full xl:min-w-0 xl:grid-flow-row xl:grid-cols-5 xl:auto-cols-fr"
          )}
        >
          {leadKanbanStages.map((stage) => {
            const stageCards = cardsByStage.get(stage.id) ?? [];

            return (
              <section
                key={stage.id}
                className={cn(
                  "flex min-w-0 flex-col rounded-lg border border-border bg-muted/20 transition-colors",
                  dropTargetStage === stage.id && "ring-2 ring-primary/40"
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDropTargetStage(stage.id);
                }}
                onDragLeave={(e) => {
                  if (
                    e.currentTarget.contains(e.relatedTarget as Node | null)
                  ) {
                    return;
                  }
                  setDropTargetStage((prev) =>
                    prev === stage.id ? null : prev
                  );
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const leadId = e.dataTransfer.getData("text/lead-id");
                  handleDrop(stage.id, leadId);
                }}
              >
                <header
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-t-lg border-b px-3 py-2.5",
                    stage.headerBg,
                    stage.headerBorder
                  )}
                >
                  <h2 className="truncate text-sm font-semibold text-[#1e3a5f]">
                    {stage.label}
                  </h2>
                  <span
                    className={cn(
                      "flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                      stage.countBadge
                    )}
                  >
                    {stageCards.length}
                  </span>
                </header>

                <div className="flex-1 space-y-1.5 overflow-visible p-2 pb-4">
                  {stageCards.map((card) => (
                    <LeadsKanbanCard
                      key={card.id}
                      card={card}
                      returnView={returnView}
                      onActivitySelect={handleActivitySelect}
                      isDragging={draggingId === card.id}
                      onDragStartCard={setDraggingId}
                      onDragEndCard={() => {
                        setDraggingId(null);
                        setDropTargetStage(null);
                      }}
                    />
                  ))}
                </div>

                <footer className="border-t border-border/60 p-2">
                  <button
                    type="button"
                    onClick={() => setAddLeadStage(stage.id)}
                    className={cn(
                      "flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors",
                      stage.addBtnClass
                    )}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Lead
                  </button>
                </footer>
              </section>
            );
          })}
        </div>
      </div>

      <LeadsActivityModal
        open={!!activityModal}
        onOpenChange={(open) => !open && setActivityModal(null)}
        activityType={activityModal?.activityType ?? null}
        leadTitle={activityModal?.leadTitle ?? ""}
        onSave={async (payload) => {
          if (!activityModal) return;
          if (onActivitySave) {
            await onActivitySave(activityModal.cardId, payload);
          } else {
            setLeadActivity(activityModal.cardId, activityModal.activityType);
          }
        }}
      />

      {addLeadStage && (
        <LeadsAddLeadModal
          open={!!addLeadStage}
          onOpenChange={(open) => !open && setAddLeadStage(null)}
          defaultStageId={addLeadStage}
          onSubmit={async (values) => {
            if (onAddLead) {
              await onAddLead(values);
            } else {
              addLead(addLeadFormToKanbanCard(values));
            }
          }}
        />
      )}
    </>
  );
}
