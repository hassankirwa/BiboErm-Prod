"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { CrmPageContent, CrmPageShell } from "@/components/crm/crm-page-shell";
import { MapPinPicker } from "@/components/crm/map-pin-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { BarChart3, MapPin, Navigation, Plus } from "lucide-react";
import {
  addFieldDayPin,
  convertFieldDayPinToLead,
  fetchFieldDays,
  startFieldDay,
  uploadFieldDayPinPhoto,
  type ApiFieldDay,
  type ApiFieldDayPin,
} from "@/lib/api/crm/field-day";
import { CrmSitePhotoPicker } from "@/components/crm/crm-site-photo-picker";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { useCrmFormLookups } from "@/hooks/use-crm-form-lookups";
import { getCountyBySlug, resolveCountyId } from "@/lib/kenya-locations";
import {
  FieldDayPinListItem,
  sortPinsChronologically,
} from "@/components/crm/field-day-pin-list-item";
import { toast } from "sonner";

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
  sitePhotoFiles: File[];
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
    sitePhotoFiles: [],
  };
}

type FieldDayWorkspaceProps = {
  /** Hide page chrome when nested inside another workspace (e.g. Activities tabs). */
  embedded?: boolean;
};

export function FieldDayWorkspace({ embedded = false }: FieldDayWorkspaceProps) {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { lookups } = useCrmFormLookups({ assignableRole: "field_officer" });
  const canView = can("field_day.view");
  const canManage = can("field_day.manage");
  const canCreateFieldDay = can("field_day.create");

  const today = new Date().toISOString().slice(0, 10);
  const [activeFieldDay, setActiveFieldDay] = useState<ApiFieldDay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [loggingPin, setLoggingPin] = useState(false);
  const [convertingPinId, setConvertingPinId] = useState<number | null>(null);
  const [pinDraft, setPinDraft] = useState<PinDraft>(emptyPinDraft);
  const [adminResolving, setAdminResolving] = useState(false);

  const loadTodayFieldDay = useCallback(async () => {
    if (!canView || !user?.id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetchFieldDays({
        field_date: today,
        field_officer_id: user.id,
        per_page: 5,
      });
      const mine = res.data.find((fd) => fd.field_officer_id === user.id);
      setActiveFieldDay(mine ?? null);
    } catch {
      setActiveFieldDay(null);
    } finally {
      setIsLoading(false);
    }
  }, [canView, today, user?.id]);

  useEffect(() => {
    loadTodayFieldDay();
  }, [loadTodayFieldDay]);

  const activePins = useMemo(
    () => sortPinsChronologically(activeFieldDay?.pins),
    [activeFieldDay?.pins],
  );

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

    const accuracy = pinDraft.gpsAccuracy;
    if (accuracy > 500) {
      toast.error(
        "GPS accuracy is too low (over 500 m). Move to an open area and log your location again.",
      );
      return;
    }

    setLoggingPin(true);
    try {
      await ensureCsrfCookie();
      const pin = await addFieldDayPin(activeFieldDay.id, {
        latitude: pinDraft.latitude!,
        longitude: pinDraft.longitude!,
        accuracy_m: Math.round(accuracy),
        captured_at: pinDraft.gpsCapturedAt,
        notes: pinDraft.notes.trim() || null,
        findings: pinDraft.findings.trim() || null,
        site_label: pinDraft.siteLabel.trim() || null,
        county_id: resolveCountyId(lookups?.counties, pinDraft.countySlug),
        subcounty: pinDraft.subcounty.trim() || null,
        ward: pinDraft.ward.trim() || null,
        location_address: pinDraft.locationAddress.trim() || null,
      });

      if (pinDraft.sitePhotoFiles.length > 0) {
        for (let i = 0; i < pinDraft.sitePhotoFiles.length; i += 1) {
          await uploadFieldDayPinPhoto(pin.id, pinDraft.sitePhotoFiles[i], {
            sort_order: i,
          });
        }
      }

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
      loadTodayFieldDay();
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

  const content = !canView ? (
    <p className="text-sm text-muted-foreground">
      You do not have permission to view field days.
    </p>
  ) : (
    <>
      {canCreateFieldDay ? (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Today&apos;s field day</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner className="h-8 w-8 text-primary" />
              </div>
            ) : !activeFieldDay ? (
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
                      {activePins.length} pin
                      {activePins.length === 1 ? "" : "s"}
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
                            <Badge variant="outline">
                              Sub-county not detected
                            </Badge>
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

                  <CrmSitePhotoPicker
                    files={pinDraft.sitePhotoFiles}
                    onChange={(files) =>
                      setPinDraft((d) => ({ ...d, sitePhotoFiles: files }))
                    }
                    hint="At least one site photo is required before converting this pin to a lead"
                  />

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
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-medium">Today&apos;s pins</h3>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href="/crm/field-day/reports">
                          View on route map
                        </Link>
                      </Button>
                    </div>
                    <div className="grid items-stretch gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {activePins.map((pin) => (
                        <FieldDayPinListItem
                          key={pin.id}
                          pin={pin}
                          className="h-full"
                          converting={convertingPinId === pin.id}
                          onQuickConvert={() => handleQuickConvert(pin)}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              You can view field day history and route maps in reports.
            </p>
            <Button size="sm" variant="secondary" asChild>
              <Link href="/crm/field-day/reports">Open reports</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Field Day</h2>
            <p className="text-sm text-muted-foreground">
              {canManage
                ? "Start today's visits or review historical reports"
                : "Log today's site visits and locations"}
            </p>
          </div>
          {canView ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" asChild className="gap-1.5">
                <Link href="/crm/field-day/reports">
                  <BarChart3 className="h-4 w-4" />
                  Reports
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/crm/site-visits/today">Today&apos;s Visits</Link>
              </Button>
            </div>
          ) : null}
        </div>
        {content}
      </div>
    );
  }

  return (
    <CrmPageShell>
      <AppHeader
        title="Field Day"
        subtitle={
          canManage
            ? "Start today's visits or review historical reports"
            : "Log today's site visits and locations"
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {canView ? (
              <Button size="sm" variant="outline" asChild className="gap-1.5">
                <Link href="/crm/field-day/reports">
                  <BarChart3 className="h-4 w-4" />
                  Field Day Reports
                </Link>
              </Button>
            ) : null}
            <Button size="sm" variant="outline" asChild>
              <Link href="/crm/site-visits/today">Today&apos;s Visits</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/field">Field</Link>
            </Button>
          </div>
        }
      />

      <CrmPageContent className="pb-8">{content}</CrmPageContent>
    </CrmPageShell>
  );
}
