import { AppHeader } from "@/components/app-header";
import { Card, CardContent } from "@/components/ui/card";

export default function WorkspaceTasksPage() {
  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Tasks"
        subtitle="Cross-module tasks assigned to you."
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            This module is coming soon.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
