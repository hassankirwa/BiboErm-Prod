import { AppHeader } from "@/components/app-header";
import { ProjectsPipeline } from "@/components/projects/projects-pipeline";

export default function ProjectsPipelinePage() {
  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Project Pipeline"
        subtitle="Kanban view of active projects by stage, including reserved materials awaiting production start"
      />
      <div className="min-w-0 w-full">
        <div className="space-y-6 p-6">
          <ProjectsPipeline linkToDetail />
        </div>
      </div>
    </div>
  );
}
