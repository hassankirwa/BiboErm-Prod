"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductionStageBadge } from "@/components/production/production-stage-badge";
import {
  FABRICATION_STAGES,
  listProductionOrders,
  type ProductionOrder,
} from "@/lib/api/production";
import { formatProjectStage, type ProjectDetail } from "@/lib/api/projects";
import { getApiErrorMessage } from "@/lib/api/errors";
import { toast } from "sonner";

type Props = {
  project: ProjectDetail;
};

function fabChecklist(order: ProductionOrder | undefined) {
  const stage = order?.current_stage;
  return [
    {
      key: "fabrication",
      label: "Frame fabrication",
      done:
        !!stage &&
        ["fabrication", "sash", "glass_assembly", "finishing", "qc_post_fabrication"].indexOf(
          stage,
        ) > 0,
      active: stage === "fabrication",
    },
    {
      key: "sash",
      label: "Sash fabrication",
      done:
        !!stage &&
        ["sash", "glass_assembly", "finishing", "qc_post_fabrication"].indexOf(stage) > 0,
      active: stage === "sash",
    },
  ];
}

export function ProjectDetailFabrication({ project }: Props) {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listProductionOrders({ project_id: project.id, per_page: 10 })
      .then((res) => setOrders(res.data))
      .catch((err) =>
        toast.error(getApiErrorMessage(err, "Failed to load production orders")),
      )
      .finally(() => setLoading(false));
  }, [project.id]);

  const active = orders.find(
    (o) => o.status === "scheduled" || o.status === "in_progress" || o.status === "on_hold",
  );
  const inFabQueue =
    active && FABRICATION_STAGES.includes(active.current_stage);
  const isNairobi = project.location_type === "nairobi";
  const sashComplete =
    !!active &&
    ["glass_assembly", "finishing", "qc_post_fabrication"].includes(active.current_stage);
  const earlyFieldEligible =
    isNairobi &&
    (sashComplete ||
      ["glass_assembly", "qc_pre_installation", "field_installation"].includes(project.stage));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fabrication overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            PM stage:{" "}
            <span className="text-foreground">{formatProjectStage(project.stage)}</span>
          </p>
          <p>
            Location:{" "}
            <span className="text-foreground">
              {isNairobi ? "Nairobi" : "Outside Nairobi"}
            </span>
          </p>
          {isNairobi && !earlyFieldEligible && (
            <p>
              After sash fabrication completes, this Nairobi project is forwarded to the
              field team for site installation while factory assembly continues.
            </p>
          )}
          {earlyFieldEligible && (
            <p className="text-foreground">
              Early site install is available for Nairobi (sash fabrication done) while
              factory glass assembly continues.{" "}
              <Link
                href="/field-installation/jobs"
                className="text-primary hover:underline"
              >
                Open field installation
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading fabrication data…</p>
      ) : active ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Active order</CardTitle>
            {inFabQueue && <Badge variant="secondary">In fabrication queue</Badge>}
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="font-medium">{active.reference}</span> ·{" "}
              <ProductionStageBadge stage={active.current_stage} />
            </p>
            <ul className="space-y-2">
              {fabChecklist(active).map((item) => (
                <li key={item.key} className="flex items-center justify-between">
                  <span>{item.label}</span>
                  <span className="text-muted-foreground">
                    {item.done ? "Done" : item.active ? "In progress" : "Pending"}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" asChild>
                <Link href={`/production/orders/${active.id}`}>Open order</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/production/fabrication">Fabrication queue</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          No active production order yet. Fabrication starts after cutting completes.
        </p>
      )}
    </div>
  );
}
