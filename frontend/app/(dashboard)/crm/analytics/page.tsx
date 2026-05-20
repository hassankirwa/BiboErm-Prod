import { AppHeader } from "@/components/app-header";
import { CrmAnalyticsDashboard } from "@/components/crm/crm-analytics-dashboard";
import { CrmPageShell } from "@/components/crm/crm-page-shell";

export default function CrmAnalyticsPage() {
  return (
    <CrmPageShell>
      <AppHeader title="Analytics" />
      <CrmAnalyticsDashboard />
    </CrmPageShell>
  );
}
