"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  cancelFieldJob,
  completeFieldJob,
  createDesignChange,
  getFieldJob,
  holdFieldJob,
  listDailyLogs,
  listDeliveries,
  listFieldPhotos,
  listFieldUnits,
  listNonConformities,
  listToolAssignments,
  recordDelivery,
  reportNonConformity,
  startFieldJob,
  submitDailyLog,
  updateUnit,
  uploadFieldPhoto,
  updateDelivery,
  updateNonConformityStatus,
  type FieldDailyLog,
  type FieldDeliveryRecord,
  type FieldInstallationJob,
  type FieldInstallationUnit,
  type FieldNonConformity,
  type FieldPhoto,
  type FieldToolAssignment,
} from "@/lib/api/field-installation";
import { logProjectDelay } from "@/lib/api/projects";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Props = { jobId: number };
type LineDraft = { description: string; qty_expected: string; qty_received: string; condition_notes: string };
const emptyLine = (): LineDraft => ({ description: "", qty_expected: "1", qty_received: "1", condition_notes: "" });
const NC_TYPES = ["wrong_measurement", "dimension_mismatch", "damage_transit", "damage_site", "shortage", "other"] as const;
const selectCls = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

function photoUrl(p: FieldPhoto) {
  return p.url ?? p.firebase_url ?? null;
}
function logPhotos(log: FieldDailyLog, all: FieldPhoto[]) {
  return log.photos?.length
    ? log.photos
    : all.filter((p) => p.attachable_type === "daily_log" && p.attachable_id === log.id);
}
function unitPhotos(unit: FieldInstallationUnit, all: FieldPhoto[]) {
  return unit.photos?.length
    ? unit.photos
    : all.filter((p) => p.attachable_type === "unit_progress" && p.attachable_id === unit.id);
}
function deliveryPhotos(delivery: FieldDeliveryRecord, all: FieldPhoto[]) {
  return all.filter((p) => p.attachable_type === "delivery" && p.attachable_id === delivery.id);
}
function floorKey(unit: FieldInstallationUnit) {
  return unit.unit_floor?.trim() || "Unspecified floor";
}
function formatQty(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(3)));
}
function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function conditionBadgeClass(condition: string) {
  if (condition === "complete") return "bg-success/10 text-success";
  if (condition === "partial") return "bg-warning/10 text-warning";
  if (condition === "rejected") return "bg-destructive/10 text-destructive";
  return "";
}

function EvidenceFilePreview({
  file,
  onClear,
}: {
  file: File;
  onClear: () => void;
}) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  if (!url) return null;

  return (
    <div className="relative w-28 overflow-hidden rounded border bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
      <img src={url} alt={file.name} className="aspect-square w-full object-cover" />
      <button
        type="button"
        className="absolute right-1 top-1 rounded bg-background/90 px-1.5 text-xs leading-5 shadow"
        onClick={onClear}
        aria-label={`Remove ${file.name}`}
      >
        ×
      </button>
      <p className="truncate px-1 py-0.5 text-[10px] text-muted-foreground">{file.name}</p>
    </div>
  );
}

export function FieldJobDetail({ jobId }: Props) {
  const [job, setJob] = useState<FieldInstallationJob | null>(null);
  const [units, setUnits] = useState<FieldInstallationUnit[]>([]);
  const [logs, setLogs] = useState<FieldDailyLog[]>([]);
  const [deliveries, setDeliveries] = useState<FieldDeliveryRecord[]>([]);
  const [ncs, setNcs] = useState<FieldNonConformity[]>([]);
  const [photos, setPhotos] = useState<FieldPhoto[]>([]);
  const [assignments, setAssignments] = useState<FieldToolAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [misfitDrafts, setMisfitDrafts] = useState<Record<number, string>>({});
  const [unitEvidenceFiles, setUnitEvidenceFiles] = useState<Record<number, File | null>>({});
  const [unitActionState, setUnitActionState] = useState<
    Record<number, "idle" | "marking" | "misfitting" | "waiving">
  >({});
  const [delayUnit, setDelayUnit] = useState<FieldInstallationUnit | null>(null);
  const [delayDays, setDelayDays] = useState("1");
  const [delayReason, setDelayReason] = useState("client_follow_up");
  const [delayNotes, setDelayNotes] = useState("");
  const [delaySaving, setDelaySaving] = useState(false);
  const [floorFilter, setFloorFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");

  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [logSummary, setLogSummary] = useState("");
  const [logUnits, setLogUnits] = useState("");
  const [logPercent, setLogPercent] = useState("");
  const [logWeather, setLogWeather] = useState("");
  const [logConditions, setLogConditions] = useState("");
  const [logBlockers, setLogBlockers] = useState("");
  const [logPhotoFiles, setLogPhotoFiles] = useState<File[]>([]);

  const [delCondition, setDelCondition] = useState("complete");
  const [delVehicle, setDelVehicle] = useState("");
  const [delDriver, setDelDriver] = useState("");
  const [delNotes, setDelNotes] = useState("");
  const [delExpected, setDelExpected] = useState("");
  const [delReceived, setDelReceived] = useState("");
  const [delLines, setDelLines] = useState<LineDraft[]>([emptyLine()]);
  const [delPhotoFiles, setDelPhotoFiles] = useState<File[]>([]);
  const [offerDamageNc, setOfferDamageNc] = useState(false);
  const [pendingDamageNotes, setPendingDamageNotes] = useState("");
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<FieldDeliveryRecord | null>(null);
  const [editCondition, setEditCondition] = useState("complete");
  const [editVehicle, setEditVehicle] = useState("");
  const [editDriver, setEditDriver] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editExpected, setEditExpected] = useState("");
  const [editReceived, setEditReceived] = useState("");
  const [editLines, setEditLines] = useState<LineDraft[]>([emptyLine()]);
  const [editSaving, setEditSaving] = useState(false);

  const [dcoReason, setDcoReason] = useState("");
  const [dcoNotes, setDcoNotes] = useState("");
  const [ncType, setNcType] = useState("other");
  const [ncTitle, setNcTitle] = useState("");
  const [ncDescription, setNcDescription] = useState("");
  const [ncSeverity, setNcSeverity] = useState("minor");

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoCaption, setPhotoCaption] = useState("");

  const reload = useCallback(async () => {
    const [jobRes, unitsRes, logsRes, delRes, ncRes, photoRes, toolRes] = await Promise.all([
      getFieldJob(jobId),
      listFieldUnits(jobId),
      listDailyLogs(jobId),
      listDeliveries(jobId),
      listNonConformities(jobId),
      listFieldPhotos({ job_id: jobId }),
      listToolAssignments(jobId),
    ]);
    setJob(jobRes.data);
    setUnits(unitsRes.data);
    setLogs(logsRes.data);
    setDeliveries(delRes.data);
    setNcs(ncRes.data);
    setPhotos(photoRes.data);
    setAssignments(toolRes.data);
  }, [jobId]);

  useEffect(() => {
    reload().catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, [reload]);

  useEffect(() => {
    const dispatch = job?.assigned_dispatch;
    if (!dispatch) return;

    const driverName = dispatch.driver?.name?.trim() ?? "";
    const vehicle =
      dispatch.vehicle_reg?.trim() ||
      dispatch.driver?.vehicle_registration?.trim() ||
      "";

    if (driverName) {
      setDelDriver((prev) => (prev.trim() ? prev : driverName));
    }
    if (vehicle) {
      setDelVehicle((prev) => (prev.trim() ? prev : vehicle));
    }
  }, [job?.id, job?.assigned_dispatch?.id, job?.assigned_dispatch?.driver?.name, job?.assigned_dispatch?.vehicle_reg]);

  const sortedLogs = useMemo(() => [...logs].sort((a, b) => b.log_date.localeCompare(a.log_date)), [logs]);
  const floorOptions = useMemo(() => {
    const set = new Set<string>();
    for (const unit of units) set.add(floorKey(unit));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [units]);
  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const unit of units) {
      const type = unit.product_type?.trim();
      if (type) set.add(type);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [units]);
  const filteredUnits = useMemo(() => {
    return units.filter((unit) => {
      if (floorFilter !== "all" && floorKey(unit) !== floorFilter) return false;
      if (typeFilter !== "all") {
        const type = unit.product_type?.trim() || "Unspecified";
        if (type !== typeFilter) return false;
      }
      return true;
    });
  }, [units, floorFilter, typeFilter]);
  const unitsByFloor = useMemo(() => {
    const groups = new Map<string, Map<string, FieldInstallationUnit[]>>();
    const sorted = [...filteredUnits].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    for (const unit of sorted) {
      const floor = floorKey(unit);
      const room = unit.room_location?.trim() || "Unspecified room";
      const floorMap = groups.get(floor) ?? new Map<string, FieldInstallationUnit[]>();
      const list = floorMap.get(room) ?? [];
      list.push(unit);
      floorMap.set(room, list);
      groups.set(floor, floorMap);
    }
    return Array.from(groups.entries()).map(([floor, rooms]) => [
      floor,
      Array.from(rooms.entries()),
    ] as const);
  }, [filteredUnits]);
  const allOpeningsDone = useMemo(() => {
    if (units.length === 0) return false;
    return units.every((u) => u.status === "installed" || u.status === "waived");
  }, [units]);
  const installedCount = useMemo(
    () => units.filter((u) => u.status === "installed" || u.status === "waived").length,
    [units],
  );
  const openingStats = useMemo(() => {
    const floors = new Set<string>();
    const byType: Record<string, number> = {};
    const byFloorRoom: Array<{
      floor: string;
      room: string;
      total: number;
      done: number;
    }> = [];
    const rollup = new Map<string, { total: number; done: number }>();
    for (const unit of units) {
      floors.add(floorKey(unit));
      const type = unit.product_type?.trim() || "Other";
      byType[type] = (byType[type] ?? 0) + (unit.quantity ?? 1);
      const room = unit.room_location?.trim() || "Unspecified room";
      const key = `${floorKey(unit)}||${room}`;
      const bucket = rollup.get(key) ?? { total: 0, done: 0 };
      bucket.total += 1;
      if (unit.status === "installed" || unit.status === "waived") bucket.done += 1;
      rollup.set(key, bucket);
    }
    for (const [key, stats] of rollup.entries()) {
      const [floor, room] = key.split("||");
      byFloorRoom.push({ floor, room, total: stats.total, done: stats.done });
    }
    byFloorRoom.sort((a, b) =>
      a.floor === b.floor ? a.room.localeCompare(b.room) : a.floor.localeCompare(b.floor),
    );
    return {
      floors: floors.size,
      total: units.length,
      byType,
      byFloorRoom,
      toolsOnSite: assignments.filter((a) => !a.returned_at && !a.tool_issuance?.return_date).length,
      toolsTotal: assignments.length,
      deliveries: deliveries.length,
      openNcs: ncs.filter((n) => n.status === "open" || n.status === "acknowledged").length,
    };
  }, [units, assignments, deliveries, ncs]);

  const [delPhotoPreviews, setDelPhotoPreviews] = useState<Array<{ name: string; url: string }>>([]);

  useEffect(() => {
    const next = delPhotoFiles.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
    setDelPhotoPreviews(next);
    return () => {
      for (const preview of next) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [delPhotoFiles]);

  async function runAction(fn: () => Promise<unknown>) {
    setActionError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      const message = getApiErrorMessage(e, "Action failed.");
      setActionError(message);
      toast.error(message);
    }
  }

  async function handleMarkUnitInstalled(unit: FieldInstallationUnit) {
    if (unitActionState[unit.id] && unitActionState[unit.id] !== "idle") return;

    const file = unitEvidenceFiles[unit.id];
    const hasExistingPhoto = unitPhotos(unit, photos).length > 0;
    if (!file && !hasExistingPhoto) {
      const message = "Upload a photo before marking this opening done.";
      setActionError(message);
      toast.error(message);
      return;
    }

    const previous = unit;
    setActionError(null);
    setUnitActionState((prev) => ({ ...prev, [unit.id]: "marking" }));
    setUnits((prev) =>
      prev.map((u) =>
        u.id === unit.id
          ? { ...u, status: "installed", installed_at: new Date().toISOString() }
          : u,
      ),
    );

    try {
      if (file) {
        await uploadFieldPhoto({
          job_id: jobId,
          file,
          attachable_type: "unit_progress",
          attachable_id: unit.id,
          caption: `Installed evidence — ${unit.unit_label}`,
        });
      }
      await updateUnit(unit.id, { status: "installed" });
      setUnitEvidenceFiles((prev) => ({ ...prev, [unit.id]: null }));

      const relatedNc = ncs.find(
        (nc) =>
          (nc.status === "open" || nc.status === "acknowledged") &&
          (nc.nc_type === "dimension_mismatch" || nc.nc_type === "wrong_measurement") &&
          (nc.title.toLowerCase().includes(unit.unit_label.toLowerCase()) ||
            nc.description.toLowerCase().includes(unit.unit_label.toLowerCase())),
      );
      if (relatedNc) {
        try {
          await updateNonConformityStatus(relatedNc.id, {
            status: "resolved",
            resolution_notes: "Remade opening installed on site.",
          });
        } catch {
          // Opening is installed even if NC resolve fails.
        }
      }

      toast.success(`${unit.unit_label} marked done.`);
      await reload();
    } catch (e) {
      setUnits((prev) => prev.map((u) => (u.id === unit.id ? previous : u)));
      const message = getApiErrorMessage(e, "Failed to mark opening done.");
      setActionError(message);
      toast.error(message);
    } finally {
      setUnitActionState((prev) => ({ ...prev, [unit.id]: "idle" }));
    }
  }

  async function handleWaiveUnit(unit: FieldInstallationUnit) {
    if (unitActionState[unit.id] && unitActionState[unit.id] !== "idle") return;
    const notes =
      (misfitDrafts[unit.id] ?? "").trim() ||
      unit.misfit_notes?.trim() ||
      unit.snag_notes?.trim() ||
      "Waived after remake / client acceptance";

    const previous = unit;
    setActionError(null);
    setUnitActionState((prev) => ({ ...prev, [unit.id]: "waiving" }));
    setUnits((prev) =>
      prev.map((u) =>
        u.id === unit.id
          ? { ...u, status: "waived", snag_notes: notes, misfit_notes: notes }
          : u,
      ),
    );

    try {
      await updateUnit(unit.id, {
        status: "waived",
        snag_notes: notes,
        misfit_notes: notes,
      });
      toast.success(`${unit.unit_label} waived — can complete install.`);
      await reload();
    } catch (e) {
      setUnits((prev) => prev.map((u) => (u.id === unit.id ? previous : u)));
      const message = getApiErrorMessage(e, "Failed to waive opening.");
      setActionError(message);
      toast.error(message);
    } finally {
      setUnitActionState((prev) => ({ ...prev, [unit.id]: "idle" }));
    }
  }

  async function submitUnitDelay() {
    if (!delayUnit || !job?.project_id) return;
    setDelaySaving(true);
    try {
      await logProjectDelay(job.project_id, {
        stage: job.project?.stage || "installation",
        reason: delayReason,
        days_lost: Number(delayDays) || 0,
        notes:
          delayNotes ||
          `Misfit follow-up: ${delayUnit.unit_label}${
            delayUnit.misfit_notes || delayUnit.snag_notes
              ? ` — ${delayUnit.misfit_notes || delayUnit.snag_notes}`
              : ""
          }`,
      });
      toast.success("Client delay logged.");
      setDelayUnit(null);
      setDelayNotes("");
      setDelayDays("1");
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Failed to log delay."));
    } finally {
      setDelaySaving(false);
    }
  }

  async function handleRecordMisfit(unit: FieldInstallationUnit) {
    if (unitActionState[unit.id] && unitActionState[unit.id] !== "idle") return;

    const notes = (misfitDrafts[unit.id] ?? "").trim();
    if (!notes) {
      const message = "Describe the misfit or misalignment before recording.";
      setActionError(message);
      toast.error(message);
      return;
    }

    const previous = unit;
    const file = unitEvidenceFiles[unit.id];
    setActionError(null);
    setUnitActionState((prev) => ({ ...prev, [unit.id]: "misfitting" }));
    setUnits((prev) =>
      prev.map((u) =>
        u.id === unit.id
          ? { ...u, status: "snagged", snag_notes: notes, misfit_notes: notes }
          : u,
      ),
    );

    try {
      if (file) {
        await uploadFieldPhoto({
          job_id: jobId,
          file,
          attachable_type: "unit_progress",
          attachable_id: unit.id,
          caption: `Misfit evidence — ${unit.unit_label}`,
        });
      }

      await updateUnit(unit.id, {
        status: "snagged",
        snag_notes: notes,
        misfit_notes: notes,
      });

      try {
        await createDesignChange(jobId, {
          nc_type: "dimension_mismatch",
          severity: "major",
          title: `Misfit: ${unit.unit_label}`,
          description: [
            notes,
            unit.unit_floor ? `Floor: ${unit.unit_floor}` : null,
            unit.room_location ? `Room: ${unit.room_location}` : null,
            unit.opening_ref ? `Opening: ${unit.opening_ref}` : null,
          ]
            .filter(Boolean)
            .join(" · "),
          field_installation_unit_id: unit.id,
          reason: `Misfit / plan change — ${unit.unit_label}`,
          measurement_notes: {
            notes,
            unit_label: unit.unit_label,
            unit_floor: unit.unit_floor,
            room_location: unit.room_location,
            opening_ref: unit.opening_ref,
            product_type: unit.product_type,
          },
        });
      } catch (ncError) {
        toast.warning(
          getApiErrorMessage(
            ncError,
            "Opening marked as misfit, but design change could not be created.",
          ),
        );
      }

      setMisfitDrafts((prev) => ({ ...prev, [unit.id]: "" }));
      setUnitEvidenceFiles((prev) => ({ ...prev, [unit.id]: null }));
      toast.success(`Misfit recorded for ${unit.unit_label}.`);
      await reload();
    } catch (e) {
      setUnits((prev) => prev.map((u) => (u.id === unit.id ? previous : u)));
      const message = getApiErrorMessage(e, "Failed to record misfit.");
      setActionError(message);
      toast.error(message);
    } finally {
      setUnitActionState((prev) => ({ ...prev, [unit.id]: "idle" }));
    }
  }

  async function handleSubmitDailyLog() {
    await runAction(async () => {
      const res = await submitDailyLog(jobId, {
        log_date: logDate,
        summary: logSummary,
        units_completed: logUnits ? Number(logUnits) : undefined,
        percent_today: logPercent ? Number(logPercent) : undefined,
        weather: logWeather || undefined,
        site_conditions: logConditions || undefined,
        blockers: logBlockers || undefined,
      });
      for (const file of logPhotoFiles) {
        await uploadFieldPhoto({ job_id: jobId, file, attachable_type: "daily_log", attachable_id: res.data.id });
      }
      setLogSummary("");
      setLogUnits("");
      setLogPercent("");
      setLogWeather("");
      setLogConditions("");
      setLogBlockers("");
      setLogPhotoFiles([]);
    });
  }

  async function handleRecordDelivery() {
    const needsPhoto = delCondition === "partial" || delCondition === "rejected";
    if (needsPhoto && delPhotoFiles.length === 0) {
      setActionError("At least one photo is required for partial/rejected deliveries.");
      return;
    }
    const lines = delLines
      .filter((l) => l.description.trim())
      .map((l) => ({
        description: l.description.trim(),
        qty_expected: Number(l.qty_expected) || 0,
        qty_received: Number(l.qty_received) || 0,
        condition_notes: l.condition_notes || undefined,
      }));
    const hasDamageNotes = !!delNotes.trim() || lines.some((l) => !!l.condition_notes?.trim());

    await runAction(async () => {
      const res = await recordDelivery(jobId, {
        delivery_condition: delCondition,
        vehicle_reg: delVehicle || undefined,
        driver_name: delDriver || undefined,
        notes: delNotes || undefined,
        expected_units: delExpected ? Number(delExpected) : undefined,
        received_units: delReceived ? Number(delReceived) : undefined,
        acknowledge_partial_without_nc: delCondition === "partial",
        skip_nc_check: needsPhoto,
        lines: lines.length ? lines : undefined,
      });
      for (const file of delPhotoFiles) {
        await uploadFieldPhoto({ job_id: jobId, file, attachable_type: "delivery", attachable_id: res.data.id });
      }
      if (needsPhoto && hasDamageNotes) {
        setPendingDamageNotes(
          [delNotes, ...lines.map((l) => l.condition_notes).filter(Boolean)].filter(Boolean).join("; "),
        );
        setOfferDamageNc(true);
      }
      setDelVehicle("");
      setDelDriver("");
      setDelNotes("");
      setDelExpected("");
      setDelReceived("");
      setDelLines([emptyLine()]);
      setDelPhotoFiles([]);
      setDelCondition("complete");
      setShowDeliveryForm(false);
    });
  }

  function openAddDeliveryForm() {
    setShowDeliveryForm(true);
    setOfferDamageNc(false);
    const dispatch = job?.assigned_dispatch;
    if (dispatch) {
      const driverName = dispatch.driver?.name?.trim() ?? "";
      const vehicle =
        dispatch.vehicle_reg?.trim() ||
        dispatch.driver?.vehicle_registration?.trim() ||
        "";
      if (driverName) setDelDriver(driverName);
      if (vehicle) setDelVehicle(vehicle);
    }
  }

  function patchLine(idx: number, patch: Partial<LineDraft>) {
    setDelLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function openEditDelivery(delivery: FieldDeliveryRecord) {
    setEditingDelivery(delivery);
    setEditCondition(delivery.delivery_condition || "complete");
    setEditVehicle(delivery.vehicle_reg ?? "");
    setEditDriver(delivery.driver_name ?? "");
    setEditNotes(delivery.notes ?? "");
    setEditExpected(
      delivery.expected_units === null || delivery.expected_units === undefined
        ? ""
        : String(delivery.expected_units),
    );
    setEditReceived(
      delivery.received_units === null || delivery.received_units === undefined
        ? ""
        : String(delivery.received_units),
    );
    setEditLines(
      delivery.lines?.length
        ? delivery.lines.map((l) => ({
            description: l.description,
            qty_expected: formatQty(l.qty_expected),
            qty_received: formatQty(l.qty_received),
            condition_notes: l.condition_notes ?? "",
          }))
        : [emptyLine()],
    );
  }

  function patchEditLine(idx: number, patch: Partial<LineDraft>) {
    setEditLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  async function handleSaveDeliveryEdit() {
    if (!editingDelivery) return;
    setEditSaving(true);
    try {
      await updateDelivery(editingDelivery.id, {
        delivery_condition: editCondition,
        vehicle_reg: editVehicle || undefined,
        driver_name: editDriver || undefined,
        notes: editNotes || undefined,
        expected_units: editExpected ? Number(editExpected) : undefined,
        received_units: editReceived ? Number(editReceived) : undefined,
        lines: editLines
          .filter((l) => l.description.trim())
          .map((l) => ({
            description: l.description.trim(),
            qty_expected: Number(l.qty_expected) || 0,
            qty_received: Number(l.qty_received) || 0,
            condition_notes: l.condition_notes || undefined,
          })),
      });
      toast.success("Delivery updated.");
      setEditingDelivery(null);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update delivery.");
    } finally {
      setEditSaving(false);
    }
  }

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Loading job…</p>;
  if (error || !job) return <p className="p-6 text-sm text-destructive">{error ?? "Job not found."}</p>;

  return (
    <div className="space-y-4 p-6">
      {actionError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {actionError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary">{job.status.replace(/_/g, " ")}</Badge>
        {job.project?.stage && (
          <Badge variant="outline">Stage: {job.project.stage.replace(/_/g, " ")}</Badge>
        )}
        <span className="text-sm text-muted-foreground">
          {job.percent_complete}% · {installedCount}/{units.length} openings
        </span>
        {job.status === "scheduled" && (
          <Button size="sm" onClick={() => runAction(() => startFieldJob(jobId))}>Start job</Button>
        )}
        {job.status === "in_progress" && (
          <Button size="sm" variant="outline" onClick={() => runAction(() => holdFieldJob(jobId))}>Hold</Button>
        )}
        {(job.status === "scheduled" || job.status === "on_hold") && (
          <Button size="sm" variant="destructive" onClick={() => runAction(() => cancelFieldJob(jobId))}>Cancel</Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="arrival">Arrival</TabsTrigger>
          <TabsTrigger value="install">Install</TabsTrigger>
          <TabsTrigger value="daily">Daily log</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="complete">Complete</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Floors</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">{openingStats.floors}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Openings</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">{openingStats.total}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Tools on site</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">
                {openingStats.toolsOnSite}
                <span className="text-sm font-normal text-muted-foreground"> / {openingStats.toolsTotal}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Open issues</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">{openingStats.openNcs}</CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Project</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Reference</span><span>{job.reference}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Project</span><span className="text-right">{job.project?.name ?? `Project #${job.project_id}`}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Project ref</span><span>{job.project?.reference ?? "—"}</span></div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Wave</span>
                  <span>
                    {job.wave
                      ? job.wave.label || `Wave ${job.wave.wave_number}`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Job type</span><span className="capitalize">{job.job_type.replace(/_/g, " ")}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Install mode</span><span className="capitalize">{(job.project?.install_mode ?? "—").replace(/_/g, " ")}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Team lead</span><span>{job.team_lead?.name ?? "—"}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground">Schedule</span><span>{job.scheduled_start ?? "—"} → {job.scheduled_end ?? "—"}</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Location</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>{job.site_address ?? "No site address recorded"}</p>
                {job.site_contact_name ? (
                  <p className="text-muted-foreground">{job.site_contact_name}{job.site_contact_phone ? ` · ${job.site_contact_phone}` : ""}</p>
                ) : (
                  <p className="text-muted-foreground">No site contact</p>
                )}
                {job.notes && <p className="border-t pt-2 text-muted-foreground">{job.notes}</p>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Openings by type</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(openingStats.byType).length === 0 ? (
                <p className="text-sm text-muted-foreground">No measured openings yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(openingStats.byType).map(([type, count]) => (
                    <Badge key={type} variant="secondary" className="px-3 py-1 text-sm">
                      {type}: {count}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Equipment issued</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Allocated from warehouse to this project. Field view is read-only.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-1 pr-2">Code</th>
                      <th className="py-1 pr-2">Name</th>
                      <th className="py-1 pr-2">Qty</th>
                      <th className="py-1 pr-2">Responsible</th>
                      <th className="py-1 pr-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a) => {
                      const tool = a.tool_issuance?.tool;
                      const returned = Boolean(a.returned_at || a.tool_issuance?.return_date);
                      const conditionIn = a.tool_issuance?.condition_in;
                      const statusLabel = !returned
                        ? "On site"
                        : conditionIn === "lost"
                          ? "Lost"
                          : conditionIn === "damaged" || conditionIn === "retired"
                            ? "Returned damaged"
                            : "Returned";
                      return (
                        <tr key={a.id} className="border-b">
                          <td className="py-2 pr-2">{tool?.tool_code ?? "—"}</td>
                          <td className="py-2 pr-2">{tool?.name ?? "—"}</td>
                          <td className="py-2 pr-2">{a.tool_issuance?.quantity ?? 1}</td>
                          <td className="py-2 pr-2">{a.tool_issuance?.issued_to_user?.name ?? a.tool_issuance?.issued_to ?? "—"}</td>
                          <td className="py-2 pr-2">{statusLabel}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {assignments.length === 0 && (
                  <p className="text-sm text-muted-foreground">No equipment allocated yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="arrival" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-base">Site arrival inspection</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Review recorded deliveries, then add or edit as needed.
                </p>
              </div>
              {!showDeliveryForm ? (
                <Button size="sm" onClick={openAddDeliveryForm}>
                  Add delivery
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setShowDeliveryForm(false)}>
                  Cancel add
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium">Recorded deliveries</h3>
                  <Badge variant="secondary">{deliveries.length}</Badge>
                </div>
                {deliveries.length === 0 ? (
                  <div className="rounded-lg border border-dashed px-4 py-8 text-center">
                    <p className="text-sm text-muted-foreground">No deliveries recorded yet.</p>
                    {!showDeliveryForm ? (
                      <Button size="sm" className="mt-3" onClick={openAddDeliveryForm}>
                        Record first delivery
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deliveries.map((d) => {
                      const imgs = deliveryPhotos(d, photos);
                      return (
                        <div key={d.id} className="rounded-lg border bg-card p-4 shadow-sm">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant="secondary"
                                  className={`capitalize ${conditionBadgeClass(d.delivery_condition)}`}
                                >
                                  {d.delivery_condition}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {formatDateTime(d.received_at)}
                                </span>
                              </div>
                              <p className="text-sm">
                                {d.driver_name ? (
                                  <span className="font-medium text-foreground">{d.driver_name}</span>
                                ) : (
                                  <span className="text-muted-foreground">No driver listed</span>
                                )}
                                {d.vehicle_reg ? (
                                  <span className="text-muted-foreground"> · {d.vehicle_reg}</span>
                                ) : null}
                                {d.receiver?.name ? (
                                  <span className="text-muted-foreground"> · Received by {d.receiver.name}</span>
                                ) : null}
                              </p>
                              {(d.expected_units != null || d.received_units != null) && (
                                <p className="text-xs text-muted-foreground">
                                  Units {formatQty(d.received_units)} / {formatQty(d.expected_units)} expected
                                </p>
                              )}
                              {d.notes ? (
                                <p className="text-sm text-muted-foreground">{d.notes}</p>
                              ) : null}
                            </div>
                            <Button size="sm" variant="outline" onClick={() => openEditDelivery(d)}>
                              Edit
                            </Button>
                          </div>

                          {d.lines && d.lines.length > 0 ? (
                            <div className="mt-3 overflow-hidden rounded-md border">
                              <table className="w-full text-sm">
                                <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                                  <tr>
                                    <th className="px-3 py-2 font-medium">Item</th>
                                    <th className="px-3 py-2 font-medium">Expected</th>
                                    <th className="px-3 py-2 font-medium">Received</th>
                                    <th className="px-3 py-2 font-medium">Notes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {d.lines.map((l) => (
                                    <tr key={l.id} className="border-t">
                                      <td className="px-3 py-2">{l.description}</td>
                                      <td className="px-3 py-2">{formatQty(l.qty_expected)}</td>
                                      <td className="px-3 py-2">{formatQty(l.qty_received)}</td>
                                      <td className="px-3 py-2 text-muted-foreground">
                                        {l.condition_notes || "—"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : null}

                          {imgs.length > 0 ? (
                            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                              {imgs.map((p) => {
                                const src = photoUrl(p);
                                return src ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    key={p.id}
                                    src={src}
                                    alt={p.caption ?? "Delivery photo"}
                                    className="aspect-square w-full rounded object-cover"
                                  />
                                ) : null;
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {offerDamageNc && !showDeliveryForm ? (
                <div className="rounded border border-warning/40 bg-warning/5 p-3 text-sm">
                  <p className="mb-2">Damage notes detected. Report transit damage NC?</p>
                  <Button
                    size="sm"
                    onClick={() =>
                      runAction(async () => {
                        await reportNonConformity(jobId, {
                          nc_type: "damage_transit",
                          severity: "major",
                          title: "Transit damage on arrival",
                          description: pendingDamageNotes || "Damage noted during site arrival inspection.",
                        });
                        setOfferDamageNc(false);
                        setPendingDamageNotes("");
                      })
                    }
                  >
                    Report damage_transit NC
                  </Button>
                </div>
              ) : null}

              {showDeliveryForm ? (
                <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                  <h3 className="text-sm font-medium">New delivery</h3>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div>
                      <Label>Condition</Label>
                      <select className={selectCls} value={delCondition} onChange={(e) => setDelCondition(e.target.value)}>
                        <option value="complete">Complete</option>
                        <option value="partial">Partial</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                    <div><Label>Vehicle reg</Label><Input value={delVehicle} onChange={(e) => setDelVehicle(e.target.value)} /></div>
                    <div><Label>Driver</Label><Input value={delDriver} onChange={(e) => setDelDriver(e.target.value)} /></div>
                    {job.assigned_dispatch?.driver ? (
                      <p className="sm:col-span-3 text-xs text-muted-foreground">
                        Prefill from dispatch: {job.assigned_dispatch.driver.code} · {job.assigned_dispatch.driver.name}
                        {job.assigned_dispatch.driver.phone ? ` · ${job.assigned_dispatch.driver.phone}` : ""}
                        {" · "}
                        {job.assigned_dispatch.status.replace(/_/g, " ")}
                      </p>
                    ) : null}
                    <div><Label>Expected units</Label><Input type="number" min={0} value={delExpected} onChange={(e) => setDelExpected(e.target.value)} /></div>
                    <div><Label>Received units</Label><Input type="number" min={0} value={delReceived} onChange={(e) => setDelReceived(e.target.value)} /></div>
                    <div className="sm:col-span-3"><Label>Notes</Label><Textarea value={delNotes} onChange={(e) => setDelNotes(e.target.value)} /></div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <Label>Delivery lines</Label>
                      <p className="text-xs text-muted-foreground">
                        Break down what arrived (frames, glass, hardware, etc.) and compare expected vs received.
                      </p>
                    </div>
                    <div className="hidden gap-2 px-2 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[minmax(0,2fr)_5.5rem_5.5rem_minmax(0,1.5fr)_auto]">
                      <span>Item / description</span>
                      <span>Expected qty</span>
                      <span>Received qty</span>
                      <span>Condition notes</span>
                      <span className="w-8" />
                    </div>
                    {delLines.map((line, idx) => (
                      <div
                        key={idx}
                        className="grid gap-2 rounded border bg-background p-2 sm:grid-cols-[minmax(0,2fr)_5.5rem_5.5rem_minmax(0,1.5fr)_auto]"
                      >
                        <div className="space-y-1">
                          <Label className="sm:hidden">Item / description</Label>
                          <Input
                            placeholder="e.g. Sliding door frame — Unit A1"
                            value={line.description}
                            onChange={(e) => patchLine(idx, { description: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="sm:hidden">Expected qty</Label>
                          <Input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={line.qty_expected}
                            onChange={(e) => patchLine(idx, { qty_expected: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="sm:hidden">Received qty</Label>
                          <Input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={line.qty_received}
                            onChange={(e) => patchLine(idx, { qty_received: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="sm:hidden">Condition notes</Label>
                          <Input
                            placeholder="Damage, shortage, ok…"
                            value={line.condition_notes}
                            onChange={(e) => patchLine(idx, { condition_notes: e.target.value })}
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            type="button"
                            className="h-9 w-8 px-0"
                            disabled={delLines.length <= 1}
                            onClick={() => setDelLines((prev) => prev.filter((_, i) => i !== idx))}
                            aria-label="Remove line"
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button size="sm" variant="outline" type="button" onClick={() => setDelLines((p) => [...p, emptyLine()])}>
                      Add line
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Delivery photos{" "}
                      {(delCondition === "partial" || delCondition === "rejected") && "(required)"}
                    </Label>
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      onChange={(e) => setDelPhotoFiles(Array.from(e.target.files ?? []))}
                    />
                    {delPhotoPreviews.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                        {delPhotoPreviews.map((preview, idx) => (
                          <div key={`${preview.name}-${idx}`} className="relative overflow-hidden rounded border bg-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                            <img
                              src={preview.url}
                              alt={preview.name}
                              className="aspect-square w-full object-cover"
                            />
                            <button
                              type="button"
                              className="absolute right-1 top-1 rounded bg-background/90 px-1.5 text-xs leading-5 shadow"
                              onClick={() =>
                                setDelPhotoFiles((prev) => prev.filter((_, i) => i !== idx))
                              }
                              aria-label={`Remove ${preview.name}`}
                            >
                              ×
                            </button>
                            <p className="truncate px-1 py-0.5 text-[10px] text-muted-foreground">{preview.name}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No photos selected yet.</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => void handleRecordDelivery()}>Record delivery</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowDeliveryForm(false)}>Cancel</Button>
                  </div>
                  {offerDamageNc && (
                    <div className="rounded border border-warning/40 bg-warning/5 p-3 text-sm">
                      <p className="mb-2">Damage notes detected. Report transit damage NC?</p>
                      <Button
                        size="sm"
                        onClick={() =>
                          runAction(async () => {
                            await reportNonConformity(jobId, {
                              nc_type: "damage_transit",
                              severity: "major",
                              title: "Transit damage on arrival",
                              description: pendingDamageNotes || "Damage noted during site arrival inspection.",
                            });
                            setOfferDamageNc(false);
                            setPendingDamageNotes("");
                          })
                        }
                      >
                        Report damage_transit NC
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="install" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Openings (site measurements)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {openingStats.byFloorRoom.length > 0 ? (
                <div className="space-y-2 rounded-md border p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Floor → room progress
                  </p>
                  <ul className="space-y-1.5 text-sm">
                    {openingStats.byFloorRoom.map((row) => (
                      <li
                        key={`${row.floor}-${row.room}`}
                        className="flex flex-wrap items-center justify-between gap-2"
                      >
                        <span>
                          {row.floor} · {row.room}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {row.done}/{row.total} done
                          {row.done === row.total && row.total > 0 ? " ✓" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[140px]">
                  <Label>Floor</Label>
                  <select className={selectCls} value={floorFilter} onChange={(e) => setFloorFilter(e.target.value)}>
                    <option value="all">All floors</option>
                    {floorOptions.map((floor) => (
                      <option key={floor} value={floor}>{floor}</option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[140px]">
                  <Label>Type</Label>
                  <select className={selectCls} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                    <option value="all">All types</option>
                    {typeOptions.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <p className="pb-2 text-xs text-muted-foreground">
                  {installedCount}/{units.length} openings done
                  {!allOpeningsDone && units.length > 0 ? " — finish all before completing installation" : ""}
                </p>
              </div>
              {units.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No measured openings found. Approve a production site measurement visit so doors, windows, and bathrooms appear floor by floor.
                </p>
              )}
              {units.length > 0 && unitsByFloor.length === 0 && (
                <p className="text-sm text-muted-foreground">No openings match these filters.</p>
              )}
              {unitsByFloor.map(([floor, rooms]) => (
                <div key={floor} className="space-y-3">
                  <h3 className="text-sm font-semibold">{floor}</h3>
                  {rooms.map(([room, floorUnits]) => (
                    <div key={`${floor}-${room}`} className="space-y-2 pl-2">
                      <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {room}
                      </h4>
                  {floorUnits.map((unit) => {
                    const thumbs = unitPhotos(unit, photos);
                    const snap = unit.measurement_snapshot;
                    const dims =
                      snap?.width_centre_mm || snap?.height_centre_mm
                        ? `${snap?.width_centre_mm ?? "—"} × ${snap?.height_centre_mm ?? "—"} mm`
                        : null;
                    return (
                      <div key={unit.id} className="space-y-2 rounded border px-3 py-3 text-sm">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="font-medium">{unit.unit_label}</div>
                            <p className="text-xs text-muted-foreground">
                              {[
                                unit.product_type,
                                unit.opening_ref && `Ref ${unit.opening_ref}`,
                                unit.quantity && unit.quantity > 1 ? `Qty ${unit.quantity}` : null,
                                dims,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                            {(unit.misfit_notes || unit.snag_notes) && (
                              <p className="mt-1 text-xs text-warning">
                                Misfit: {unit.misfit_notes || unit.snag_notes}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              unit.status === "installed"
                                ? "bg-success/10 text-success"
                                : unit.status === "snagged"
                                  ? "bg-warning/10 text-warning"
                                  : ""
                            }
                          >
                            {unit.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        {thumbs.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {thumbs.map((p) => {
                              const src = photoUrl(p);
                              return src ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img key={p.id} src={src} alt={p.caption ?? "Opening evidence"} className="h-14 w-14 rounded object-cover" />
                              ) : null;
                            })}
                          </div>
                        )}
                        {unit.status !== "installed" && unit.status !== "waived" && unit.status !== "snagged" && (
                          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                            <Input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              disabled={Boolean(unitActionState[unit.id] && unitActionState[unit.id] !== "idle")}
                              onChange={(e) =>
                                setUnitEvidenceFiles((prev) => ({
                                  ...prev,
                                  [unit.id]: e.target.files?.[0] ?? null,
                                }))
                              }
                            />
                            <Button
                              size="sm"
                              disabled={unitActionState[unit.id] === "marking" || unitActionState[unit.id] === "misfitting"}
                              onClick={() => void handleMarkUnitInstalled(unit)}
                            >
                              {unitActionState[unit.id] === "marking" ? "Marking…" : "Mark done"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={unitActionState[unit.id] === "marking" || unitActionState[unit.id] === "misfitting"}
                              onClick={() => void handleRecordMisfit(unit)}
                            >
                              {unitActionState[unit.id] === "misfitting" ? "Recording…" : "Record misfit"}
                            </Button>
                            {unitEvidenceFiles[unit.id] ? (
                              <div className="sm:col-span-3">
                                <EvidenceFilePreview
                                  file={unitEvidenceFiles[unit.id]!}
                                  onClear={() =>
                                    setUnitEvidenceFiles((prev) => ({ ...prev, [unit.id]: null }))
                                  }
                                />
                              </div>
                            ) : null}
                            <Textarea
                              className="sm:col-span-3"
                              placeholder="Misfit / misalignment vs measured opening…"
                              disabled={unitActionState[unit.id] === "marking" || unitActionState[unit.id] === "misfitting"}
                              value={misfitDrafts[unit.id] ?? ""}
                              onChange={(e) =>
                                setMisfitDrafts((prev) => ({ ...prev, [unit.id]: e.target.value }))
                              }
                            />
                          </div>
                        )}
                        {unit.status === "snagged" ? (
                          <div className="space-y-2 rounded border border-warning/30 bg-warning/5 p-3">
                            <p className="text-xs text-muted-foreground">
                              Misfit recorded — production remakes this opening. When remake arrives,
                              mark it remade done (photo required) or waive to unblock install complete.
                            </p>
                            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                              <Input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                disabled={Boolean(
                                  unitActionState[unit.id] && unitActionState[unit.id] !== "idle",
                                )}
                                onChange={(e) =>
                                  setUnitEvidenceFiles((prev) => ({
                                    ...prev,
                                    [unit.id]: e.target.files?.[0] ?? null,
                                  }))
                                }
                              />
                              <Button
                                size="sm"
                                disabled={
                                  unitActionState[unit.id] === "marking" ||
                                  unitActionState[unit.id] === "waiving"
                                }
                                onClick={() => void handleMarkUnitInstalled(unit)}
                              >
                                {unitActionState[unit.id] === "marking"
                                  ? "Marking…"
                                  : "Mark remade done"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={
                                  unitActionState[unit.id] === "marking" ||
                                  unitActionState[unit.id] === "waiving"
                                }
                                onClick={() => void handleWaiveUnit(unit)}
                              >
                                {unitActionState[unit.id] === "waiving" ? "Waiving…" : "Waive"}
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setDelayUnit(unit);
                                  setDelayNotes(unit.misfit_notes || unit.snag_notes || "");
                                }}
                              >
                                Log delay
                              </Button>
                            </div>
                            {unitEvidenceFiles[unit.id] ? (
                              <EvidenceFilePreview
                                file={unitEvidenceFiles[unit.id]!}
                                onClear={() =>
                                  setUnitEvidenceFiles((prev) => ({ ...prev, [unit.id]: null }))
                                }
                              />
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Daily activity</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <div><Label>Date</Label><Input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} /></div>
                <div><Label>Units completed</Label><Input type="number" min={0} value={logUnits} onChange={(e) => setLogUnits(e.target.value)} /></div>
                <div><Label>% today</Label><Input type="number" min={0} max={100} value={logPercent} onChange={(e) => setLogPercent(e.target.value)} /></div>
                <div className="sm:col-span-3"><Label>Summary</Label><Textarea value={logSummary} onChange={(e) => setLogSummary(e.target.value)} /></div>
                <div><Label>Weather</Label><Input value={logWeather} onChange={(e) => setLogWeather(e.target.value)} /></div>
                <div><Label>Site conditions</Label><Input value={logConditions} onChange={(e) => setLogConditions(e.target.value)} /></div>
                <div><Label>Blockers</Label><Input value={logBlockers} onChange={(e) => setLogBlockers(e.target.value)} /></div>
                <div className="sm:col-span-3">
                  <Label>Photos</Label>
                  <Input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(e) => setLogPhotoFiles(Array.from(e.target.files ?? []))} />
                </div>
              </div>
              <Button size="sm" disabled={!logSummary.trim()} onClick={() => void handleSubmitDailyLog()}>Submit log</Button>
              <ul className="space-y-2 text-sm">
                {sortedLogs.map((log) => {
                  const thumbs = logPhotos(log, photos);
                  return (
                    <li key={log.id} className="rounded border px-3 py-2">
                      <div className="font-medium">
                        {log.log_date}
                        {log.units_completed ? ` · ${log.units_completed} units` : ""}
                        {log.percent_today ? ` · ${log.percent_today}%` : ""}
                      </div>
                      <p className="text-muted-foreground">{log.summary}</p>
                      {(log.weather || log.site_conditions || log.blockers) && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[log.weather && `Weather: ${log.weather}`, log.site_conditions && `Site: ${log.site_conditions}`, log.blockers && `Blockers: ${log.blockers}`]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      {thumbs.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {thumbs.map((p) => {
                            const src = photoUrl(p);
                            return src ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={p.id} src={src} alt={p.caption ?? "Log photo"} className="h-14 w-14 rounded object-cover" />
                            ) : null;
                          })}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Design change</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea placeholder="Reason" value={dcoReason} onChange={(e) => setDcoReason(e.target.value)} />
              <Textarea placeholder="Measurement notes" value={dcoNotes} onChange={(e) => setDcoNotes(e.target.value)} />
              <Button
                size="sm"
                disabled={!dcoReason.trim()}
                onClick={() =>
                  runAction(async () => {
                    await createDesignChange(jobId, {
                      nc_type: "wrong_measurement",
                      severity: "major",
                      title: "Field design change",
                      description: dcoReason,
                      reason: dcoReason,
                      measurement_notes: dcoNotes || undefined,
                    });
                    setDcoReason("");
                    setDcoNotes("");
                  })
                }
              >
                Request design change
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Non-conformities</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label>NC type</Label>
                  <select className={selectCls} value={ncType} onChange={(e) => setNcType(e.target.value)}>
                    {NC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Severity</Label>
                  <select className={selectCls} value={ncSeverity} onChange={(e) => setNcSeverity(e.target.value)}>
                    <option value="minor">Minor</option>
                    <option value="major">Major</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <Input placeholder="Title" value={ncTitle} onChange={(e) => setNcTitle(e.target.value)} />
              <Textarea placeholder="Description" value={ncDescription} onChange={(e) => setNcDescription(e.target.value)} />
              <Button
                size="sm"
                disabled={!ncTitle.trim() || !ncDescription.trim()}
                onClick={() =>
                  runAction(async () => {
                    await reportNonConformity(jobId, { nc_type: ncType, severity: ncSeverity, title: ncTitle, description: ncDescription });
                    setNcTitle("");
                    setNcDescription("");
                  })
                }
              >
                Report NC
              </Button>
              <ul className="space-y-1 text-sm">
                {ncs.map((nc) => (
                  <li key={nc.id} className="rounded border px-3 py-2">
                    <span className="font-medium">{nc.title}</span> — {nc.nc_type} · {nc.severity} ({nc.status})
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="complete" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Complete installation</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <div className="rounded border p-3">
                  <p className="text-muted-foreground">Openings</p>
                  <p className="text-lg font-semibold">{installedCount}/{units.length} done</p>
                </div>
                <div className="rounded border p-3">
                  <p className="text-muted-foreground">Arrival records</p>
                  <p className="text-lg font-semibold">{openingStats.deliveries}</p>
                </div>
                <div className="rounded border p-3">
                  <p className="text-muted-foreground">Open issues</p>
                  <p className="text-lg font-semibold">{openingStats.openNcs}</p>
                </div>
              </div>
              {!allOpeningsDone && (
                <p className="text-sm text-muted-foreground">
                  Mark every opening done on the Install tab (with photo evidence) before completing the job.
                </p>
              )}
              {job.status === "in_progress" && (
                <Button
                  disabled={!allOpeningsDone}
                  onClick={() => runAction(() => completeFieldJob(jobId))}
                >
                  Mark installation done
                </Button>
              )}
              {job.status === "completed" && (
                <Badge variant="secondary">Installation completed</Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Photos</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
                <Input placeholder="Caption" value={photoCaption} onChange={(e) => setPhotoCaption(e.target.value)} />
                <Button
                  size="sm"
                  disabled={!photoFile}
                  onClick={() =>
                    runAction(async () => {
                      if (!photoFile) return;
                      await uploadFieldPhoto({
                        job_id: jobId,
                        file: photoFile,
                        attachable_type: "general",
                        attachable_id: jobId,
                        caption: photoCaption || undefined,
                      });
                      setPhotoFile(null);
                      setPhotoCaption("");
                    })
                  }
                >
                  Upload
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {photos.map((photo) => {
                  const src = photoUrl(photo);
                  return (
                    <figure key={photo.id} className="overflow-hidden rounded border">
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt={photo.caption ?? "Field photo"} className="aspect-video w-full object-cover" />
                      ) : (
                        <div className="flex aspect-video items-center justify-center bg-muted text-xs text-muted-foreground">No preview</div>
                      )}
                      <figcaption className="px-3 py-2 text-xs">
                        {photo.attachable_type}{photo.caption ? ` · ${photo.caption}` : ""}
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={editingDelivery !== null}
        onOpenChange={(open) => {
          if (!open) setEditingDelivery(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit delivery</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label>Condition</Label>
                <select
                  className={selectCls}
                  value={editCondition}
                  onChange={(e) => setEditCondition(e.target.value)}
                >
                  <option value="complete">Complete</option>
                  <option value="partial">Partial</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <Label>Driver</Label>
                <Input value={editDriver} onChange={(e) => setEditDriver(e.target.value)} />
              </div>
              <div>
                <Label>Vehicle reg</Label>
                <Input value={editVehicle} onChange={(e) => setEditVehicle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Expected units</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editExpected}
                    onChange={(e) => setEditExpected(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Received units</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editReceived}
                    onChange={(e) => setEditReceived(e.target.value)}
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label>Notes</Label>
                <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Delivery lines</Label>
              <div className="hidden gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[minmax(0,2fr)_5.5rem_5.5rem_minmax(0,1.5fr)_auto]">
                <span>Item / description</span>
                <span>Expected</span>
                <span>Received</span>
                <span>Notes</span>
                <span className="w-8" />
              </div>
              {editLines.map((line, idx) => (
                <div
                  key={idx}
                  className="grid gap-2 rounded border p-2 sm:grid-cols-[minmax(0,2fr)_5.5rem_5.5rem_minmax(0,1.5fr)_auto]"
                >
                  <Input
                    placeholder="Item / description"
                    value={line.description}
                    onChange={(e) => patchEditLine(idx, { description: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={0}
                    value={line.qty_expected}
                    onChange={(e) => patchEditLine(idx, { qty_expected: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={0}
                    value={line.qty_received}
                    onChange={(e) => patchEditLine(idx, { qty_received: e.target.value })}
                  />
                  <Input
                    placeholder="Condition notes"
                    value={line.condition_notes}
                    onChange={(e) => patchEditLine(idx, { condition_notes: e.target.value })}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    className="h-9 w-8 px-0"
                    disabled={editLines.length <= 1}
                    onClick={() => setEditLines((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => setEditLines((p) => [...p, emptyLine()])}
              >
                Add line
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={editSaving} onClick={() => setEditingDelivery(null)}>
              Cancel
            </Button>
            <Button disabled={editSaving} onClick={() => void handleSaveDeliveryEdit()}>
              {editSaving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={delayUnit !== null} onOpenChange={(open) => !open && setDelayUnit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log client delay</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {job?.project?.reference} · {delayUnit?.unit_label}
            </p>
            <div>
              <Label>Reason</Label>
              <select
                className={selectCls}
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
              >
                <option value="client_follow_up">Client follow-up</option>
                <option value="awaiting_client_decision">Awaiting client decision</option>
                <option value="remeasure_required">Remeasure required</option>
                <option value="site_not_ready">Site not ready</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label>Days lost</Label>
              <Input
                type="number"
                min={0}
                value={delayDays}
                onChange={(e) => setDelayDays(e.target.value)}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Shown on client portal schedule notes…"
                value={delayNotes}
                onChange={(e) => setDelayNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={delaySaving} onClick={() => setDelayUnit(null)}>
              Cancel
            </Button>
            <Button disabled={delaySaving || !job?.project_id} onClick={() => void submitUnitDelay()}>
              {delaySaving ? "Saving…" : "Log delay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
