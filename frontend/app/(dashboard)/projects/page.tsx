import { AppHeader } from "@/components/app-header";
import { ProjectsOverview } from "@/components/projects/projects-overview";

export default function ProjectsPage() {
  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Projects"
        subtitle="Track progress, BOM, and designs for sales-created projects"
      />
      <div className="min-w-0 w-full">
        <div className="space-y-6 p-6">
          <ProjectsOverview />
        </div>
      </div>
    </div>
  );
}
