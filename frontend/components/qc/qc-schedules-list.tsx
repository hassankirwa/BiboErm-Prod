"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  QC_CONTEXT_LABELS,
  type QcInspectionSchedule,
} from "@/lib/api/qc";

type QcSchedulesListProps = {
  schedules: QcInspectionSchedule[];
  loading?: boolean;
  onEdit?: (schedule: QcInspectionSchedule) => void;
};

export function QcSchedulesList({ schedules, loading, onEdit }: QcSchedulesListProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Loading schedules...
        </CardContent>
      </Card>
    );
  }

  if (schedules.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No schedules configured.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Context</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Next due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.map((schedule) => (
              <TableRow key={schedule.id}>
                <TableCell className="font-medium">{schedule.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {QC_CONTEXT_LABELS[schedule.context] ?? schedule.context}
                  </Badge>
                </TableCell>
                <TableCell>
                  {schedule.frequency}
                  {schedule.frequency_interval > 1 ? ` ×${schedule.frequency_interval}` : ""}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(schedule.next_due_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge variant={schedule.is_active ? "default" : "secondary"}>
                    {schedule.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {onEdit && (
                    <Button variant="ghost" size="sm" onClick={() => onEdit(schedule)}>
                      Edit
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
