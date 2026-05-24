import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MapPin, CheckCircle, Clock } from "lucide-react";
import { mockActivities } from "@/lib/data/dashboard";

const activityIcons = {
  call: Phone,
  email: Mail,
  meeting: Clock,
  task: CheckCircle,
  site_visit: MapPin,
};

export function RecentActivities() {
  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">Recent Activities</CardTitle>
        <a href="/crm/activities" className="text-xs text-primary hover:underline">
          View all
        </a>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockActivities.map((activity) => {
            const Icon = activityIcons[activity.type];
            const isCompleted = !!activity.completedAt;
            const isPastDue =
              !isCompleted &&
              activity.dueDate &&
              new Date(activity.dueDate) < new Date();

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 pb-4 border-b border-border last:border-0 last:pb-0"
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-md ${
                    isCompleted
                      ? "bg-success/10 text-success"
                      : isPastDue
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {activity.subject}
                  </p>
                  {activity.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {activity.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge
                      variant={isCompleted ? "secondary" : isPastDue ? "destructive" : "outline"}
                      className="text-[10px] h-5"
                    >
                      {activity.type.replace("_", " ")}
                    </Badge>
                    {activity.dueDate && !isCompleted && (
                      <span className="text-[10px] text-muted-foreground">
                        Due: {new Date(activity.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {isCompleted && (
                      <span className="text-[10px] text-success">Completed</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
