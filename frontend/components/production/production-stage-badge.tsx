import { Badge } from "@/components/ui/badge";
import { formatProductionStage } from "@/lib/production/utils";

export function ProductionStageBadge({ stage }: { stage: string }) {
  return (
    <Badge variant="secondary" className="font-normal">
      {formatProductionStage(stage)}
    </Badge>
  );
}
