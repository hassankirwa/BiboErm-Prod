import { Suspense } from "react";
import { CrmPageContent, CrmPageShell } from "@/components/crm/crm-page-shell";
import { LeadDetailView } from "@/components/crm/lead-detail-view";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function LeadDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <CrmPageShell>
      <CrmPageContent className="!px-3 sm:!px-4 md:!px-6">
        <Suspense fallback={null}>
          <LeadDetailView leadId={id} />
        </Suspense>
      </CrmPageContent>
    </CrmPageShell>
  );
}
