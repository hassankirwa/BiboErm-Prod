"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AppHeader } from "@/components/app-header";
import { MapPinPicker } from "@/components/crm/map-pin-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  ExternalLink,
  MapPin,
  Navigation,
  Plus,
  Target,
  Users,
} from "lucide-react";
import {
  addFieldDayPin,
  convertFieldDayPinToLead,
  fetchFieldDays,
  formatPinAdminLine,
  formatPinGpsBadge,
  formatPinStreetLine,
  parseCoord,
  startFieldDay,
  type ApiFieldDay,
  type ApiFieldDayPin,
} from "@/lib/api/crm/field-day";
import { fetchCrmAssignableUsers } from "@/lib/api/crm/lookups";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { useCrmFormLookups } from "@/hooks/use-crm-form-lookups";
import { getCountyBySlug, resolveCountyId } from "@/lib/kenya-locations";
import { pinsToMapMarkers } from "@/components/crm/field-day-map";
import { toast } from "sonner";

const FieldDayMap = dynamic(
  () =>
    import("@/components/crm/field-day-map").then((mod) => mod.FieldDayMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-56 items-center justify-center rounded-lg border border-border bg-muted/30">
        <Spinner className="h-6 w-6 text-primary" />
      </div>
    ),
  },
);

type PinDraft = {
  latitude: number | null;
  longitude: number | null;
  gpsAccuracy: number | null;
  gpsCapturedAt: string | null;
  notes: string;
  findings: string;
  siteLabel: string;
  countySlug: string;
  subcounty: string;
  ward: string;
  locationAddress: string;
};

function emptyPinDraft(): PinDraft {
  return {
    latitude: null,
    longitude: null,
    gpsAccuracy: null,
    gpsCapturedAt: null,
    notes: "",
    findings: "",
    siteLabel: "",
    countySlug: "",
    subcounty: "",
    ward: "",
    locationAddress: "",
  };
}

function sortPinsChronologically(pins: ApiFieldDayPin[] = []) {
  return [...pins].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : a.id;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : b.id;
    return aTime - bTime;
  });
}

export default function FieldDayPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { lookups } = useCrmFormLookups({ assignableRole: "field_officer" });
  const canView = can("field_day.view");
  const canManage = can("field_day.manage");
  const canCreateFieldDay = can("field_day.create");

  const today = new Date().toISOString().slice(0, 10);
  const [dateFilter, setDateFilter] = useState(today);
  const [fieldDays, setFieldDays] = useState<ApiFieldDay[]>([]);
  const [activeFieldDay, setActiveFieldDay] = useState<ApiFieldDay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [loggingPin, setLoggingPin] = useState(false);
  const [convertingPinId, setConvertingPinId] = useState<number | null>(null);
  const [pinDraft, setPinDraft] = useState<PinDraft>(emptyPinDraft);
  const [adminResolving, setAdminResolving] = useState(false);
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
        field_officer_id:
          !canManage && user?.id ? user.id : undefined,
        per_page: 50,
      });
      setFieldDays(res.data);

      if (dateFilter === today && user?.id) {
        const mine = res.data.find(
          (fd) => fd.field_officer_id === user.id,
        );
        setActiveFieldDay(mine ?? null);
      } else {
        setActiveFieldDay(null);
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load field days.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [canManage, canView, dateFilter, today, user?.id]);

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

  const activePins = useMemo(
    () => sortPinsChronologically(activeFieldDay?.pins),
    [activeFieldDay?.pins],
  );

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

  const stats = useMemo(() => {
    const allPins = fieldDays.flatMap((fd) => fd.pins ?? []);
    return {
      fieldDays: fieldDays.length,
      officers: new Set(fieldDays.map((fd) => fd.field_officer_id)).size,
      pins: allPins.length,
      leadsFromPins: allPins.filter((pin) => pin.lead_id).length,
    };
  }, [fieldDays]);

  async function handleStartFieldDay() {
    if (!user?.id) return;
    setStarting(true);
    try {
      await ensureCsrfCookie();
      const fieldDay = await startFieldDay({
        field_date: today,
        field_officer_id: user.id,
      });
      setActiveFieldDay(fieldDay);
      toast.success(
        fieldDay.pins?.length
          ? "Resumed today's field day."
          : "Field day started.",
      );
      loadFieldDays();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to start field day.",
      );
    } finally {
      setStarting(false);
    }
  }

  async function handleSavePin() {
    if (!activeFieldDay) return;

    const hasGps =
      pinDraft.latitude != null &&
      pinDraft.longitude != null &&
      !Number.isNaN(pinDraft.latitude) &&
      !Number.isNaN(pinDraft.longitude) &&
      pinDraft.gpsAccuracy != null &&
      pinDraft.gpsCapturedAt != null;

    if (!hasGps) {
      toast.error(
        "Log your live GPS location before saving. Location search and manual pins are not allowed on field day.",
      );
      return;
    }

    if (pinDraft.gpsAccuracy > 500) {
      toast.error(
        "GPS accuracy is too low (over 500 m). Move to an open area and log your location again.",
      );
      return;
    }

    setLoggingPin(true);
    try {
      await ensureCsrfCookie();
      const pin = await addFieldDayPin(activeFieldDay.id, {
        latitude: pinDraft.latitude,
        longitude: pinDraft.longitude,
        accuracy_m: Math.round(pinDraft.gpsAccuracy),
        captured_at: pinDraft.gpsCapturedAt,
        notes: pinDraft.notes.trim() || null,
        findings: pinDraft.findings.trim() || null,
        site_label: pinDraft.siteLabel.trim() || null,
        county_id: resolveCountyId(lookups?.counties, pinDraft.countySlug),
        subcounty: pinDraft.subcounty.trim() || null,
        ward: pinDraft.ward.trim() || null,
        location_address: pinDraft.locationAddress.trim() || null,
      });

      setActiveFieldDay((current) =>
        current
          ? {
              ...current,
              pins: sortPinsChronologically([...(current.pins ?? []), pin]),
            }
          : current,
      );
      setPinDraft(emptyPinDraft());
      toast.success("Location logged.");
      loadFieldDays();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to log location.",
      );
    } finally {
      setLoggingPin(false);
    }
  }

  async function handleQuickConvert(pin: ApiFieldDayPin) {
    if (pin.lead_id) {
      toast.info("This pin is already linked to a lead.");
      return;
    }

    setConvertingPinId(pin.id);
    try {
      await ensureCsrfCookie();
      const lead = await convertFieldDayPinToLead(pin.id);
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

  const hasGpsCapture =
    pinDraft.latitude != null &&
    pinDraft.longitude != null &&
    pinDraft.gpsAccuracy != null &&
    pinDraft.gpsCapturedAt != null;

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title="Field Day"
        subtitle={
          canManage
            ? "Review field officer routes and visit pins"
            : "Log today's site visits and locations"
        }
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href="/crm/site-visits/today">Today&apos;s Visits</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/crm">CRM Home</Link>
            </Button>
          </div>
        }
      />

      {!canView ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">
            You do not have permission to view field days.
          </p>
        </div>
      ) : (
      <div className="flex-1 space-y-6 overflow-auto p-4 sm:p-6">
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
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Pins
                </p>
                <p className="text-xl font-semibold sm:text-2xl">
                  {stats.pins}
                </p>
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

        {dateFilter === today && canCreateFieldDay ? (
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Today&apos;s field day</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!activeFieldDay ? (
                <div className="rounded-md border border-dashed border-border px-4 py-8 text-center">
                  <Navigation className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">
                    Start your field day to begin logging locations.
                  </p>
                  <Button
                    className="mt-4 gap-1.5"
                    onClick={handleStartFieldDay}
                    disabled={starting || !user}
                  >
                    <Plus className="h-4 w-4" />
                    {starting ? "Starting…" : "Start field day"}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {activeFieldDay.field_officer?.name ?? user?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(activeFieldDay.field_date).toLocaleDateString()}
                        {" · "}
                        {activePins.length} pin{activePins.length === 1 ? "" : "s"}
                        {" · "}
                        {activePins.filter((p) => p.lead_id).length} lead
                        {activePins.filter((p) => p.lead_id).length === 1
                          ? ""
                          : "s"}
                      </p>
                    </div>
                    <Badge variant="outline">Active session</Badge>
                  </div>

                  <div className="space-y-3 rounded-lg border border-border p-4">
                    <Label className="text-sm font-medium">
                      Log location (live GPS only)
                    </Label>

                    <MapPinPicker
                      mode="gps-only"
                      latitude={pinDraft.latitude}
                      longitude={pinDraft.longitude}
                      gpsAccuracy={pinDraft.gpsAccuracy}
                      gpsCapturedAt={pinDraft.gpsCapturedAt}
                      mapHeightClassName="h-56 sm:h-64"
                      onChange={(lat, lng) => {
                        if (lat == null || lng == null) {
                          setAdminResolving(false);
                        }
                        setPinDraft((draft) => ({
                          ...draft,
                          latitude: lat,
                          longitude: lng,
                          ...(lat == null || lng == null
                            ? {
                                gpsAccuracy: null,
                                gpsCapturedAt: null,
                                countySlug: "",
                                subcounty: "",
                                ward: "",
                                locationAddress: "",
                              }
                            : {}),
                        }));
                      }}
                      onGeolocationCapture={({
                        latitude,
                        longitude,
                        accuracy,
                        capturedAt,
                      }) => {
                        setAdminResolving(true);
                        setPinDraft((draft) => ({
                          ...draft,
                          latitude,
                          longitude,
                          gpsAccuracy: accuracy,
                          gpsCapturedAt: capturedAt,
                          countySlug: "",
                          subcounty: "",
                          ward: "",
                          locationAddress: "",
                        }));
                      }}
                      onKenyaAdminSuggest={(admin) => {
                        const address = admin.addressLabel?.trim() ?? "";
                        setPinDraft((draft) => ({
                          ...draft,
                          countySlug: admin.countySlug ?? draft.countySlug,
                          subcounty: admin.subcounty ?? draft.subcounty,
                          ward: admin.ward ?? draft.ward,
                          locationAddress: admin.hasStreetDetail
                            ? address || draft.locationAddress
                            : "",
                        }));
                        if (!address || !admin.hasStreetDetail) {
                          toast.warning(
                            "Street address not detected — add location notes",
                          );
                        }
                      }}
                      onKenyaAdminResolveEnd={() => setAdminResolving(false)}
                    />

                    <div className="space-y-2">
                      <Label htmlFor="pin-site-label">Site label (optional)</Label>
                      <Input
                        id="pin-site-label"
                        value={pinDraft.siteLabel}
                        onChange={(e) =>
                          setPinDraft((d) => ({
                            ...d,
                            siteLabel: e.target.value,
                          }))
                        }
                        placeholder="e.g. Westlands office block"
                      />
                    </div>

                    {hasGpsCapture ? (
                      <div className="space-y-2">
                        <Label>Location area (from GPS)</Label>
                        {adminResolving ? (
                          <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Spinner className="h-4 w-4" />
                            Detecting county, sub-county, and ward…
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {pinDraft.countySlug ? (
                              <Badge variant="secondary">
                                {getCountyBySlug(pinDraft.countySlug)?.label ??
                                  pinDraft.countySlug}
                              </Badge>
                            ) : (
                              <Badge variant="outline">County not detected</Badge>
                            )}
                            {pinDraft.subcounty ? (
                              <Badge variant="secondary">{pinDraft.subcounty}</Badge>
                            ) : (
                              <Badge variant="outline">Sub-county not detected</Badge>
                            )}
                            {pinDraft.ward ? (
                              <Badge variant="secondary">{pinDraft.ward}</Badge>
                            ) : null}
                          </div>
                        )}
                        {pinDraft.locationAddress ? (
                          <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              Captured address
                            </p>
                            <p className="text-sm font-semibold text-foreground">
                              {pinDraft.locationAddress}
                            </p>
                          </div>
                        ) : !adminResolving ? (
                          <p className="text-sm text-muted-foreground">
                            Street address could not be detected from GPS.
                          </p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          County, sub-county, and ward are filled automatically from
                          your GPS capture. Add location notes if the street line is
                          missing.
                        </p>
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <Label htmlFor="pin-notes">Location notes</Label>
                      <Textarea
                        id="pin-notes"
                        value={pinDraft.notes}
                        onChange={(e) =>
                          setPinDraft((d) => ({ ...d, notes: e.target.value }))
                        }
                        placeholder="Address, landmark, or access instructions"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pin-findings">Findings</Label>
                      <Textarea
                        id="pin-findings"
                        value={pinDraft.findings}
                        onChange={(e) =>
                          setPinDraft((d) => ({
                            ...d,
                            findings: e.target.value,
                          }))
                        }
                        placeholder="Site observations, measurements, product interest…"
                      />
                    </div>

                    <Button
                      className="w-full gap-1.5 sm:w-auto"
                      onClick={handleSavePin}
                      disabled={
                        loggingPin ||
                        pinDraft.latitude == null ||
                        pinDraft.gpsAccuracy == null ||
                        pinDraft.gpsCapturedAt == null
                      }
                    >
                      <MapPin className="h-4 w-4" />
                      {loggingPin ? "Saving pin…" : "Save location pin"}
                    </Button>
                  </div>

                  {activePins.length > 0 ? (
                    <>
                      <FieldDayMap
                        pins={pinsToMapMarkers(activePins)}
                        showSearch={false}
                      />
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium">Today&apos;s pins</h3>
                        {activePins.map((pin) => (
                          <PinListItem
                            key={pin.id}
                            pin={pin}
                            converting={convertingPinId === pin.id}
                            onQuickConvert={() => handleQuickConvert(pin)}
                          />
                        ))}
                      </div>
                    </>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        ) : null}

        {canManage || dateFilter !== today ? (
          <>
            <FieldDayMap
              pins={
                selectedOfficerId
                  ? managementPins.filter((pin) => {
                      const fd = fieldDays.find((day) =>
                        day.pins?.some((p) => p.id === pin.id),
                      );
                      return (
                        fd &&
                        String(fd.field_officer_id) === selectedOfficerId
                      );
                    })
                  : managementPins
              }
              heightClassName="h-72"
            />

            {isLoading ? (
              <div className="flex justify-center py-16">
                <Spinner className="h-8 w-8 text-primary" />
              </div>
            ) : error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-8 text-center text-sm text-destructive">
                {error}
              </div>
            ) : fieldDays.length === 0 ? (
              <div className="rounded-md border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
                No field days for this date.
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Field day reports</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {fieldDays
                    .filter(
                      (fd) =>
                        !selectedOfficerId ||
                        String(fd.field_officer_id) === selectedOfficerId,
                    )
                    .map((fd) => {
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
                                {leadsCreated} lead
                                {leadsCreated === 1 ? "" : "s"} created
                              </p>
                            </div>
                            <Badge variant="outline">
                              {pins.length} pin{pins.length === 1 ? "" : "s"}
                            </Badge>
                          </div>

                          {pins.length > 0 ? (
                            <div className="mt-4 space-y-2 border-t border-border pt-4">
                              {pins.map((pin) => (
                                <PinListItem
                                  key={pin.id}
                                  pin={pin}
                                  compact
                                  converting={convertingPinId === pin.id}
                                  onQuickConvert={() => handleQuickConvert(pin)}
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
          </>
        ) : null}
      </div>
      )}
    </div>
  );
}

function PinListItem({
  pin,
  compact = false,
  converting,
  onQuickConvert,
}: {
  pin: ApiFieldDayPin;
  compact?: boolean;
  converting: boolean;
  onQuickConvert: () => void;
}) {
  const latitude = parseCoord(pin.latitude);
  const longitude = parseCoord(pin.longitude);
  const adminLine = formatPinAdminLine(pin);
  const streetLine = formatPinStreetLine(pin);
  const gpsBadge = formatPinGpsBadge(pin);
  const timeLabel = pin.created_at
    ? new Date(pin.created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      className={`rounded-md border border-border ${compact ? "p-3" : "p-4"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">
              {pin.site_label || pin.notes || `Pin #${pin.id}`}
            </p>
            {timeLabel ? (
              <span className="text-xs text-muted-foreground">{timeLabel}</span>
            ) : null}
            {pin.lead_id ? (
              <Badge variant="secondary" className="text-xs">
                Lead linked
              </Badge>
            ) : null}
          </div>
          {streetLine ? (
            <p className="text-sm font-semibold text-foreground">{streetLine}</p>
          ) : null}
          {adminLine ? (
            <p className="text-xs text-muted-foreground">{adminLine}</p>
          ) : null}
          {gpsBadge ? (
            <Badge variant="outline" className="text-xs font-normal">
              {gpsBadge}
            </Badge>
          ) : latitude != null && longitude != null ? (
            <Badge variant="outline" className="text-xs font-normal">
              GPS verified
            </Badge>
          ) : null}
          {pin.notes && pin.notes !== streetLine ? (
            <p className={`text-sm text-muted-foreground ${compact ? "line-clamp-2" : ""}`}>
              {pin.notes}
            </p>
          ) : null}
          {pin.findings ? (
            <p className={`text-sm ${compact ? "line-clamp-2" : ""}`}>
              {pin.findings}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          {pin.lead_id ? (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/crm/leads/${pin.lead_id}`}>
                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                View lead
              </Link>
            </Button>
          ) : (
            <>
              <Button size="sm" asChild>
                <Link href={`/crm/leads/new?from_pin=${pin.id}`}>
                  Create lead from pin
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onQuickConvert}
                disabled={converting}
              >
                {converting ? "Creating…" : "Quick create lead"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
