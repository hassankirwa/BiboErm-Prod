import { CrmPageContent, CrmPageShell } from "@/components/crm/crm-page-shell";
import { LeadsImportWizard } from "@/components/crm/leads-import-wizard";

export default function LeadsImportPage() {
  return (
    <CrmPageShell>
      <CrmPageContent>
        <LeadsImportWizard />
      </CrmPageContent>
    </CrmPageShell>
  );
}
