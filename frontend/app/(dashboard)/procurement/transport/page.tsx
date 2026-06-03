"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createTransportOrder,
  listDrivers,
  listPurchaseOrders,
  listTransportOrders,
  type Driver,
  type PurchaseOrder,
  type TransportOrder,
  updateTransportStatus,
} from "@/lib/api/procurement";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusColors: Record<string, string> = {
  scheduled: "bg-muted text-muted-foreground",
  in_transit: "bg-info/10 text-info",
  arrived: "bg-success/10 text-success",
};

const nextStatus: Record<string, "in_transit" | "arrived" | null> = {
  scheduled: "in_transit",
  in_transit: "arrived",
  arrived: null,
};

const selectClassName =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50";

export default function TransportPage() {
  const [items, setItems] = useState<TransportOrder[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    purchase_order_id: "",
    transport_type: "",
    driver_id: "",
    vehicle: "",
    driver_name: "",
    driver_phone: "",
    expected_arrival: "",
    notes: "",
  });

  const load = () => {
    setLoading(true);
    listTransportOrders({ per_page: 50 })
      .then((res) => setItems(res.data))
      .catch((error: Error) => toast.error(error.message || "Failed to load transport orders."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    Promise.all([
      listPurchaseOrders({ per_page: 100 }),
      listDrivers({ active_only: true, per_page: 100 }),
    ])
      .then(([ordersRes, driversRes]) => {
        setPurchaseOrders(ordersRes.data);
        setDrivers(driversRes.data);
      })
      .catch((error: Error) => toast.error(error.message || "Failed to load transport options."))
      .finally(() => setOptionsLoading(false));
  }, []);

  const submit = async () => {
    setSubmitting(true);
    try {
      await createTransportOrder({
        purchase_order_id: Number(form.purchase_order_id),
        transport_type: form.transport_type,
        driver_id: form.driver_id ? Number(form.driver_id) : undefined,
        vehicle: form.vehicle || undefined,
        driver_name: form.driver_name || undefined,
        driver_phone: form.driver_phone || undefined,
        expected_arrival: form.expected_arrival || undefined,
        notes: form.notes || undefined,
      });
      toast.success("Transport order created.");
      setForm({
        purchase_order_id: "",
        transport_type: "",
        driver_id: "",
        vehicle: "",
        driver_name: "",
        driver_phone: "",
        expected_arrival: "",
        notes: "",
      });
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create transport order.");
    } finally {
      setSubmitting(false);
    }
  };

  const advanceStatus = async (item: TransportOrder) => {
    const status = nextStatus[item.status];

    if (!status) {
      return;
    }

    try {
      await updateTransportStatus(item.id, {
        status,
        actual_arrival: status === "arrived" ? new Date().toISOString() : undefined,
      });
      toast.success(`Transport order marked ${status.replaceAll("_", " ")}.`);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update transport status.");
    }
  };

  const handleDriverChange = (driverId: string) => {
    const selected = drivers.find((driver) => String(driver.id) === driverId);

    setForm((current) => ({
      ...current,
      driver_id: driverId,
      driver_name: selected?.name ?? "",
      driver_phone: selected?.phone ?? "",
      vehicle: selected?.vehicle_registration ?? current.vehicle,
    }));
  };

  return (
    <PermissionGuard
      permissions={["procurement.transport.manage", "procurement.manage"]}
      fallback={
        <div className="flex min-w-0 w-full flex-col">
          <AppHeader title="Transport Orders" subtitle="Delivery coordination linked to purchase orders" />
          <div className="p-6 text-sm text-muted-foreground">
            Transport management is only available to procurement managers.
          </div>
        </div>
      }
    >
      <div className="flex min-w-0 w-full flex-col">
        <AppHeader title="Transport Orders" subtitle="Delivery coordination linked to purchase orders" />
        <div className="grid gap-6 p-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Create Transport Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <select
                className={selectClassName}
                value={form.purchase_order_id}
                disabled={optionsLoading}
                onChange={(event) => setForm((current) => ({ ...current, purchase_order_id: event.target.value }))}
              >
                <option value="">{optionsLoading ? "Loading purchase orders…" : "Select purchase order"}</option>
                {purchaseOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.reference} · {order.supplier?.name ?? `Supplier #${order.supplier_id}`}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Transport type"
                value={form.transport_type}
                onChange={(event) => setForm((current) => ({ ...current, transport_type: event.target.value }))}
              />
              <select
                className={selectClassName}
                value={form.driver_id}
                disabled={optionsLoading}
                onChange={(event) => handleDriverChange(event.target.value)}
              >
                <option value="">{optionsLoading ? "Loading drivers…" : "Select driver (optional)"}</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.code} · {driver.name}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Vehicle"
                value={form.vehicle}
                onChange={(event) => setForm((current) => ({ ...current, vehicle: event.target.value }))}
              />
              <Input
                placeholder="Driver name"
                value={form.driver_name}
                onChange={(event) => setForm((current) => ({ ...current, driver_name: event.target.value }))}
              />
              <Input
                placeholder="Driver phone"
                value={form.driver_phone}
                onChange={(event) => setForm((current) => ({ ...current, driver_phone: event.target.value }))}
              />
              <Input
                type="datetime-local"
                value={form.expected_arrival}
                onChange={(event) => setForm((current) => ({ ...current, expected_arrival: event.target.value }))}
              />
              <Textarea
                placeholder="Notes"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
              <Button
                className="w-full"
                disabled={submitting || !form.purchase_order_id || !form.transport_type}
                onClick={submit}
              >
                {submitting ? "Creating..." : "Create transport order"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transport Queue</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading transport orders…</p>
              ) : (
                <div className="rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transport</TableHead>
                        <TableHead>PO</TableHead>
                        <TableHead>Driver</TableHead>
                        <TableHead>Expected</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="font-medium">{item.transport_number}</div>
                            <div className="text-xs text-muted-foreground">{item.transport_type}</div>
                          </TableCell>
                          <TableCell>PO #{item.purchase_order_id}</TableCell>
                          <TableCell>
                            <div>{item.driver_name ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">{item.driver_phone ?? ""}</div>
                          </TableCell>
                          <TableCell>
                            {item.expected_arrival
                              ? new Date(item.expected_arrival).toLocaleString()
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={statusColors[item.status] ?? ""}>
                              {item.status.replaceAll("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!nextStatus[item.status]}
                              onClick={() => advanceStatus(item)}
                            >
                              {nextStatus[item.status]
                                ? `Mark ${nextStatus[item.status]?.replaceAll("_", " ")}`
                                : "Complete"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                            No transport orders yet.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PermissionGuard>
  );
}
