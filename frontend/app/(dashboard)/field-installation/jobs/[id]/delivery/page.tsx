import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { FieldJobDetail } from "@/components/field-installation/field-job-detail";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function FieldDeliveryPage({ params }: Props) {
  const { id } = await params;
  const jobId = Number.parseInt(id, 10);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Delivery receipt"
        subtitle="Record goods arrival and condition"
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
