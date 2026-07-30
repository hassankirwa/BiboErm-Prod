"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import {
  fetchWorkspaceHubBadges,
  type WorkspaceHubBadges,
} from "@/lib/api/workspace/hub-badges";
import { filterAppsByPermissions, workspaceApps } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function WorkspaceAppsGrid() {
  const { permissions, roles } = useAuth();
  const apps = filterAppsByPermissions(workspaceApps, permissions, roles);
  const [badges, setBadges] = useState<WorkspaceHubBadges>({});

  useEffect(() => {
    let cancelled = false;

    fetchWorkspaceHubBadges()
      .then((res) => {
        if (!cancelled) {
          setBadges(res.data ?? {});
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBadges({});
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="min-w-0 w-full">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Your Apps</h2>
      <div className="grid w-full min-w-0 grid-cols-1 gap-2.5 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
        {apps.map((app) => {
          const Icon = app.icon;
          const liveBadge = app.badgeKey ? badges[app.badgeKey] : undefined;
          const badge = liveBadge
            ? { label: liveBadge.label, className: liveBadge.className }
            : app.badge;

          return (
            <Link
              key={app.id}
              href={app.href}
              className="group flex min-h-[52px] min-w-0 w-full items-center gap-3 rounded-[10px] border border-border/70 bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:scale-[0.99]"
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] sm:h-9 sm:w-9",
                  app.iconClassName
                )}
              >
                <Icon className="h-5 w-5 sm:h-[18px] sm:w-[18px]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-medium leading-tight text-foreground">
                  {app.name}
                </span>
                {badge && (
                  <span
                    className={cn(
                      "mt-0.5 block text-xs font-medium leading-tight sm:text-[11px]",
                      badge.className
                    )}
                  >
                    {badge.label}
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
