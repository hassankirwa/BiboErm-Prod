import { Suspense } from "react";
import { CrmPageContent, CrmPageShell } from "@/components/crm/crm-page-shell";
import { LeadsPageClient } from "@/components/crm/leads-page-client";

export default function LeadsPage() {
  return (
    <CrmPageShell>
      <CrmPageContent>
        <Suspense fallback={null}>
          <LeadsPageClient />
        </Suspense>
      </CrmPageContent>
    </CrmPageShell>
  );
}
