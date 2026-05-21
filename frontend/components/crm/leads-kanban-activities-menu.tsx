"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { leadActivityIcons } from "@/lib/lead-activity-icons";
import type { LeadActivityType } from "@/lib/leads-kanban-data";
import { leadActivityTypes } from "@/lib/leads-kanban-data";

const MENU_GAP = 6;
const VIEWPORT_PAD = 8;
const MENU_MIN_WIDTH = 200;

function computeMenuPosition(
  anchor: DOMRect,
  menuWidth: number,
  menuHeight: number,
  placement: "above" | "below"
) {
  let top =
    placement === "below"
      ? anchor.bottom + MENU_GAP
      : anchor.top - menuHeight - MENU_GAP;

  if (
    placement === "below" &&
    top + menuHeight > window.innerHeight - VIEWPORT_PAD
  ) {
    top = anchor.top - menuHeight - MENU_GAP;
  } else if (placement === "above" && top < VIEWPORT_PAD) {
    top = anchor.bottom + MENU_GAP;
  }

  let left = anchor.right - menuWidth;
  left = Math.max(
    VIEWPORT_PAD,
    Math.min(left, window.innerWidth - menuWidth - VIEWPORT_PAD)
  );

  return { top, left };
}

export function LeadsKanbanActivitiesMenu({
  open,
  onSelect,
  onClose,
  anchorRef,
  placement = "below",
  className,
}: {
  open: boolean;
  onSelect: (type: LeadActivityType) => void;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  placement?: "above" | "below";
  className?: string;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const anchorRect = anchor.getBoundingClientRect();
    const menuEl = menuRef.current;
    const menuWidth = menuEl?.offsetWidth ?? MENU_MIN_WIDTH;
    const menuHeight = menuEl?.offsetHeight ?? 140;

    setPosition(
      computeMenuPosition(anchorRect, menuWidth, menuHeight, placement)
    );
  }, [anchorRef, placement]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(raf);
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const handleUpdate = () => updatePosition();
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);
    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
    };
  }, [open, updatePosition]);

  if (!open || !mounted) return null;

  const menu = (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[100] cursor-default"
        aria-label="Close activities menu"
        onClick={onClose}
      />
      <div
        ref={menuRef}
        className={cn(
          "fixed z-[110] min-w-[200px] overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg",
          !position && "invisible",
          className
        )}
        style={
          position
            ? { top: position.top, left: position.left }
            : { top: 0, left: 0 }
        }
        role="menu"
      >
        <p className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Activities
        </p>
        {leadActivityTypes.map((item) => {
          const Icon = leadActivityIcons[item.id];
          return (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted/60"
              onClick={() => {
                onSelect(item.id);
                onClose();
              }}
            >
              <Icon className="h-4 w-4 text-[#1e3a5f]" />
              {item.label}
            </button>
          );
        })}
      </div>
    </>
  );

  return createPortal(menu, document.body);
}
