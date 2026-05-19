"use client";

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
import { MoreHorizontal, Eye, Edit, FileText, AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const inspections = [
  {
    id: "QC-2024-0248",
    project: "Marina Bay Tower",
    stage: "Post-Fabrication",
    item: "Glass Panel GP-2401",
    inspector: "Ahmed Hassan",
    initials: "AH",
    date: "2024-01-15",
    result: "pass",
    ncr: null,
  },
  {
    id: "QC-2024-0247",
    project: "Downtown Mall Extension",
    stage: "Pre-Installation",
    item: "Aluminum Frame AF-1205",
    inspector: "Sarah Chen",
    initials: "SC",
    date: "2024-01-15",
    result: "conditional",
    ncr: "NCR-2024-0034",
  },
  {
    id: "QC-2024-0246",
    project: "Skyline Residences",
    stage: "Site Installation",
    item: "Curtain Wall CW-3B",
    inspector: "Mohamed Ali",
    initials: "MA",
    date: "2024-01-14",
    result: "pass",
    ncr: null,
  },
  {
    id: "QC-2024-0245",
    project: "Airport Terminal 3",
    stage: "Pre-Production",
    item: "Steel Bracket SB-890",
    inspector: "Lisa Wong",
    initials: "LW",
    date: "2024-01-14",
    result: "fail",
    ncr: "NCR-2024-0033",
  },
  {
    id: "QC-2024-0244",
    project: "Marina Bay Tower",
    stage: "Snagging",
    item: "Zone A Installation",
    inspector: "Ahmed Hassan",
    initials: "AH",
    date: "2024-01-13",
    result: "pass",
    ncr: null,
  },
  {
    id: "QC-2024-0243",
    project: "Tech Hub Building",
    stage: "Post-Fabrication",
    item: "Composite Panel CP-445",
    inspector: "Sarah Chen",
    initials: "SC",
    date: "2024-01-13",
    result: "pass",
    ncr: null,
  },
  {
    id: "QC-2024-0242",
    project: "Downtown Mall Extension",
    stage: "Site Installation",
    item: "Glazing Unit GU-78",
    inspector: "Mohamed Ali",
    initials: "MA",
    date: "2024-01-12",
    result: "conditional",
    ncr: "NCR-2024-0032",
  },
];

const getResultBadge = (result: string) => {
  switch (result) {
    case "pass":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Pass</Badge>;
    case "fail":
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Fail</Badge>;
    case "conditional":
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Conditional</Badge>;
    default:
      return <Badge variant="secondary">{result}</Badge>;
  }
};

const getStageBadge = (stage: string) => {
  return <Badge variant="outline" className="font-normal">{stage}</Badge>;
};

export function QCInspectionsList() {
  return (
    <Card className="border-border">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[140px]">Inspection ID</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Inspector</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>NCR</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inspections.map((inspection) => (
              <TableRow key={inspection.id}>
                <TableCell className="font-medium text-primary">
                  {inspection.id}
                </TableCell>
                <TableCell>{inspection.project}</TableCell>
                <TableCell>{getStageBadge(inspection.stage)}</TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {inspection.item}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {inspection.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{inspection.inspector}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(inspection.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell>{getResultBadge(inspection.result)}</TableCell>
                <TableCell>
                  {inspection.ncr ? (
                    <Button variant="link" className="h-auto p-0 text-amber-600 gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {inspection.ncr}
                    </Button>
                  ) : (
                    <span className="text-muted-foreground">-</span>
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
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Report
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
