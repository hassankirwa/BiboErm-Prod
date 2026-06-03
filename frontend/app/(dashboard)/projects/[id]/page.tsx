import { Suspense } from "react";
import {
  ProjectDetailContent,
  ProjectDetailLoading,
} from "./project-detail-content";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<ProjectDetailLoading />}>
      <ProjectDetailContent params={params} />
    </Suspense>
  );
}
