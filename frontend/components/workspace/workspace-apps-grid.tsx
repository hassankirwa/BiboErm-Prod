import Link from "next/link";
import { workspaceApps } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function WorkspaceAppsGrid() {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-foreground">Your Apps</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {workspaceApps.map((app) => {
          const Icon = app.icon;
          return (
            <Link
              key={app.id}
              href={app.href}
              className="group flex items-center gap-3 rounded-[10px] border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px]",
                  app.iconClassName
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {app.name}
                </span>
                {app.badge && (
                  <span
                    className={cn(
                      "mt-0.5 block truncate text-xs font-medium",
                      app.badge.className
                    )}
                  >
                    {app.badge.label}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
