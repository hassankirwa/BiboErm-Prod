import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Scrollable full-height wrapper for CRM module pages */
export function CrmPageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex h-full min-h-0 w-full max-w-full min-w-0 flex-col bg-background">
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className={cn("min-w-0 w-full max-w-full", className)}>{children}</div>
      </div>
    </div>
  );
}

/** Standard horizontal padding for CRM page content */
export function CrmPageContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 w-full space-y-4 px-3 py-4 sm:space-y-5 sm:px-4 sm:py-5 md:px-6 lg:px-8",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Responsive page title row with optional actions */
export function CrmPageTitleRow({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
