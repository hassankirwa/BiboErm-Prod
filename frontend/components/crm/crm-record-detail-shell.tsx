"use client";

import Link from "next/link";
import { ArrowLeft, ChevronDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function CrmRecordDetailShell({
  backHref,
  backLabel = "Leads",
  recordTitle,
  recordMeta,
  headerBadges,
  actions,
  sidebar,
  children,
  className,
}: {
  backHref: string;
  backLabel?: string;
  recordTitle: string;
  recordMeta?: React.ReactNode;
  headerBadges?: React.ReactNode;
  actions: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto flex w-full max-w-[1600px] flex-col", className)}>
      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-8 gap-1.5 text-[#1e3a5f] hover:bg-[#ebf2ff]/60"
        >
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
        <span className="text-muted-foreground/50">|</span>
        <span className="text-sm font-medium text-[#1e3a5f]">Leads</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          {headerBadges}
          <h1 className="text-xl font-semibold tracking-tight text-[#1e3a5f] sm:text-2xl">
            {recordTitle}
          </h1>
          {recordMeta}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 border-border text-[#1e3a5f]"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Clone lead</DropdownMenuItem>
              <DropdownMenuItem>Print preview</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Delete lead
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 lg:w-[260px] xl:w-[280px]">
          {sidebar}
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

export function CrmDetailField({
  label,
  value,
  href,
  className,
}: {
  label: string;
  value: React.ReactNode;
  href?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 py-2", className)}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">
        {href ? (
          <a
            href={href}
            className="text-[#2563eb] hover:underline"
          >
            {value}
          </a>
        ) : (
          value || <span className="text-muted-foreground">—</span>
        )}
      </dd>
    </div>
  );
}
