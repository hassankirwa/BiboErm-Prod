"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { ReservationsWorkbench } from "@/components/warehouse/reservations-workbench";
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
  const workbenchProjectId = initialProjectId ? Number(initialProjectId) : null;
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
    if (workbenchProjectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    listReservations({
      per_page: 100,
      project_id: projectFilter ? Number(projectFilter) : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
    })
      .then((res) => setItems(res.data))
      .catch((error: Error) => toast.error(error.message || "Failed to load reservations."))
      .finally(() => setLoading(false));
  }, [projectFilter, statusFilter, workbenchProjectId]);

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
        subtitle={
          workbenchProjectId
            ? "BOM stock check, reserve, and release handover"
            : "FIFO material reservations by project"
        }
        actions={
          workbenchProjectId ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/warehouse/reservations">All reservations</Link>
            </Button>
          ) : undefined
        }
      />
      <div className="space-y-6 p-6">
        {workbenchProjectId ? (
          <ReservationsWorkbench projectId={workbenchProjectId} />
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              <WarehouseNativeSelect
                value={projectFilter}
                onChange={setProjectFilter}
                disabled={optionsLoading}
                className="min-w-[220px]"
                placeholder="All projects"
                options={projects.map((p) => ({
                  value: String(p.id),
                  label: projectLabel(p),
                }))}
              />
              <WarehouseNativeSelect
                value={statusFilter === "all" ? "" : statusFilter}
                onChange={(value) => setStatusFilter(value || "all")}
                className="min-w-[160px]"
                placeholder="All statuses"
                options={RESERVATION_STATUSES.map((status) => ({
                  value: status,
                  label: status,
                }))}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={!projectFilter}
                asChild={Boolean(projectFilter)}
              >
                {projectFilter ? (
                  <Link href={`/warehouse/reservations?project_id=${projectFilter}`}>
                    Open workbench
                  </Link>
                ) : (
                  <span>Open workbench</span>
                )}
              </Button>
            </div>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                {loading ? (
                  <p className="p-6 text-sm text-muted-foreground">Loading…</p>
                ) : items.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground">No reservations found.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reservation</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>FIFO</TableHead>
                        <TableHead>Reserved</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">
                            {row.reservation_number}
                          </TableCell>
                          <TableCell>
                            {row.project ? (
                              <Link
                                href={`/warehouse/reservations?project_id=${row.project_id}`}
                                className="underline-offset-2 hover:underline"
                              >
                                {projectLabel(row.project)}
                              </Link>
                            ) : (
                              `#${row.project_id}`
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{row.status}</Badge>
                          </TableCell>
                          <TableCell>{row.fifo_sequence ?? "—"}</TableCell>
                          <TableCell>
                            {row.reserved_at
                              ? new Date(row.reserved_at).toLocaleString()
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" asChild>
                                <Link
                                  href={`/warehouse/reservations?project_id=${row.project_id}`}
                                >
                                  Workbench
                                </Link>
                              </Button>
                              {canRelease &&
                              (row.status === "pending" || row.status === "partial") ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleRelease(row.id)}
                                >
                                  Release lines
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

export default function WarehouseReservationsPage() {
  return (
    <PermissionGuard permissions={["warehouse.reservations.view"]}>
      <ReservationsPageContent />
    </PermissionGuard>
  );
}
