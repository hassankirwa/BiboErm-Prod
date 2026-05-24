import { AppHeader } from "@/components/app-header";
import { ProjectsStats } from "@/components/projects/projects-stats";
import { ProjectsFilters } from "@/components/projects/projects-filters";
import { ProjectsGrid } from "@/components/projects/projects-grid";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function ProjectsPage() {
  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Projects"
        subtitle="Manage all your projects"
        actions={
          <Button size="sm" className="h-8 gap-1.5">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        }
      />
      <div className="min-w-0 w-full">
        <div className="space-y-6 p-6">
          <ProjectsStats />
          <ProjectsFilters />
          <ProjectsGrid />
        </div>
      </div>
    </div>
  );
}
