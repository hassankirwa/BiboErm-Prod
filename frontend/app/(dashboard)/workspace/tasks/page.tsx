import { AppHeader } from "@/components/app-header";
import { WorkspaceTasksView } from "@/components/workspace/workspace-tasks-view";

export default function WorkspaceTasksPage() {
  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Tasks"
        subtitle="Cross-module tasks assigned to you — visits, meetings, projects, and more."
      />
      <div className="p-6">
        <WorkspaceTasksView />
      </div>
    </div>
  );
}
