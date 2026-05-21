import { Suspense } from "react";
import { CrmPageContent, CrmPageShell } from "@/components/crm/crm-page-shell";
import { LeadCreateForm } from "@/components/crm/lead-create-form";

export default function LeadCreatePage() {
  return (
    <CrmPageShell>
      <CrmPageContent>
        <Suspense fallback={null}>
          <LeadCreateForm />
        </Suspense>
      </CrmPageContent>
    </CrmPageShell>
  );
}
