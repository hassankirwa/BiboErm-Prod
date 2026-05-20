"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { LeadActivityIcon } from "@/lib/lead-activity-icons";
import type { LeadViewMode } from "@/lib/leads-list-data";
import {
  formatKes,
  type LeadActivityType,
  type LeadKanbanCard,
} from "@/lib/leads-kanban-data";
import { LeadsKanbanActivitiesMenu } from "@/components/crm/leads-kanban-activities-menu";

export function LeadsKanbanCard({
  card,
  returnView = "kanban",
  onActivitySelect,
  isDragging,
  onDragStartCard,
  onDragEndCard,
}: {
  card: LeadKanbanCard;
  returnView?: LeadViewMode;
  onActivitySelect: (leadId: string, type: LeadActivityType) => void;
  isDragging?: boolean;
  onDragStartCard?: (id: string) => void;
  onDragEndCard?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const dragStarted = useRef(false);
  const activityTriggerRef = useRef<HTMLButtonElement>(null);

  return (
    <article
      draggable
      onDragStart={(e) => {
        dragStarted.current = true;
        e.dataTransfer.setData("text/lead-id", card.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStartCard?.(card.id);
      }}
      onDragEnd={() => {
        onDragEndCard?.();
        window.setTimeout(() => {
          dragStarted.current = false;
        }, 0);
      }}
      className={cn(
        "group relative flex cursor-grab flex-col gap-1.5 rounded-md border border-border bg-card px-2.5 py-2 shadow-sm transition-shadow active:cursor-grabbing hover:shadow-md",
        isDragging && "opacity-50 ring-2 ring-primary/30",
        menuOpen && "z-20"
      )}
    >
      <Link
        href={`/crm/leads/${card.id}?view=${returnView}`}
        className="line-clamp-2 text-xs font-medium leading-snug text-[#1e3a5f] hover:underline"
        onClick={(e) => {
          if (dragStarted.current) {
            e.preventDefault();
          }
        }}
      >
        {card.title}
      </Link>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
          {formatKes(card.estimatedValue)}
        </span>

        <div className="flex shrink-0 items-center gap-0.5">
          {card.lastActivityType ? (
            <span
              className="flex h-6 w-6 items-center justify-center text-[#1e3a5f]/80"
              title="Latest activity"
            >
              <LeadActivityIcon
                type={card.lastActivityType}
                className="h-3.5 w-3.5"
              />
            </span>
          ) : (
            <span className="h-6 w-6 shrink-0" aria-hidden />
          )}

          <div className="relative">
            <button
              ref={activityTriggerRef}
              type="button"
              aria-label="Add activity"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen((o) => !o);
              }}
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-opacity",
                "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                menuOpen && "opacity-100"
              )}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <LeadsKanbanActivitiesMenu
              open={menuOpen}
              anchorRef={activityTriggerRef}
              onClose={() => setMenuOpen(false)}
              onSelect={(type) => onActivitySelect(card.id, type)}
              placement="below"
            />
          </div>
        </div>
      </div>
    </article>
  );
}
