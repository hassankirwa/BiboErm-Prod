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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, CheckCircle, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

const ncrs = [
  {
    id: "NCR-2024-0034",
    title: "Aluminum frame dimension variance",
    project: "Downtown Mall Extension",
    severity: "major",
    status: "in_progress",
    assignee: "John Smith",
    initials: "JS",
    raisedDate: "2024-01-15",
    dueDate: "2024-01-22",
    progress: 60,
  },
  {
    id: "NCR-2024-0033",
    title: "Steel bracket welding defect",
    project: "Airport Terminal 3",
    severity: "critical",
    status: "open",
    assignee: "Ahmed Hassan",
    initials: "AH",
    raisedDate: "2024-01-14",
    dueDate: "2024-01-17",
    progress: 0,
  },
  {
    id: "NCR-2024-0032",
    title: "Glazing unit seal issue",
    project: "Downtown Mall Extension",
    severity: "minor",
    status: "in_progress",
    assignee: "Sarah Chen",
    initials: "SC",
    raisedDate: "2024-01-12",
    dueDate: "2024-01-20",
    progress: 80,
  },
  {
    id: "NCR-2024-0031",
    title: "Glass panel coating defect",
    project: "Marina Bay Tower",
    severity: "major",
    status: "resolved",
    assignee: "Lisa Wong",
    initials: "LW",
    raisedDate: "2024-01-10",
    dueDate: "2024-01-18",
    progress: 100,
  },
  {
    id: "NCR-2024-0030",
    title: "Bracket mounting hole misalignment",
    project: "Skyline Residences",
    severity: "minor",
    status: "closed",
    assignee: "Mohamed Ali",
    initials: "MA",
    raisedDate: "2024-01-08",
    dueDate: "2024-01-15",
    progress: 100,
  },
];

const getSeverityBadge = (severity: string) => {
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

const getStatusBadge = (status: string) => {
  switch (status) {
    case "open":
      return <Badge variant="outline" className="border-red-200 text-red-700">Open</Badge>;
    case "in_progress":
      return <Badge variant="outline" className="border-amber-200 text-amber-700">In Progress</Badge>;
    case "resolved":
      return <Badge variant="outline" className="border-green-200 text-green-700">Resolved</Badge>;
    case "closed":
      return <Badge variant="outline" className="border-muted-foreground text-muted-foreground">Closed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export function NCRList() {
  return (
    <Card className="border-border">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[130px]">NCR ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="w-[120px]">Progress</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ncrs.map((ncr) => (
              <TableRow key={ncr.id}>
                <TableCell className="font-medium text-primary">
                  {ncr.id}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {ncr.title}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {ncr.project}
                </TableCell>
                <TableCell>{getSeverityBadge(ncr.severity)}</TableCell>
                <TableCell>{getStatusBadge(ncr.status)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {ncr.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{ncr.assignee}</span>
                  </div>
                </TableCell>
                <TableCell className={`text-sm ${
                  new Date(ncr.dueDate) < new Date() && ncr.status !== "closed" && ncr.status !== "resolved"
                    ? "text-red-600 font-medium"
                    : "text-muted-foreground"
                }`}>
                  {new Date(ncr.dueDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={ncr.progress} className="h-2 w-16" />
                    <span className="text-xs text-muted-foreground w-8">
                      {ncr.progress}%
                    </span>
                  </div>
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
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Add Comment
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Resolved
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
