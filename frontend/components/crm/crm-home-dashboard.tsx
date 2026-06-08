"use client";

import { useEffect, useState } from "react";
import { CrmHomeStats } from "@/components/crm/crm-home-stats";
import { CrmHomeTables } from "@/components/crm/crm-home-tables";
import { fetchCrmHomeSummary, type CrmHomeSummary } from "@/lib/api/crm/home";

export function CrmHomeDashboard() {
  const [summary, setSummary] = useState<CrmHomeSummary | null>(null);

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

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <CrmHomeStats summary={summary} />
      <CrmHomeTables summary={summary} />
    </>
  );
}
