import Image from "next/image";
import { WorkspaceAppsGrid } from "@/components/workspace/workspace-apps-grid";
import { WorkspaceSummaryWidgets } from "@/components/workspace/workspace-summary-widgets";

export default function WorkspacePage() {
  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)] flex-col">
      <Image
        src="/background.jpeg"
        alt=""
        fill
        className="object-cover object-center opacity-20"
        priority
      />
      <div className="relative flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-3 lg:px-5 lg:py-4">
          <p className="text-sm text-muted-foreground">
            Manage projects, production and operations in one place.
          </p>

          <WorkspaceAppsGrid />
          <WorkspaceSummaryWidgets />
        </div>
      </div>
    </div>
  );
}
