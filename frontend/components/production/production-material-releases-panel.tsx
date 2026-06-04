"use client";

import type { ProductionMaterialRelease } from "@/lib/api/production";
import { formatProductionStage } from "@/lib/production/utils";

type Props = {
  releases: ProductionMaterialRelease[];
};

export function ProductionMaterialReleasesPanel({ releases }: Props) {
  if (releases.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No warehouse releases recorded yet. Releases are created when a stage is started.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Stage</th>
            <th className="pb-2 pr-4 font-medium">Qty released</th>
            <th className="pb-2 pr-4 font-medium">Reservation line</th>
            <th className="pb-2 font-medium">Released at</th>
          </tr>
        </thead>
        <tbody>
          {releases.map((row) => (
            <tr key={row.id} className="border-b border-border/60">
              <td className="py-2 pr-4">{formatProductionStage(row.stage)}</td>
              <td className="py-2 pr-4">{row.qty_released}</td>
              <td className="py-2 pr-4">#{row.stock_reservation_line_id}</td>
              <td className="py-2 text-muted-foreground">
                {new Date(row.released_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
