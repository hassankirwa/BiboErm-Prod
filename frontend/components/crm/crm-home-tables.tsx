"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { cn } from "@/lib/utils";
import { PermissionGate } from "@/components/auth/permission-gate";
import { fetchActivities } from "@/lib/api/crm/activities";
import { fetchFieldDays } from "@/lib/api/crm/field-day";
import { fetchLeads } from "@/lib/api/crm/leads";
import { fetchSiteVisits } from "@/lib/api/crm/site-visits";
import { apiLeadToListRow } from "@/lib/crm-lead-mapper";
import type { ApiActivity, ApiFieldDay } from "@/lib/api/crm/types";

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

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

function EmptyRow({ cols }: { cols: number }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="py-8 text-center text-sm text-muted-foreground">
        No records yet
      </TableCell>
    </TableRow>
  );
}

export function CrmHomeTables() {
  const [tasks, setTasks] = useState<ApiActivity[]>([]);
  const [visits, setVisits] = useState<
    Awaited<ReturnType<typeof fetchSiteVisits>>["data"]
  >([]);
  const [recentLeads, setRecentLeads] = useState<
    ReturnType<typeof apiLeadToListRow>[]
  >([]);
  const [fieldDaysToday, setFieldDaysToday] = useState<ApiFieldDay[]>([]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      fetchActivities({ status: "open", per_page: 5 }),
      fetchSiteVisits({ per_page: 5 }),
      fetchLeads({ per_page: 10 }),
      fetchFieldDays({ field_date: today, per_page: 10 }).catch(() => ({
        data: [] as ApiFieldDay[],
      })),
    ])
      .then(([activitiesRes, visitsRes, leadsRes, fieldDaysRes]) => {
        setTasks(activitiesRes.data ?? []);
        setVisits(visitsRes.data ?? []);
        setRecentLeads((leadsRes.data ?? []).map(apiLeadToListRow));
        setFieldDaysToday(fieldDaysRes.data ?? []);
      })
      .catch(() => {});
  }, []);

  const todaysLeads = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return recentLeads.filter((l) => l.statusKey === "new").slice(0, 5);
  }, [recentLeads]);

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
            {tasks.length === 0 ? (
              <EmptyRow cols={3} />
            ) : (
              tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="max-w-[140px] truncate pl-4 font-medium sm:max-w-none">
                    {task.subject}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(task.due_at)}
                  </TableCell>
                  <TableCell className="pr-4">
                    <Badge variant="secondary" className="font-medium">
                      {task.priority ?? "Medium"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableCard>

      <TableCard title="Upcoming Site Visits" href="/crm/site-visits" linkLabel="View all">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Title</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="pr-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visits.length === 0 ? (
              <EmptyRow cols={3} />
            ) : (
              visits.map((visit) => (
                <TableRow key={visit.id}>
                  <TableCell className="max-w-[140px] truncate pl-4 font-medium sm:max-w-none">
                    {visit.title ?? visit.visit_number ?? `Visit #${visit.id}`}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(visit.visit_date)}
                  </TableCell>
                  <TableCell className="pr-4 capitalize text-muted-foreground">
                    {(visit.status ?? "scheduled").replace(/_/g, " ")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableCard>

      <PermissionGate permission="field_day.view">
        <TableCard
          title="Field Officers Today"
          href="/crm/field-day"
          linkLabel="Open field day"
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Officer</TableHead>
                <TableHead>Pins</TableHead>
                <TableHead className="pr-4">Leads</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fieldDaysToday.length === 0 ? (
                <EmptyRow cols={3} />
              ) : (
                fieldDaysToday.map((fieldDay) => {
                  const pins = fieldDay.pins ?? [];
                  const leadsFromPins = pins.filter((pin) => pin.lead_id).length;
                  return (
                    <TableRow key={fieldDay.id}>
                      <TableCell className="max-w-[140px] truncate pl-4 font-medium sm:max-w-none">
                        {fieldDay.field_officer?.name ??
                          `Officer #${fieldDay.field_officer_id}`}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {pins.length}
                      </TableCell>
                      <TableCell className="pr-4 text-muted-foreground">
                        {leadsFromPins}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableCard>
      </PermissionGate>

      <TableCard title="Today's Leads" href="/crm/leads" linkLabel="View all">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Lead Name</TableHead>
              <TableHead className="hidden sm:table-cell">Source</TableHead>
              <TableHead className="hidden md:table-cell">Owner</TableHead>
              <TableHead className="pr-4">Stage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {todaysLeads.length === 0 ? (
              <EmptyRow cols={4} />
            ) : (
              todaysLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="pl-4 font-medium">
                    <Link href={`/crm/leads/${lead.id}`} className="text-primary hover:underline">
                      {lead.leadName}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {lead.source}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {lead.owner}
                  </TableCell>
                  <TableCell className="pr-4">
                    <Badge variant="secondary" className={cn("font-medium", lead.stageClassName)}>
                      {lead.stage}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableCard>

      <TableCard title="Recent Leads" href="/crm/leads" linkLabel="View all">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Lead / Company</TableHead>
              <TableHead className="hidden sm:table-cell">Source</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="hidden md:table-cell pr-4">Owner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentLeads.length === 0 ? (
              <EmptyRow cols={4} />
            ) : (
              recentLeads.slice(0, 5).map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="max-w-[120px] truncate pl-4 font-medium sm:max-w-none">
                    <Link href={`/crm/leads/${lead.id}`} className="text-primary hover:underline">
                      {lead.leadName}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {lead.source}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("font-medium", lead.stageClassName)}>
                      {lead.stage}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap pr-4 text-muted-foreground md:table-cell">
                    {lead.owner}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableCard>
    </div>
  );
}
