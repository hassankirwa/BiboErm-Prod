import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { ProjectsPipeline } from "@/components/projects/projects-pipeline";
import { ChevronLeft } from "lucide-react";

export default function WarehouseProjectsPage() {
  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Project Pipeline"
        subtitle="Track projects awaiting material checks, reservations, and production start"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/warehouse/inventory">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Inventory
            </Link>
          </Button>
        }
      />
      <div className="min-w-0 w-full">
        <div className="space-y-6 p-6">
          <ProjectsPipeline linkToDetail />
        </div>
      </div>
    </div>
  );
}
