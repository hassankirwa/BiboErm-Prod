import { AppHeader } from "@/components/app-header";
import { FieldJobsTable } from "@/components/field-installation/field-jobs-table";

export default function FieldInstallationJobsPage() {
  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Field Installation"
        subtitle="On-site jobs, daily progress, deliveries, and non-conformities"
      />
      <div className="min-w-0 w-full">
        <FieldJobsTable />
      </div>
    </div>
  );
}
