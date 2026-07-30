"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PermissionGate } from "@/components/auth/permission-gate";
import type { Driver } from "@/lib/api/procurement";
import { listDrivers, updateDriver } from "@/lib/api/procurement";
import { toast } from "sonner";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type DriverFormState = {
  code: string;
  name: string;
  email: string;
  phone: string;
  license_number: string;
  vehicle_registration: string;
  vehicle_type: string;
  notes: string;
};

const emptyForm: DriverFormState = {
  code: "",
  name: "",
  email: "",
  phone: "",
  license_number: "",
  vehicle_registration: "",
  vehicle_type: "",
  notes: "",
};

function formFromDriver(driver: Driver): DriverFormState {
  return {
    code: driver.code,
    name: driver.name,
    email: driver.email ?? "",
    phone: driver.phone ?? "",
    license_number: driver.license_number ?? "",
    vehicle_registration: driver.vehicle_registration ?? "",
    vehicle_type: driver.vehicle_type ?? "",
    notes: driver.notes ?? "",
  };
}

export function DriversTable({
  refreshKey = 0,
  search = "",
}: {
  refreshKey?: number;
  search?: string;
}) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [form, setForm] = useState<DriverFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listDrivers({ per_page: 50, search: search || undefined })
      .then((res) => setDrivers(res.data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [refreshKey, search]);

  const openEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setForm(formFromDriver(driver));
  };

  const closeEdit = () => {
    setEditingDriver(null);
    setForm(emptyForm);
  };

  const saveDriver = async () => {
    if (!editingDriver) {
      return;
    }

    setSubmitting(true);
    try {
      await updateDriver(editingDriver.id, {
        code: form.code.trim(),
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        license_number: form.license_number.trim() || null,
        vehicle_registration: form.vehicle_registration.trim() || null,
        vehicle_type: form.vehicle_type.trim() || null,
        notes: form.notes.trim() || null,
      });
      toast.success("Driver updated.");
      closeEdit();
      listDrivers({ per_page: 50, search: search || undefined })
        .then((res) => setDrivers(res.data))
        .catch((e: Error) => toast.error(e.message));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update driver.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (driver: Driver) => {
    try {
      await updateDriver(driver.id, { is_active: !driver.is_active });
      toast.success(driver.is_active ? "Driver deactivated." : "Driver reactivated.");
      listDrivers({ per_page: 50, search: search || undefined })
        .then((res) => setDrivers(res.data))
        .catch((e: Error) => toast.error(e.message));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update driver status.");
    }
  };

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading drivers…</p>;
  }

  if (error) {
    return <p className="p-6 text-sm text-destructive">{error}</p>;
  }

  return (
    <>
      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Driver</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>License</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.map((driver) => (
              <TableRow key={driver.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(driver.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{driver.name}</p>
                      <p className="text-xs text-muted-foreground">{driver.vehicle_type ?? "—"}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-sm">{driver.code}</code>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{driver.email ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{driver.phone ?? ""}</div>
                </TableCell>
                <TableCell>{driver.license_number ?? "—"}</TableCell>
                <TableCell>{driver.vehicle_registration ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={driver.is_active ? "secondary" : "outline"}>
                      {driver.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {driver.status === "occupied" ? (
                      <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700">
                        Occupied
                      </Badge>
                    ) : null}
                    {driver.status === "available" && driver.is_active ? (
                      <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700">
                        Available
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <PermissionGate anyOf={["procurement.driver.manage", "procurement.manage"]}>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(driver)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleActive(driver)}>
                        {driver.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </PermissionGate>
                </TableCell>
              </TableRow>
            ))}
            {drivers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  No drivers found.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(editingDriver)} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Driver</DialogTitle>
            <DialogDescription>Update driver contact and vehicle details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="edit-driver-code">Driver code</Label>
                <Input
                  id="edit-driver-code"
                  value={form.code}
                  onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-driver-name">Full name</Label>
                <Input
                  id="edit-driver-name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="edit-driver-email">Email</Label>
                <Input
                  id="edit-driver-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-driver-phone">Phone</Label>
                <Input
                  id="edit-driver-phone"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="edit-driver-license">License number</Label>
                <Input
                  id="edit-driver-license"
                  value={form.license_number}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, license_number: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-driver-vehicle-type">Vehicle type</Label>
                <Input
                  id="edit-driver-vehicle-type"
                  placeholder="Van, truck, pickup…"
                  value={form.vehicle_type}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, vehicle_type: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-driver-registration">Vehicle registration</Label>
              <Input
                id="edit-driver-registration"
                value={form.vehicle_registration}
                onChange={(event) =>
                  setForm((current) => ({ ...current, vehicle_registration: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-driver-notes">Notes</Label>
              <Textarea
                id="edit-driver-notes"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEdit}>
              Cancel
            </Button>
            <Button disabled={submitting || !form.code.trim() || !form.name.trim()} onClick={saveDriver}>
              {submitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
