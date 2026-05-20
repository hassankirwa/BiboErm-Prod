import type { ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  crmOpenTasks,
  crmUpcomingMeetings,
  crmTodaysLeads,
  crmLeadsThisMonth,
} from "@/lib/crm-home-data";
import { cn } from "@/lib/utils";

const priorityStyles = {
  High: "bg-red-100 text-red-700 hover:bg-red-100",
  Medium: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  Low: "bg-slate-100 text-slate-600 hover:bg-slate-100",
} as const;

const leadStatusStyles = {
  New: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  Contacted: "bg-orange-100 text-orange-700 hover:bg-orange-100",
  Qualified: "bg-green-100 text-green-700 hover:bg-green-100",
} as const;

const stageStyles = {
  New: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  Qualified: "bg-green-100 text-green-700 hover:bg-green-100",
  Proposal: "bg-violet-100 text-violet-700 hover:bg-violet-100",
  Negotiation: "bg-amber-100 text-amber-700 hover:bg-amber-100",
} as const;

function TableCard({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: ReactNode;
}) {
  return (
    <Card className="flex min-h-[280px] min-w-0 flex-col rounded-[10px] border-border/70 bg-card shadow-sm">
      <CardHeader className="flex shrink-0 flex-row flex-wrap items-center justify-between gap-2 space-y-0 px-4 pb-2 pt-4">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <Link href={href} className="shrink-0 text-xs font-medium text-primary hover:underline">
          {linkLabel}
        </Link>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-x-auto px-0 pb-0 pt-0">
        {children}
      </CardContent>
    </Card>
  );
}

export function CrmHomeTables() {
  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
      <TableCard title="My Open Tasks" href="/crm/activities" linkLabel="View all">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Task Subject</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="pr-4">Priority</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {crmOpenTasks.map((task) => (
              <TableRow key={task.subject}>
                <TableCell className="max-w-[140px] truncate pl-4 font-medium sm:max-w-none">
                  {task.subject}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {task.dueDate}
                </TableCell>
                <TableCell className="pr-4">
                  <Badge
                    variant="secondary"
                    className={cn("font-medium", priorityStyles[task.priority])}
                  >
                    {task.priority}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>

      <TableCard title="Upcoming Meetings" href="/crm/field-day" linkLabel="View all">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Title / Client</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="pr-4">Assigned To</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {crmUpcomingMeetings.map((meeting) => (
              <TableRow key={meeting.title}>
                <TableCell className="max-w-[140px] truncate pl-4 font-medium sm:max-w-none">
                  {meeting.title}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {meeting.time}
                </TableCell>
                <TableCell className="pr-4 text-muted-foreground">{meeting.assignedTo}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>

      <TableCard title="Today's Leads" href="/crm/leads" linkLabel="View all">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Lead Name</TableHead>
              <TableHead className="hidden sm:table-cell">Source</TableHead>
              <TableHead className="hidden md:table-cell">Assigned To</TableHead>
              <TableHead className="pr-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {crmTodaysLeads.map((lead) => (
              <TableRow key={lead.name}>
                <TableCell className="pl-4 font-medium">{lead.name}</TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {lead.source}
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {lead.assignedTo}
                </TableCell>
                <TableCell className="pr-4">
                  <Badge
                    variant="secondary"
                    className={cn("font-medium", leadStatusStyles[lead.status])}
                  >
                    {lead.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>

      <TableCard title="Leads This Month" href="/crm/leads" linkLabel="View all">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Lead / Company</TableHead>
              <TableHead className="hidden sm:table-cell">Source</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="hidden md:table-cell pr-4">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {crmLeadsThisMonth.map((lead) => (
              <TableRow key={lead.name}>
                <TableCell className="max-w-[120px] truncate pl-4 font-medium sm:max-w-none">
                  {lead.name}
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {lead.source}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn("font-medium", stageStyles[lead.stage])}
                  >
                    {lead.stage}
                  </Badge>
                </TableCell>
                <TableCell className="hidden whitespace-nowrap pr-4 text-muted-foreground md:table-cell">
                  {lead.created}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>
    </div>
  );
}
