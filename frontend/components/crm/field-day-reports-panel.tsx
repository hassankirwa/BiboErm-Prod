"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Calendar, MapPin, Target, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  convertFieldDayPinToLead,
  fetchFieldDays,
  type ApiFieldDay,
} from "@/lib/api/crm/field-day";
import { fetchCrmAssignableUsers } from "@/lib/api/crm/lookups";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { pinsToMapMarkers } from "@/components/crm/field-day-map";
import {
  FieldDayPinListItem,
  sortPinsChronologically,
} from "@/components/crm/field-day-pin-list-item";
import { toast } from "sonner";

const FieldDayMap = dynamic(
  () =>
    import("@/components/crm/field-day-map").then((mod) => mod.FieldDayMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-72 items-center justify-center rounded-lg border border-border bg-muted/30">
        <Spinner className="h-6 w-6 text-primary" />
      </div>
    ),
  },
);

export function FieldDayReportsPanel() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const canView = can("field_day.view");
  const canManage = can("field_day.manage");

  const today = new Date().toISOString().slice(0, 10);
  const [dateFilter, setDateFilter] = useState(today);
  const [fieldDays, setFieldDays] = useState<ApiFieldDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [convertingPinId, setConvertingPinId] = useState<number | null>(null);
  const [officers, setOfficers] = useState<{ id: number; name: string }[]>([]);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>("");

  const loadFieldDays = useCallback(async () => {
    if (!canView) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchFieldDays({
        field_date: dateFilter || undefined,
        field_officer_id: !canManage && user?.id ? user.id : undefined,
        per_page: 50,
      });
      setFieldDays(res.data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load field days.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [canManage, canView, dateFilter, user?.id]);

  useEffect(() => {
    loadFieldDays();
  }, [loadFieldDays]);

  useEffect(() => {
    if (!canManage) return;
    fetchCrmAssignableUsers({ role: "field_officer" })
      .then((res) =>
        setOfficers(res.data.map((u) => ({ id: u.id, name: u.name }))),
      )
      .catch(() => {});
  }, [canManage]);

  const managementPins = useMemo(() => {
    const pins: ReturnType<typeof pinsToMapMarkers> = [];
    fieldDays.forEach((fd) => {
      pins.push(
        ...pinsToMapMarkers(
          fd.pins ?? [],
          fd.field_officer?.name ?? `Officer #${fd.field_officer_id}`,
        ),
      );
    });
    return pins;
  }, [fieldDays]);

  const filteredMapPins = useMemo(() => {
    if (!selectedOfficerId) return managementPins;
    return managementPins.filter((pin) => {
      const fd = fieldDays.find((day) => day.pins?.some((p) => p.id === pin.id));
      return fd && String(fd.field_officer_id) === selectedOfficerId;
    });
  }, [fieldDays, managementPins, selectedOfficerId]);

  const stats = useMemo(() => {
    const filtered = fieldDays.filter(
      (fd) =>
        !selectedOfficerId ||
        String(fd.field_officer_id) === selectedOfficerId,
    );
    const allPins = filtered.flatMap((fd) => fd.pins ?? []);
    return {
      fieldDays: filtered.length,
      officers: new Set(filtered.map((fd) => fd.field_officer_id)).size,
      pins: allPins.length,
      leadsFromPins: allPins.filter((pin) => pin.lead_id).length,
    };
  }, [fieldDays, selectedOfficerId]);

  async function handleQuickConvert(pinId: number) {
    setConvertingPinId(pinId);
    try {
      await ensureCsrfCookie();
      const lead = await convertFieldDayPinToLead(pinId);
      toast.success("Lead created from pin.");
      loadFieldDays();
      window.location.href = `/crm/leads/${lead.id}`;
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to convert pin.",
      );
    } finally {
      setConvertingPinId(null);
    }
  }

  if (!canView) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view field day reports.
      </p>
    );
  }

  const visibleFieldDays = fieldDays.filter(
    (fd) =>
      !selectedOfficerId || String(fd.field_officer_id) === selectedOfficerId,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="date"
          className="h-9 w-44"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
        {canManage && officers.length > 0 ? (
          <Select
            value={selectedOfficerId || "all"}
            onValueChange={(value) =>
              setSelectedOfficerId(value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="h-9 w-52">
              <SelectValue placeholder="All officers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All officers</SelectItem>
              {officers.map((officer) => (
                <SelectItem key={officer.id} value={String(officer.id)}>
                  {officer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Field days
              </p>
              <p className="text-xl font-semibold sm:text-2xl">
                {stats.fieldDays}
              </p>
            </div>
            <Calendar className="h-7 w-7 text-muted-foreground/50" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Officers
              </p>
              <p className="text-xl font-semibold sm:text-2xl">
                {stats.officers}
              </p>
            </div>
            <Users className="h-7 w-7 text-muted-foreground/50" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground sm:text-sm">Pins</p>
              <p className="text-xl font-semibold sm:text-2xl">{stats.pins}</p>
            </div>
            <MapPin className="h-7 w-7 text-muted-foreground/50" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Leads from pins
              </p>
              <p className="text-xl font-semibold sm:text-2xl">
                {stats.leadsFromPins}
              </p>
            </div>
            <Target className="h-7 w-7 text-muted-foreground/50" />
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          Route map
        </h2>
        <FieldDayMap pins={filteredMapPins} heightClassName="h-72 sm:h-80" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-8 text-center text-sm text-destructive">
          {error}
        </div>
      ) : visibleFieldDays.length === 0 ? (
        <div className="rounded-md border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          No field days for this date.
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visit reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibleFieldDays.map((fd) => {
              const pins = sortPinsChronologically(fd.pins);
              const leadsCreated = pins.filter((p) => p.lead_id).length;
              return (
                <div
                  key={fd.id}
                  className="rounded-[5px] border border-border p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {fd.field_officer?.name ??
                          `Officer #${fd.field_officer_id}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(fd.field_date).toLocaleDateString()}
                      </p>
                      {fd.notes ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {fd.notes}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {pins.length} visit{pins.length === 1 ? "" : "s"}
                        {" · "}
                        {leadsCreated} lead{leadsCreated === 1 ? "" : "s"}{" "}
                        created
                      </p>
                    </div>
                    <Badge variant="outline">
                      {pins.length} pin{pins.length === 1 ? "" : "s"}
                    </Badge>
                  </div>

                  {pins.length > 0 ? (
                    <div className="mt-4 space-y-2 border-t border-border pt-4">
                      {pins.map((pin) => (
                        <FieldDayPinListItem
                          key={pin.id}
                          pin={pin}
                          compact
                          converting={convertingPinId === pin.id}
                          onQuickConvert={() => handleQuickConvert(pin.id)}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
