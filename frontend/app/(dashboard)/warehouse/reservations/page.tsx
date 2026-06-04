"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { useWarehouseFormOptions } from "@/components/warehouse/use-warehouse-form-options";
import { WarehouseNativeSelect } from "@/components/warehouse/warehouse-native-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  listReservations,
  releaseReservation,
  RESERVATION_STATUSES,
  type StockReservation,
} from "@/lib/api/warehouse";
import { projectLabel } from "@/lib/api/projects";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function ReservationsPageContent() {
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get("project_id") ?? "";
  const { hasPermission } = useAuth();
  const canRelease = hasPermission("warehouse.reservations.release");
  const { loading: optionsLoading, projects } = useWarehouseFormOptions();
  const [items, setItems] = useState<StockReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState(initialProjectId);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (initialProjectId) setProjectFilter(initialProjectId);
  }, [initialProjectId]);

  const load = useCallback(() => {
    setLoading(true);
    listReservations({
      per_page: 100,
      project_id: projectFilter ? Number(projectFilter) : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
    })
      .then((res) => setItems(res.data))
      .catch((error: Error) => toast.error(error.message || "Failed to load reservations."))
      .finally(() => setLoading(false));
  }, [projectFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRelease = async (id: number) => {
    try {
      await releaseReservation(id);
      toast.success("Reservation released.");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to release.");
    }
  };

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Stock reservations"
        subtitle="FIFO material reservations by project"
      />
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap gap-3">
          <WarehouseNativeSelect
            value={projectFilter}
            onChange={setProjectFilter}
            options={projects.map((p) => ({
              value: String(p.id),
              label: projectLabel(p),
            }))}
            placeholder="All projects"
            disabled={optionsLoading}
            className="max-w-xs"
          />
          <WarehouseNativeSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All statuses" },
              ...RESERVATION_STATUSES.map((s) => ({
                value: s,
                label: s.charAt(0).toUpperCase() + s.slice(1),
              })),
            ]}
            className="max-w-[180px]"
          />
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-6 text-sm text-muted-foreground">Loading…</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reservation</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>FIFO</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lines</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.reservation_number}</TableCell>
                      <TableCell>
                        {row.project ? (
                          <Link
                            href={`/projects/${row.project.id}`}
                            className="text-primary hover:underline"
                          >
                            {row.project.reference}
                          </Link>
                        ) : (
                          `#${row.project_id}`
                        )}
                      </TableCell>
                      <TableCell>{row.fifo_sequence}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.status}</Badge>
                      </TableCell>
                      <TableCell>{row.lines?.length ?? 0}</TableCell>
                      <TableCell className="text-right">
                        {canRelease &&
                        row.status !== "released" &&
                        row.status !== "cancelled" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRelease(row.id)}
                          >
                            Release
                          </Button>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No reservations found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function WarehouseReservationsPage() {
  return (
    <PermissionGuard
      permissions={["warehouse.reservations.view"]}
      fallback={
        <div className="p-6 text-sm text-muted-foreground">
          You do not have permission to view reservations.
        </div>
      }
    >
      <ReservationsPageContent />
    </PermissionGuard>
  );
}
