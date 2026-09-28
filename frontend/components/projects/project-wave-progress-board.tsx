"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import {
  bootstrapProjectWaves,
  createProjectWave,
  getProjectWaves,
  type ProjectProgressTree,
  type ProjectProgressWave,
} from "@/lib/api/projects";
import { toast } from "sonner";

type Props = {
  projectId: number;
  initialProgress?: ProjectProgressTree | null;
  onUpdated?: () => void;
};

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

type WaveWithLabel = ProjectProgressWave & { openingsLabel?: string };

function WaveBlock({ wave }: { wave: WaveWithLabel }) {
  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">
            {wave.label || `Wave ${wave.wave_number}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {wave.openingsLabel ?? `${wave.completion_percent}% complete`}
          </p>
        </div>
        <Badge variant="outline" className="capitalize">
          {statusLabel(wave.status)}
        </Badge>
      </div>
      <Progress value={wave.completion_percent} className="h-2" />
      <div className="space-y-3">
        {wave.floors.map((floor) => (
          <div key={floor.id} className="space-y-2 pl-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium">{floor.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {floor.openings_done}/{floor.openings_total} · {floor.completion_percent}%
              </span>
            </div>
            <Progress value={floor.completion_percent} className="h-1.5" />
            {floor.rooms.length > 0 ? (
              <ul className="space-y-1.5 border-l pl-3">
                {floor.rooms.map((room) => (
                  <li key={room.id} className="flex items-center justify-between gap-2 text-xs">
                    <span>{room.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {room.openings_done}/{room.openings_total} · {room.completion_percent}%
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
        {wave.floors.length === 0 ? (
          <p className="text-xs text-muted-foreground">No floors assigned to this wave yet.</p>
        ) : null}
      </div>
    </div>
  );
}

export function ProjectWaveProgressBoard({ projectId, initialProgress, onUpdated }: Props) {
  const [progress, setProgress] = useState<ProjectProgressTree | null>(initialProgress ?? null);
  const [loading, setLoading] = useState(!initialProgress);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProjectWaves(projectId);
      setProgress(res.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load waves.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (initialProgress) {
      setProgress(initialProgress);
      setLoading(false);
      return;
    }
    void load();
  }, [initialProgress, load]);

  async function handleBootstrap() {
    setBusy(true);
    try {
      const res = await bootstrapProjectWaves(projectId);
      setProgress(res.data.progress);
      toast.success(
        `Wave ${res.data.wave.wave_number} ready — ${res.data.scopes_created} scope(s) from measurements.`,
      );
      onUpdated?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bootstrap failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateWave() {
    setBusy(true);
    try {
      await createProjectWave(projectId, { label: undefined });
      await load();
      toast.success("New wave created — assign remaining floors from Waves API or re-bootstrap.");
      onUpdated?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create wave.");
    } finally {
      setBusy(false);
    }
  }

  const waves: WaveWithLabel[] = (progress?.waves ?? []).map((wave) => {
    const total = wave.floors.reduce((sum, f) => sum + f.openings_total, 0);
    const done = wave.floors.reduce((sum, f) => sum + f.openings_done, 0);
    return {
      ...wave,
      openingsLabel: total > 0 ? `${done}/${total} openings · ${wave.completion_percent}%` : `${wave.completion_percent}% complete`,
    };
  });

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">Waves / floors / rooms</CardTitle>
          <p className="text-xs text-muted-foreground">
            Mini-progress through cutting → install. Second waves keep the project open.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void handleBootstrap()}>
            {busy ? <Spinner className="mr-2 h-3.5 w-3.5" /> : null}
            Bootstrap from measurements
          </Button>
          {waves.length > 0 ? (
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => void handleCreateWave()}>
              Add wave
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4" />
            Loading floor progress…
          </div>
        ) : waves.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No waves yet. Bootstrap from site measurements to create floor → room scopes.
          </p>
        ) : (
          waves.map((wave) => <WaveBlock key={wave.id} wave={wave} />)
        )}
      </CardContent>
    </Card>
  );
}
