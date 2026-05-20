import Image from "next/image";
import { WorkspaceAppsGrid } from "@/components/workspace/workspace-apps-grid";
import { WorkspaceSummaryWidgets } from "@/components/workspace/workspace-summary-widgets";

export default function WorkspacePage() {
  return (
    <div className="relative h-full min-h-0 w-full max-w-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#f0f0f0]">
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
          {/* Stronger overlay on small screens for readability */}
          <div className="absolute inset-0 bg-[#f5f5f5]/80 md:bg-gradient-to-r md:from-[#f5f5f5]/55 md:via-[#f5f5f5]/20 md:to-transparent" />
        </div>

        <div className="relative z-10 w-full min-w-0">
          <div className="w-full min-w-0 space-y-4 px-3 py-4 pb-6 sm:space-y-5 sm:px-4 sm:py-5 md:px-6 lg:px-8 lg:py-6">
            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Bibo Workspace
              </h1>
              <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                Manage projects, production and operations in one place.
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
