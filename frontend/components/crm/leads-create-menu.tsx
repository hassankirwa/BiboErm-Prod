"use client";

import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { LeadViewMode } from "@/lib/leads-list-data";

export function LeadsCreateMenu({ currentView }: { currentView: LeadViewMode }) {
  const createHref = `/crm/leads/new?view=${currentView}`;

  return (
    <div className="inline-flex items-center">
      <Button
        size="sm"
        className="h-9 gap-1.5 rounded-r-none rounded-l-[5px] px-4"
        asChild
      >
        <Link href={createHref}>
          <Plus className="h-4 w-4" />
          Create Lead
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            className={cn(
              "h-9 rounded-l-none rounded-r-[5px] border-l border-primary-foreground/25 px-2",
              "ml-px"
            )}
            aria-label="More create options"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[10rem]">
          <DropdownMenuItem asChild>
            <Link href="/crm/leads/import">Import leads</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
