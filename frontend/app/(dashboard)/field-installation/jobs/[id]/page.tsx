import { AppHeader } from "@/components/app-header";
import { FieldJobDetail } from "@/components/field-installation/field-job-detail";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function FieldInstallationJobDetailPage({ params }: Props) {
  const { id } = await params;
  const jobId = Number.parseInt(id, 10);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title={`Job #${id}`}
        subtitle="Overview → arrival → install → daily log → issues → complete"
      />
      <FieldJobDetail jobId={jobId} />
    </div>
  );
}
