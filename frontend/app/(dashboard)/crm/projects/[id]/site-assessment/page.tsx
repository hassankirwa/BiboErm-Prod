"use client";

import { use } from "react";
import { ProjectSiteAssessmentView } from "@/components/projects/project-site-assessment-view";

export default function CrmProjectSiteAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ProjectSiteAssessmentView projectId={Number(id)} mode="crm" />;
}
