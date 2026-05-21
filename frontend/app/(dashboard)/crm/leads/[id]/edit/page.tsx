import { Suspense } from "react";
import { CrmPageContent, CrmPageShell } from "@/components/crm/crm-page-shell";
import { LeadEditForm } from "@/components/crm/lead-edit-form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function LeadEditPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <CrmPageShell>
      <CrmPageContent className="!px-3 sm:!px-4 md:!px-6">
        <Suspense fallback={null}>
          <LeadEditForm leadId={id} />
        </Suspense>
      </CrmPageContent>
    </CrmPageShell>
  );
}
