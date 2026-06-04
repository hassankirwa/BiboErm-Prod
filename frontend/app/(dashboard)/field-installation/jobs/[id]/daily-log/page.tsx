import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { FieldJobDetail } from "@/components/field-installation/field-job-detail";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function FieldDailyLogPage({ params }: Props) {
  const { id } = await params;
  const jobId = Number.parseInt(id, 10);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Daily log"
        subtitle="Mobile-friendly progress entry"
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href={`/field-installation/jobs/${id}`}>Back to job</Link>
          </Button>
        }
      />
      <FieldJobDetail jobId={jobId} />
    </div>
  );
}
