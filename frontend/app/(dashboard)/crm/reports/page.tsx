import { CrmPageShell } from "@/components/crm/crm-page-shell";
import { CrmReportsList } from "@/components/crm/crm-reports-list";

export default function CrmReportsPage() {
  return (
    <CrmPageShell>
      <CrmReportsList />
    </CrmPageShell>
  );
}
