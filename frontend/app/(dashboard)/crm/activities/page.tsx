"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Search,
  Plus,
  MoreHorizontal,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  Filter,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { fetchActivities, type ApiActivity } from "@/lib/api/crm/activities";
import { contactDisplayName } from "@/lib/api/crm/contacts";
import { getUserInitials } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";

function getStatusVariant(
  status: string,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status.toLowerCase()) {
    case "completed":
      return "default";
    case "scheduled":
      return "secondary";
    case "in_progress":
      return "outline";
    default:
      return "outline";
  }
}

function getTypeIcon(type: string) {
  switch (type.toLowerCase()) {
    case "call":
      return <Phone className="h-4 w-4" />;
    case "email":
      return <Mail className="h-4 w-4" />;
    case "meeting":
      return <Calendar className="h-4 w-4" />;
    default:
      return <CheckCircle2 className="h-4 w-4" />;
  }
}

function activityType(activity: ApiActivity): string {
  return activity.activity_type ?? activity.type ?? "task";
}

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<ApiActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchActivities({ per_page: 200 })
      .then((response) => {
        if (!cancelled) setActivities(response.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Failed to load activities.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (typeFilter === "all") return activities;
    return activities.filter(
      (a) => activityType(a).toLowerCase() === typeFilter,
    );
  }, [activities, typeFilter]);

  const today = new Date().toDateString();
  const stats = useMemo(() => {
    const todayActivities = activities.filter(
      (a) => a.due_at && new Date(a.due_at).toDateString() === today,
    );
    const overdue = activities.filter(
      (a) =>
        a.due_at &&
        new Date(a.due_at) < new Date() &&
        a.status !== "completed",
    );
    const completedToday = activities.filter(
      (a) =>
        a.completed_at &&
        new Date(a.completed_at).toDateString() === today,
    );
    return {
      today: todayActivities.length,
      overdue: overdue.length,
      completedToday: completedToday.length,
      total: activities.length,
    };
  }, [activities, today]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Activities</h1>
          <p className="text-sm text-muted-foreground">
            Track calls, meetings, emails and tasks
          </p>
        </div>
        <Button className="rounded-[5px]">
          <Plus className="h-4 w-4 mr-2" />
          Log Activity
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-[5px]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today&apos;s Activities</p>
                <p className="text-2xl font-semibold">{stats.today}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[5px]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-semibold text-destructive">
                  {stats.overdue}
                </p>
              </div>
              <Clock className="h-8 w-8 text-destructive/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[5px]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed Today</p>
                <p className="text-2xl font-semibold text-success">
                  {stats.completedToday}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[5px]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-semibold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[5px]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">All Activities</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  className="pl-9 w-64 h-9 rounded-[5px]"
                  disabled
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32 h-9 rounded-[5px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="call">Calls</SelectItem>
                  <SelectItem value="meeting">Meetings</SelectItem>
                  <SelectItem value="email">Emails</SelectItem>
                  <SelectItem value="task">Tasks</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="rounded-[5px]">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner className="h-8 w-8 text-primary" />
            </div>
          ) : error ? (
            <p className="text-center py-8 text-sm text-destructive">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">
              No activities found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((activity) => {
                  const type = activityType(activity);
                  const contactName = activity.contact
                    ? contactDisplayName(activity.contact)
                    : activity.lead?.contact_person_name ?? "-";
                  const accountName =
                    activity.contact?.account?.name ??
                    activity.lead?.account_name ??
                    "-";
                  const assigneeName = activity.assignee?.name ?? "-";

                  return (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-[5px] bg-muted flex items-center justify-center">
                            {getTypeIcon(type)}
                          </div>
                          <span className="text-sm capitalize">{type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {activity.subject}
                      </TableCell>
                      <TableCell>{contactName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {accountName}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getUserInitials(assigneeName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{assigneeName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {activity.due_at
                          ? new Date(activity.due_at).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            activity.priority === "high"
                              ? "destructive"
                              : activity.priority === "medium"
                                ? "default"
                                : "secondary"
                          }
                          className="rounded-[5px] capitalize"
                        >
                          {activity.priority ?? "medium"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusVariant(activity.status)}
                          className="rounded-[5px]"
                        >
                          {formatStatus(activity.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>Edit Activity</DropdownMenuItem>
                            <DropdownMenuItem>Mark Complete</DropdownMenuItem>
                            <DropdownMenuItem>Reschedule</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
