"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { mockProductionOrders, mockProjects } from "@/lib/mock-data";
import { Calendar, Users, ChevronRight, AlertCircle } from "lucide-react";
import type { ProductionStage } from "@/lib/types";

const stages: { id: ProductionStage; label: string; color: string }[] = [
  { id: "scheduled", label: "Scheduled", color: "bg-muted" },
  { id: "material_prep", label: "Material Prep", color: "bg-info/20" },
  { id: "cutting", label: "Cutting", color: "bg-warning/20" },
  { id: "fabrication", label: "Fabrication", color: "bg-primary/20" },
  { id: "glass_assembly", label: "Glass Assembly", color: "bg-chart-5/20" },
  { id: "qc_post_fabrication", label: "QC Check", color: "bg-success/20" },
  { id: "ready_for_dispatch", label: "Ready", color: "bg-success/20" },
];

const stageIndex: Record<string, number> = {
  scheduled: 0,
  material_prep: 1,
  qc_pre_check: 2,
  cutting: 3,
  fabrication: 4,
  sash_fabrication: 5,
  glass_assembly: 6,
  final_assembly: 7,
  qc_post_fabrication: 8,
  ready_for_dispatch: 9,
};

function formatStage(stage: string): string {
  return stage
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getProject(projectId: string) {
  return mockProjects.find((p) => p.id === projectId);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ProductionSchedule() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Active Production Orders</h3>
        <Button variant="outline" size="sm">
          View All Orders
        </Button>
      </div>

      <div className="grid gap-4">
        {mockProductionOrders.map((order) => {
          const project = getProject(order.projectId);
          const progress = Math.round(
            ((stageIndex[order.stage] || 0) / 9) * 100
          );
          const isDelayed = order.actualStart && order.actualStart > order.scheduledStart;

          return (
            <Card key={order.id} className="border-border">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-semibold">
                        {project?.name || "Unknown Project"}
                      </CardTitle>
                      {isDelayed && (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {order.id} | {project?.id}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      order.stage === "cutting"
                        ? "bg-warning/10 text-warning"
                        : order.stage === "fabrication"
                        ? "bg-primary/10 text-primary"
                        : "bg-info/10 text-info"
                    }
                  >
                    {formatStage(order.stage)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {/* Stage Pipeline */}
                <div className="flex items-center gap-1 overflow-x-auto py-2">
                  {stages.map((stage, i) => {
                    const isActive = stage.id === order.stage;
                    const isPast = stageIndex[order.stage] > stageIndex[stage.id];
                    return (
                      <div key={stage.id} className="flex items-center">
                        <div
                          className={`px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : isPast
                              ? "bg-success/20 text-success"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {stage.label}
                        </div>
                        {i < stages.length - 1 && (
                          <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Schedule and Team */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {new Date(order.scheduledStart).toLocaleDateString()} -{" "}
                        {new Date(order.scheduledEnd).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <div className="flex -space-x-2">
                      {order.cuttingTeam.slice(0, 3).map((memberId, i) => (
                        <Avatar key={i} className="h-6 w-6 border-2 border-background">
                          <AvatarFallback className="bg-primary/10 text-primary text-[8px]">
                            {getInitials(memberId)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {order.cuttingTeam.length > 3 && (
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground border-2 border-background">
                          +{order.cuttingTeam.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {order.notes && (
                  <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    {order.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
