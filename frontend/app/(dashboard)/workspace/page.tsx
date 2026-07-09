"use client";

import { useAuth } from "@/contexts/auth-context";
import { canAccessWorkspaceHub } from "@/lib/auth/redirect";
import Image from "next/image";
import { WorkspaceAppsGrid } from "@/components/workspace/workspace-apps-grid";
import { WorkspaceSummaryWidgets } from "@/components/workspace/workspace-summary-widgets";

export default function WorkspacePage() {
  const { roles } = useAuth();

  if (!canAccessWorkspaceHub(roles)) {
    return null;
  }

  return (
    <div className="relative w-full min-w-0 bg-[#f0f0f0]">
      <div className="relative w-full min-h-full min-w-0">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 min-h-full w-full min-w-0"
        >
          <Image
            src="/background.jpeg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center md:object-[72%_center]"
          />
          <div className="absolute inset-0 bg-[#f5f5f5]/80 md:bg-gradient-to-r md:from-[#f5f5f5]/55 md:via-[#f5f5f5]/20 md:to-transparent" />
        </div>

        <div className="relative z-10 w-full min-w-0">
          <div className="w-full min-w-0 space-y-4 px-3 py-4 pb-6 sm:space-y-5 sm:px-4 sm:py-5 md:px-6 lg:px-8 lg:py-6">
            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Bibo Workspace
              </h1>
              <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                Manage projects, production and operations in one place. Metrics below refresh
                automatically from the backend.
              </p>
            </div>

            <WorkspaceAppsGrid />
            <WorkspaceSummaryWidgets />
          </div>
        </div>
      </div>
    </div>
  );
}
