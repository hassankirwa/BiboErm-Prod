"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductionStageBadge } from "@/components/production/production-stage-badge";
import {
  createProductionOrder,
  listProductionOrders,
  type ProductionOrder,
} from "@/lib/api/production";
import {
  formatProjectStage,
  getProjectWaves,
  type ProjectProgressWave,
} from "@/lib/api/projects";
import { getApiErrorMessage } from "@/lib/api/errors";
import { toast } from "sonner";

type Props = {
  projectId: number;
  projectStage: string;
};

export function ProjectDetailProduction({ projectId, projectStage }: Props) {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [waves, setWaves] = useState<ProjectProgressWave[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingWaveId, setCreatingWaveId] = useState<number | null>(null);

  function reload() {
    setLoading(true);
    Promise.all([
      listProductionOrders({ project_id: projectId, per_page: 20 }),
      getProjectWaves(projectId).catch(() => ({ data: { waves: [] as ProjectProgressWave[] } })),
    ])
      .then(([ordersRes, wavesRes]) => {
        setOrders(ordersRes.data);
        setWaves(wavesRes.data.waves ?? []);
      })
      .catch((err) =>
        toast.error(getApiErrorMessage(err, "Failed to load production orders")),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on project change only
  }, [projectId]);

  async function handleCreateForWave(waveId: number | null) {
    setCreatingWaveId(waveId ?? 0);
    try {
      await createProductionOrder({
        project_id: projectId,
        project_wave_id: waveId,
      });
      toast.success(waveId ? "Production order created for wave." : "Production order created.");
      reload();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not create production order."));
    } finally {
      setCreatingWaveId(null);
    }
  }

  const activeOrders = orders.filter(
    (o) => o.status === "scheduled" || o.status === "in_progress" || o.status === "on_hold",
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project stage</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          PM stage: <span className="text-foreground">{formatProjectStage(projectStage)}</span>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading production data…</p>
      ) : (
        <>
          {waves.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Orders by wave</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {waves.map((wave) => {
                  const waveOrders = orders.filter((o) => o.project_wave_id === wave.id);
                  const active = waveOrders.find(
                    (o) =>
                      o.status === "scheduled" ||
                      o.status === "in_progress" ||
                      o.status === "on_hold",
                  );
                  return (
                    <div
                      key={wave.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0"
                    >
                      <div>
                        <p className="font-medium">{wave.label || `Wave ${wave.wave_number}`}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {wave.status.replace(/_/g, " ")} · {wave.completion_percent}%
                        </p>
                      </div>
                      {active ? (
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/production/orders/${active.id}`}>{active.reference}</Link>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={creatingWaveId === wave.id}
                          onClick={() => void handleCreateForWave(wave.id)}
                        >
                          Create PO
                        </Button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}

          {activeOrders.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Active production orders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {activeOrders.map((active) => (
                  <div key={active.id} className="space-y-1 border-b border-border pb-2 last:border-0">
                    <p>
                      <span className="font-medium">{active.reference}</span> · FIFO #
                      {active.fifo_position}
                      {active.wave
                        ? ` · ${active.wave.label || `Wave ${active.wave.wave_number}`}`
                        : ""}
                    </p>
                    <p>
                      Pipeline: <ProductionStageBadge stage={active.current_stage} />
                    </p>
                    <Button size="sm" asChild>
                      <Link href={`/production/orders/${active.id}`}>Open order</Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : waves.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active production order. Orders are created automatically when warehouse
              marks materials ready, or create one after bootstrapping waves.
            </p>
          ) : null}
        </>
      )}

      {orders.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Production orders</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/production/schedule">FIFO schedule</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2"
                >
                  <Link
                    href={`/production/orders/${order.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {order.reference}
                    {order.wave
                      ? ` · ${order.wave.label || `W${order.wave.wave_number}`}`
                      : ""}
                  </Link>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <ProductionStageBadge stage={order.current_stage} />
                    <span className="capitalize">{order.status.replace(/_/g, " ")}</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
