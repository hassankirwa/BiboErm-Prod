import { Suspense } from "react";
import { CrmPageContent, CrmPageShell } from "@/components/crm/crm-page-shell";
import { LeadConvertForm } from "@/components/crm/lead-convert-form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function LeadConvertPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <CrmPageShell>
      <CrmPageContent className="!px-3 sm:!px-4 md:!px-6">
        <Suspense fallback={null}>
          <LeadConvertForm leadId={id} />
        </Suspense>
      </CrmPageContent>
    </CrmPageShell>
  );
}
