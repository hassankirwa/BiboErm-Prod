"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchCrmReportsDashboard, type CrmReportDashboard } from "@/lib/api/crm/reports";
import { fetchPipelineDashboard, type PipelineDashboardData } from "@/lib/api/pipeline/dashboard";
import {
  getProjectsDashboard,
  type ProjectsDashboard,
} from "@/lib/api/projects";
import { getQcDashboardSummary, type QcDashboardSummary } from "@/lib/api/qc";

const REFRESH_MS = 60_000;

function hasPermission(permissions: string[], slug: string): boolean {
  return permissions.includes("*") || permissions.includes(slug);
}

function monthStart(): string {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export type WorkspaceAnalyticsData = {
  pipeline: PipelineDashboardData | null;
  projects: ProjectsDashboard | null;
  crm: CrmReportDashboard | null;
  qc: QcDashboardSummary | null;
  lastUpdated: Date | null;
};

export function useWorkspaceAnalytics(permissions: string[]) {
  const [data, setData] = useState<WorkspaceAnalyticsData>({
    pipeline: null,
    projects: null,
    crm: null,
    qc: null,
    lastUpdated: null,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const canCrm =
    hasPermission(permissions, "crm.view") ||
    hasPermission(permissions, "leads.view");
  const canProjects = hasPermission(permissions, "projects.view");
  const canQc = hasPermission(permissions, "qc.view");

  const load = useCallback(async () => {
    setRefreshing(true);

    let pipeline: PipelineDashboardData | null = null;
    let projects: ProjectsDashboard | null = null;
    let crm: CrmReportDashboard | null = null;
    let qc: QcDashboardSummary | null = null;

    const tasks: Promise<void>[] = [];

    if (canCrm || canProjects) {
      tasks.push(
        fetchPipelineDashboard()
          .then((value) => {
            pipeline = value;
          })
          .catch(() => undefined),
      );
    }

    if (canProjects) {
      tasks.push(
        getProjectsDashboard()
          .then((res) => {
            projects = res.data;
          })
          .catch(() => undefined),
      );
    }

    if (canCrm) {
      tasks.push(
        fetchCrmReportsDashboard({ from: monthStart(), to: todayIso() })
          .then((value) => {
            crm = value;
          })
          .catch(() => undefined),
      );
    }

    if (canQc) {
      tasks.push(
        getQcDashboardSummary()
          .then((res) => {
            qc = res.data;
          })
          .catch(() => undefined),
      );
    }

    await Promise.all(tasks);

    setData({
      pipeline,
      projects,
      crm,
      qc,
      lastUpdated: new Date(),
    });
    setLoading(false);
    setRefreshing(false);
  }, [canCrm, canProjects, canQc]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void load();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  return { data, loading, refreshing, refresh: load };
}
