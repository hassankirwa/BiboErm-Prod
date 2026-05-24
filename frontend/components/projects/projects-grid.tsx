"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MapPin,
  Calendar,
  AlertCircle,
  MoreVertical,
  Eye,
  Edit,
  FileText,
  Trash2,
  Users,
  DollarSign,
} from "lucide-react";
import { mockProjects } from "@/lib/data/projects";
import { mockContacts, mockUsers } from "@/lib/data/crm";

const stageColors: Record<string, string> = {
  awaiting_deposit: "bg-muted text-muted-foreground",
  deposit_received: "bg-info/10 text-info",
  site_assessment: "bg-info/10 text-info",
  design_approval: "bg-info/10 text-info",
  bom_finalized: "bg-info/10 text-info",
  material_check: "bg-warning/10 text-warning",
  materials_reserved: "bg-warning/10 text-warning",
  awaiting_procurement: "bg-warning/10 text-warning",
  materials_ready: "bg-success/10 text-success",
  cutting: "bg-primary/10 text-primary",
  fabrication: "bg-primary/10 text-primary",
  glass_assembly: "bg-primary/10 text-primary",
  qc_pre_installation: "bg-chart-4/10 text-chart-4",
  in_transit: "bg-chart-5/10 text-chart-5",
  installation: "bg-chart-5/10 text-chart-5",
  site_qc: "bg-chart-4/10 text-chart-4",
  snagging: "bg-warning/10 text-warning",
  complete: "bg-success/10 text-success",
};

const priorityColors: Record<string, string> = {
  standard: "bg-secondary text-secondary-foreground",
  urgent: "bg-destructive/10 text-destructive",
  apartment_block: "bg-primary/10 text-primary",
};

function formatStage(stage: string): string {
  return stage
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getClient(clientId: string) {
  return mockContacts.find((c) => c.id === clientId);
}

function getProjectManager(pmId: string) {
  return mockUsers.find((u) => u.id === pmId);
}

export function ProjectsGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {mockProjects.map((project) => {
        const client = getClient(project.clientId);
        const pm = getProjectManager(project.projectManagerId);
        const isDelayed =
          new Date(project.projectedCompletionDate) < new Date() &&
          project.stage !== "complete";
        const daysRemaining = Math.ceil(
          (new Date(project.projectedCompletionDate).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        );

        return (
          <Card key={project.id} className="border-border hover:shadow-md transition-shadow">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {project.name}
                    </h3>
                    {isDelayed && (
                      <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{project.id}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Project
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <FileText className="mr-2 h-4 w-4" />
                      View BOM
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={priorityColors[project.priority]} variant="secondary">
                  {project.priority.replace("_", " ")}
                </Badge>
                <Badge className={stageColors[project.stage]} variant="secondary">
                  {formatStage(project.stage)}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {project.location}
                  {!project.isNairobi && (
                    <Badge variant="outline" className="text-[10px] h-4">
                      Outside Nairobi
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Due: {new Date(project.projectedCompletionDate).toLocaleDateString()}
                  {daysRemaining > 0 && (
                    <span className="text-success">({daysRemaining} days left)</span>
                  )}
                  {daysRemaining < 0 && (
                    <span className="text-destructive">({Math.abs(daysRemaining)} days overdue)</span>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{project.percentComplete}%</span>
                </div>
                <Progress value={project.percentComplete} className="h-1.5" />
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <DollarSign className="h-3.5 w-3.5" />
                  KES {(project.totalValue / 1000).toFixed(0)}K
                </div>
                <div className="text-muted-foreground">
                  Deposit: {Math.round((project.depositAmount / project.totalValue) * 100)}%
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                {client && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                        {getInitials(client.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                      {client.name}
                    </span>
                  </div>
                )}
                {pm && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                      {pm.fullName.split(" ")[0]}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
