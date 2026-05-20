"use client";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AppHeader({ title, subtitle, actions }: AppHeaderProps) {
  return (
    <div className="shrink-0 border-b border-border/60 bg-background px-3 py-3 sm:px-4 sm:py-4 md:px-6">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-foreground sm:text-lg">{title}</h1>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
          )}
        </div>

        {actions && (
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
