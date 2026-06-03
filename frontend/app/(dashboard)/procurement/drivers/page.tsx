"use client";

import { useCallback, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { PermissionGate } from "@/components/auth/permission-gate";
import { DriversTable } from "@/components/procurement/drivers-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createDriver, fetchSuggestedDriverCode } from "@/lib/api/procurement";
import { ApiError } from "@/lib/api/client";
import { Plus, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function ProcurementDriversPage() {
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    code: "",
    name: "",
    email: "",
    phone: "",
    license_number: "",
    vehicle_registration: "",
    vehicle_type: "",
    notes: "",
  });

  const resetForm = () =>
    setForm({
      code: "",
      name: "",
      email: "",
      phone: "",
      license_number: "",
      vehicle_registration: "",
      vehicle_type: "",
      notes: "",
    });

  const loadSuggestedCode = useCallback(async () => {
    setGeneratingCode(true);
    try {
      const result = await fetchSuggestedDriverCode();
      setForm((current) => ({ ...current, code: result.code ?? "" }));
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.firstError() ?? "Unable to generate driver code."
          : "Unable to generate driver code."
      );
    } finally {
      setGeneratingCode(false);
    }
  }, []);

  const handleCreateDriver = async () => {
    setSubmitting(true);
    try {
      await createDriver({
        code: form.code.trim() || undefined,
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        license_number: form.license_number.trim() || undefined,
        vehicle_registration: form.vehicle_registration.trim() || undefined,
        vehicle_type: form.vehicle_type.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      toast.success("Driver created.");
      setRefreshKey((value) => value + 1);
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create driver.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Drivers"
        subtitle="Manage procurement drivers for material collection and site delivery"
        actions={
          <PermissionGate anyOf={["procurement.driver.manage", "procurement.manage"]}>
            <Dialog
              open={open}
              onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (nextOpen) {
                  void loadSuggestedCode();
                } else {
                  resetForm();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1.5">
                  <Plus className="h-4 w-4" />
                  Add Driver
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Driver</DialogTitle>
                  <DialogDescription>
                    Register a driver used for supplier pickups and finished product deliveries.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="driver-code">Driver code</Label>
                      <div className="flex gap-2">
                        <Input
                          id="driver-code"
                          placeholder="DRV-001"
                          value={form.code}
                          onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                          disabled={generatingCode}
                          className="min-w-0 flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={generatingCode}
                          onClick={() => void loadSuggestedCode()}
                          title="Regenerate driver code"
                          aria-label="Regenerate driver code"
                        >
                          <Sparkles className={`h-4 w-4 ${generatingCode ? "animate-pulse" : ""}`} />
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="driver-name">Full name</Label>
                      <Input
                        id="driver-name"
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="driver-email">Email</Label>
                      <Input
                        id="driver-email"
                        type="email"
                        value={form.email}
                        onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="driver-phone">Phone</Label>
                      <Input
                        id="driver-phone"
                        value={form.phone}
                        onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="driver-license">License number</Label>
                      <Input
                        id="driver-license"
                        value={form.license_number}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, license_number: event.target.value }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="driver-vehicle-type">Vehicle type</Label>
                      <Input
                        id="driver-vehicle-type"
                        placeholder="Van, truck, pickup…"
                        value={form.vehicle_type}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, vehicle_type: event.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="driver-registration">Vehicle registration</Label>
                    <Input
                      id="driver-registration"
                      value={form.vehicle_registration}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, vehicle_registration: event.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="driver-notes">Notes</Label>
                    <Textarea
                      id="driver-notes"
                      value={form.notes}
                      onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button disabled={submitting || !form.name.trim()} onClick={handleCreateDriver}>
                    {submitting ? "Creating..." : "Create driver"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </PermissionGate>
        }
      />
      <div className="min-w-0 w-full">
        <div className="space-y-6 p-6">
          <div className="relative w-80">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search drivers..."
              className="pl-8 h-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <DriversTable refreshKey={refreshKey} search={search} />
        </div>
      </div>
    </div>
  );
}
