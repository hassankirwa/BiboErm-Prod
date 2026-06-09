"use client";

import { use } from "react";
import { ProjectDetailView } from "@/components/projects/project-detail-view";

export default function CrmProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ProjectDetailView projectId={Number(id)} mode="crm" />;
}
