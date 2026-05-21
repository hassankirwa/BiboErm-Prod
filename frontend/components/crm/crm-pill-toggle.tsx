"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type CrmPillToggleOption<T extends string> = {
  id: T;
  label?: string;
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
};

/**
 * Segmented pill control — matches Bibo Accounts list view switcher:
 * bordered container, solid primary blue active segment, white icon/text.
 */
export function CrmPillToggle<T extends string>({
  value,
  onChange,
  options,
  className,
  showMoreTrigger,
  onMoreClick,
}: {
  value: T;
  onChange: (id: T) => void;
  options: CrmPillToggleOption<T>[];
  className?: string;
  showMoreTrigger?: boolean;
  onMoreClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-[5px] border border-border/80 bg-background p-0.5 shadow-sm",
        className
      )}
      role="tablist"
    >
      {options.map((opt) => {
        const isActive = value === opt.id;
        const Icon = opt.icon;
        const isIconOnly = !!Icon && !opt.label;

        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            title={opt.title ?? opt.label}
            onClick={() => onChange(opt.id)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-[4px] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              isIconOnly ? "h-8 w-8 sm:h-9 sm:w-9" : "h-8 px-3.5 text-sm sm:h-9",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-[#1e3a5f]/75 hover:bg-muted/60"
            )}
          >
            {Icon && (
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-primary-foreground" : "text-[#1e3a5f]"
                )}
              />
            )}
            {opt.label && <span>{opt.label}</span>}
          </button>
        );
      })}
      {showMoreTrigger && (
        <button
          type="button"
          title="More views"
          onClick={onMoreClick}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-[4px] sm:h-9 sm:w-9",
            "text-[#1e3a5f]/75 transition-colors hover:bg-muted/60",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          )}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
