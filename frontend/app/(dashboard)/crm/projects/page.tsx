"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Spinner } from "@/components/ui/spinner";
import {
  formatProjectStage,
  listProjects,
  type ProjectSummary,
} from "@/lib/api/projects";
import { projectDetailPath } from "@/lib/projects/paths";
import { Plus } from "lucide-react";

export default function CrmProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    listProjects({ per_page: 50 })
      .then((response) => {
        if (!cancelled) setProjects(response.data ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load projects.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title="CRM Projects"
        subtitle="Projects created from accounts and deals"
        actions={
          <PermissionGate permission="projects.create">
            <Button size="sm" asChild>
              <Link href="/crm/projects/new">
                <Plus className="mr-1 h-4 w-4" />
                New Project
              </Link>
            </Button>
          </PermissionGate>
        }
      />
      <div className="flex-1 space-y-6 overflow-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All projects</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner className="h-8 w-8 text-primary" />
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No projects yet. Create one from an account or deal.
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell>
                          <Link
                            href={projectDetailPath(project.id, "crm")}
                            className="font-medium text-primary hover:underline"
                          >
                            {project.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">{project.reference}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatProjectStage(project.stage)}</Badge>
                        </TableCell>
                        <TableCell className="capitalize">
                          {project.priority.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell>{project.completion_percent}%</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={projectDetailPath(project.id, "crm")}>Open</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
