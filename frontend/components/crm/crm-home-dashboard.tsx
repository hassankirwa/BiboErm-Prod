"use client";

import { useEffect, useState } from "react";
import { CrmHomeStats } from "@/components/crm/crm-home-stats";
import { CrmHomeTables } from "@/components/crm/crm-home-tables";
import { CrmPipelineCards } from "@/components/crm/crm-pipeline-cards";
import { fetchCrmHomeSummary, type CrmHomeSummary } from "@/lib/api/crm/home";
import {
  fetchPipelineDashboard,
  type PipelineDashboardData,
} from "@/lib/api/pipeline/dashboard";

export function CrmHomeDashboard() {
  const [summary, setSummary] = useState<CrmHomeSummary | null>(null);
  const [pipeline, setPipeline] = useState<PipelineDashboardData | null>(null);
  const [pipelineLoading, setPipelineLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchCrmHomeSummary()
      .then((res) => {
        if (!cancelled) {
          setSummary(res.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSummary(null);
        }
      });

    fetchPipelineDashboard()
      .then((data) => {
        if (!cancelled) {
          setPipeline(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPipeline(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPipelineLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <CrmHomeStats summary={summary} />
      <div className="mt-3">
        <CrmPipelineCards data={pipeline} loading={pipelineLoading} />
      </div>
      <CrmHomeTables summary={summary} />
    </>
  );
}
