import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div className="flex flex-col">
      <AppHeader
        title="Notifications"
        subtitle="Alerts and updates across your operations"
      />
      <div className="flex-1 overflow-auto p-6">
        <Card className="max-w-lg rounded-[10px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-5 w-5 text-primary" />
              No new notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            You&apos;re all caught up. New alerts from CRM, production, and
            inventory will appear here.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
