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
import { MoreHorizontal, Eye, AlertTriangle } from "lucide-react";
import {
  QC_CONTEXT_LABELS,
  type QcInspection,
  type QcInspectionResult,
} from "@/lib/api/qc";

type QCInspectionsListProps = {
  inspections: QcInspection[];
  loading?: boolean;
  emptyMessage?: string;
};

const getResultBadge = (result: QcInspectionResult | string) => {
  switch (result) {
    case "pass":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Pass</Badge>;
    case "fail":
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Fail</Badge>;
    case "conditional_pass":
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Conditional</Badge>;
    case "skipped":
      return <Badge variant="secondary">Skipped</Badge>;
    case "pending":
      return <Badge variant="outline">Pending</Badge>;
    default:
      return <Badge variant="secondary">{result}</Badge>;
  }
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function QCInspectionsList({
  inspections,
  loading,
  emptyMessage = "No inspections found.",
}: QCInspectionsListProps) {
  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Loading inspections...
        </CardContent>
      </Card>
    );
  }

  if (inspections.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
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
              <TableHead className="w-[140px]">Reference</TableHead>
              <TableHead>Opening</TableHead>
              <TableHead>Context</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Inspector</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Defects</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inspections.map((inspection) => {
              const contextLabel =
                QC_CONTEXT_LABELS[inspection.context as keyof typeof QC_CONTEXT_LABELS] ??
                inspection.context;
              const date = inspection.completed_at ?? inspection.created_at;

              return (
                <TableRow key={inspection.id}>
                  <TableCell>
                    <Link
                      href={`/qc/inspections/${inspection.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {inspection.reference}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {inspection.opening_code ? (
                      <Badge variant="secondary" className="font-normal">
                        {inspection.opening_code}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {contextLabel}
                      {inspection.stage && inspection.stage !== inspection.context
                        ? ` · ${inspection.stage}`
                        : ""}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate">
                    {inspection.project?.name ?? (
                      inspection.goods_receipt_id ? (
                        <Link
                          href={`/qc/receiving?grn_id=${inspection.goods_receipt_id}`}
                          className="text-muted-foreground hover:text-primary"
                        >
                          GRN #{inspection.goods_receipt_id}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {inspection.inspector?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(date)}</TableCell>
                  <TableCell>{getResultBadge(inspection.result)}</TableCell>
                  <TableCell>
                    {(inspection.defects_count ?? 0) > 0 ? (
                      <span className="flex items-center gap-1 text-amber-600 text-sm">
                        <AlertTriangle className="h-3 w-3" />
                        {inspection.defects_count}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
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
                          <Link href={`/qc/inspections/${inspection.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View details
                          </Link>
                        </DropdownMenuItem>
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
