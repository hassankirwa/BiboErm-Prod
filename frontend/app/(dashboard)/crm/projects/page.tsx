import Link from "next/link";
import { Plus } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { PermissionGate } from "@/components/auth/permission-gate";
import { ProjectsOverview } from "@/components/projects/projects-overview";
import { Button } from "@/components/ui/button";

function CrmProjectsContent() {
  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="My Projects"
        subtitle="Track progress on projects you created or own as sales rep"
        actions={
          <PermissionGate permission="projects.create">
            <Button size="sm" asChild>
              <Link href="/crm/projects/new">
                <Plus className="mr-1 h-4 w-4" />
                New Project
              </Link>
            </Button>
          </PermissionGate>
        }
      />
      <div className="min-w-0 w-full">
        <div className="space-y-6 p-6">
          <ProjectsOverview viewMode="crm" />
        </div>
      </div>
    </div>
  );
}

export default function CrmProjectsPage() {
  return (
    <PermissionGate
      permission="projects.view"
      fallback={
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            You do not have permission to view projects.
          </p>
        </div>
      }
    >
      <CrmProjectsContent />
    </PermissionGate>
  );
}
