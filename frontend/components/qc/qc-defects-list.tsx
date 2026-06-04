"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { MoreHorizontal, Eye } from "lucide-react";
import {
  QC_CONTEXT_LABELS,
  type QcDefect,
  type QcDefectSeverity,
  type QcDefectStatus,
} from "@/lib/api/qc";

type QcDefectsListProps = {
  defects: QcDefect[];
  loading?: boolean;
  onResolve?: (defect: QcDefect) => void;
  canResolve?: boolean;
};

const getSeverityBadge = (severity: QcDefectSeverity | string) => {
  switch (severity) {
    case "critical":
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Critical</Badge>;
    case "major":
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Major</Badge>;
    case "minor":
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Minor</Badge>;
    default:
      return <Badge variant="secondary">{severity}</Badge>;
  }
};

const getStatusBadge = (status: QcDefectStatus | string) => {
  switch (status) {
    case "open":
      return <Badge variant="outline" className="border-red-200 text-red-700">Open</Badge>;
    case "in_progress":
      return <Badge variant="outline" className="border-amber-200 text-amber-700">In progress</Badge>;
    case "resolved":
      return <Badge variant="outline" className="border-green-200 text-green-700">Resolved</Badge>;
    case "waived":
      return <Badge variant="outline">Waived</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export function QcDefectsList({
  defects,
  loading,
  onResolve,
  canResolve,
}: QcDefectsListProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Loading defects...
        </CardContent>
      </Card>
    );
  }

  if (defects.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No defects found.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Description</TableHead>
              <TableHead>Inspection</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reported</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {defects.map((defect) => {
              const inspection = defect.inspection;
              const contextLabel = inspection?.context
                ? (QC_CONTEXT_LABELS[inspection.context as keyof typeof QC_CONTEXT_LABELS] ??
                  inspection.context)
                : null;

              return (
                <TableRow key={defect.id}>
                  <TableCell className="max-w-[240px] truncate font-medium">
                    {defect.description}
                  </TableCell>
                  <TableCell>
                    {inspection ? (
                      <div className="text-sm">
                        <Link
                          href={`/qc/inspections/${inspection.id}`}
                          className="text-primary hover:underline"
                        >
                          {inspection.reference}
                        </Link>
                        {contextLabel && (
                          <p className="text-xs text-muted-foreground">{contextLabel}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">#{defect.inspection_id}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[160px] truncate">
                    {inspection?.project?.name ?? "—"}
                  </TableCell>
                  <TableCell>{getSeverityBadge(defect.severity)}</TableCell>
                  <TableCell>{getStatusBadge(defect.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {defect.reported_by_user?.name ??
                      (defect.created_at
                        ? new Date(defect.created_at).toLocaleDateString()
                        : "—")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/qc/inspections/${defect.inspection_id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View inspection
                          </Link>
                        </DropdownMenuItem>
                        {canResolve && onResolve && defect.status !== "resolved" && defect.status !== "waived" && (
                          <DropdownMenuItem onClick={() => onResolve(defect)}>
                            Mark resolved
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
