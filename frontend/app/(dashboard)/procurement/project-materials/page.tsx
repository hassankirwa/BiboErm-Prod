"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { ProjectMaterialRequisitionBoard } from "@/components/procurement/project-material-requisition-board";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getProjectMaterialShortages,
  type ProjectMaterialShortageEntry,
} from "@/lib/api/projects";

export default function ProcurementProjectMaterialsPage() {
  const [entries, setEntries] = useState<ProjectMaterialShortageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);

    getProjectMaterialShortages()
      .then((response) => {
        setEntries(response.data ?? []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load material shortages.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Project Material Shortages"
        subtitle="Split project materials into lines needing requisitions and lines already linked to requisitions"
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/procurement/requisitions">Requisitions</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/procurement/requisitions/create?tab=project-materials">Create requisition</Link>
            </Button>
          </>
        }
      />
      <div className="space-y-6 p-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8 text-primary" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : entries.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No projects with material shortages right now.
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="actionable">
            <TabsList>
              <TabsTrigger value="actionable">Needs requisition</TabsTrigger>
              <TabsTrigger value="requisitioned">Linked requisitions</TabsTrigger>
            </TabsList>

            <TabsContent value="actionable">
              <ProjectMaterialRequisitionBoard
                entries={entries}
                mode="actionable"
                emptyMessage="All visible project material lines already have open requisitions."
              />
            </TabsContent>

            <TabsContent value="requisitioned">
              <ProjectMaterialRequisitionBoard
                entries={entries}
                mode="requisitioned"
                emptyMessage="No project material lines are currently linked to open requisitions."
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
