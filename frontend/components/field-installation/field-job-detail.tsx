"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  cancelFieldJob,
  completeFieldJob,
  createDesignChange,
  getFieldJob,
  holdFieldJob,
  issueTool,
  listDailyLogs,
  listDeliveries,
  listFieldPhotos,
  listNonConformities,
  listToolAssignments,
  recordDelivery,
  reportNonConformity,
  returnTool,
  startFieldJob,
  submitDailyLog,
  updateUnit,
  uploadFieldPhoto,
  type FieldDailyLog,
  type FieldDeliveryRecord,
  type FieldInstallationJob,
  type FieldNonConformity,
  type FieldPhoto,
  type FieldToolAssignment,
} from "@/lib/api/field-installation";
import { listTools, type Tool } from "@/lib/api/warehouse";

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

export function FieldJobDetail({ jobId }: Props) {
  const [job, setJob] = useState<FieldInstallationJob | null>(null);
  const [logs, setLogs] = useState<FieldDailyLog[]>([]);
  const [deliveries, setDeliveries] = useState<FieldDeliveryRecord[]>([]);
  const [ncs, setNcs] = useState<FieldNonConformity[]>([]);
  const [photos, setPhotos] = useState<FieldPhoto[]>([]);
  const [assignments, setAssignments] = useState<FieldToolAssignment[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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

  const [toolId, setToolId] = useState("");
  const [toolQty, setToolQty] = useState("1");
  const [toolIssuedTo, setToolIssuedTo] = useState("");
  const [returnForms, setReturnForms] = useState<Record<number, { condition_in: string; damage_notes: string }>>({});

  const [dcoReason, setDcoReason] = useState("");
  const [dcoNotes, setDcoNotes] = useState("");
  const [ncType, setNcType] = useState("other");
  const [ncTitle, setNcTitle] = useState("");
  const [ncDescription, setNcDescription] = useState("");
  const [ncSeverity, setNcSeverity] = useState("minor");

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoCaption, setPhotoCaption] = useState("");

  const reload = useCallback(async () => {
    const [jobRes, logsRes, delRes, ncRes, photoRes, toolRes, warehouseTools] = await Promise.all([
      getFieldJob(jobId),
      listDailyLogs(jobId),
      listDeliveries(jobId),
      listNonConformities(jobId),
      listFieldPhotos({ job_id: jobId }),
      listToolAssignments(jobId),
      listTools({ active_only: true }),
    ]);
    setJob(jobRes.data);
    setLogs(logsRes.data);
    setDeliveries(delRes.data);
    setNcs(ncRes.data);
    setPhotos(photoRes.data);
    setAssignments(toolRes.data);
    setTools(warehouseTools.data);
  }, [jobId]);

  useEffect(() => {
    reload().catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, [reload]);

  const memberOptions = useMemo(() => {
    const opts: { id: number; name: string }[] = [];
    if (job?.team_lead) opts.push(job.team_lead);
    for (const m of job?.members ?? []) {
      if (m.user && !opts.some((o) => o.id === m.user!.id)) opts.push({ id: m.user.id, name: m.user.name });
    }
    return opts;
  }, [job]);

  const sortedLogs = useMemo(() => [...logs].sort((a, b) => b.log_date.localeCompare(a.log_date)), [logs]);
  const selectedTool = tools.find((t) => t.id === Number(toolId));

  async function runAction(fn: () => Promise<unknown>) {
    setActionError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Action failed.");
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
    });
  }

  function patchLine(idx: number, patch: Partial<LineDraft>) {
    setDelLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Loading job…</p>;
  if (error || !job) return <p className="p-6 text-sm text-destructive">{error ?? "Job not found."}</p>;

  return (
    <div className="space-y-6 p-6">
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
        <span className="text-sm text-muted-foreground">{job.percent_complete}% complete</span>
        {job.status === "scheduled" && (
          <Button size="sm" onClick={() => runAction(() => startFieldJob(jobId))}>Start</Button>
        )}
        {job.status === "in_progress" && (
          <>
            <Button size="sm" variant="outline" onClick={() => runAction(() => holdFieldJob(jobId))}>Hold</Button>
            <Button size="sm" onClick={() => runAction(() => completeFieldJob(jobId))}>Mark installation done</Button>
          </>
        )}
        {(job.status === "scheduled" || job.status === "on_hold") && (
          <Button size="sm" variant="destructive" onClick={() => runAction(() => cancelFieldJob(jobId))}>Cancel</Button>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Site</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>{job.site_address ?? job.project?.name ?? "—"}</p>
          {job.site_contact_name && <p>{job.site_contact_name} · {job.site_contact_phone}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Units</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(job.units ?? []).length === 0 && <p className="text-sm text-muted-foreground">No units yet.</p>}
          {(job.units ?? []).map((unit) => (
            <div key={unit.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
              <span>{unit.unit_label}</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{unit.status}</Badge>
                {unit.status !== "installed" && (
                  <Button size="sm" variant="ghost" onClick={() => runAction(() => updateUnit(unit.id, { status: "installed" }))}>
                    Mark installed
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

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

      <Card>
        <CardHeader><CardTitle className="text-base">Site arrival inspection</CardTitle></CardHeader>
        <CardContent className="space-y-3">
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
            <div><Label>Expected units</Label><Input type="number" min={0} value={delExpected} onChange={(e) => setDelExpected(e.target.value)} /></div>
            <div><Label>Received units</Label><Input type="number" min={0} value={delReceived} onChange={(e) => setDelReceived(e.target.value)} /></div>
            <div className="sm:col-span-3"><Label>Notes</Label><Textarea value={delNotes} onChange={(e) => setDelNotes(e.target.value)} /></div>
          </div>
          <div className="space-y-2">
            <Label>Lines</Label>
            {delLines.map((line, idx) => (
              <div key={idx} className="grid gap-2 rounded border p-2 sm:grid-cols-4">
                <Input placeholder="Description" value={line.description} onChange={(e) => patchLine(idx, { description: e.target.value })} />
                <Input type="number" placeholder="Qty expected" value={line.qty_expected} onChange={(e) => patchLine(idx, { qty_expected: e.target.value })} />
                <Input type="number" placeholder="Qty received" value={line.qty_received} onChange={(e) => patchLine(idx, { qty_received: e.target.value })} />
                <Input placeholder="Condition notes" value={line.condition_notes} onChange={(e) => patchLine(idx, { condition_notes: e.target.value })} />
              </div>
            ))}
            <Button size="sm" variant="outline" type="button" onClick={() => setDelLines((p) => [...p, emptyLine()])}>Add line</Button>
          </div>
          <div>
            <Label>Delivery photos {(delCondition === "partial" || delCondition === "rejected") && "(required)"}</Label>
            <Input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(e) => setDelPhotoFiles(Array.from(e.target.files ?? []))} />
          </div>
          <Button size="sm" onClick={() => void handleRecordDelivery()}>Record delivery</Button>
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
          <ul className="space-y-1 text-sm text-muted-foreground">
            {deliveries.map((d) => (
              <li key={d.id} className="rounded border px-3 py-2">
                <span className="font-medium text-foreground">{d.delivery_condition}</span>
                {" · "}{d.received_at}
                {d.driver_name ? ` · ${d.driver_name}` : ""}
                {d.vehicle_reg ? ` · ${d.vehicle_reg}` : ""}
                {d.notes ? ` — ${d.notes}` : ""}
                {d.lines?.length ? (
                  <ul className="mt-1 text-xs">
                    {d.lines.map((l) => (
                      <li key={l.id}>
                        {l.description}: {l.qty_received}/{l.qty_expected}
                        {l.condition_notes ? ` (${l.condition_notes})` : ""}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Equipment</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Label>Tool</Label>
              <select className={selectCls} value={toolId} onChange={(e) => setToolId(e.target.value)}>
                <option value="">Select tool…</option>
                {tools.map((t) => (
                  <option key={t.id} value={t.id}>{t.tool_code} — {t.name} (avail {t.available_qty})</option>
                ))}
              </select>
              {selectedTool && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Total {selectedTool.total_qty} · Available {selectedTool.available_qty} · On-site {selectedTool.on_site_qty}
                </p>
              )}
            </div>
            <div><Label>Qty</Label><Input type="number" min={1} value={toolQty} onChange={(e) => setToolQty(e.target.value)} /></div>
            <div>
              <Label>Responsible</Label>
              {memberOptions.length > 0 ? (
                <select className={selectCls} value={toolIssuedTo} onChange={(e) => setToolIssuedTo(e.target.value)}>
                  <option value="">Select…</option>
                  {memberOptions.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} (#{m.id})</option>
                  ))}
                </select>
              ) : (
                <Input type="number" placeholder="User id" value={toolIssuedTo} onChange={(e) => setToolIssuedTo(e.target.value)} />
              )}
            </div>
          </div>
          <Button
            size="sm"
            disabled={!toolId || !toolIssuedTo}
            onClick={() =>
              runAction(async () => {
                await issueTool(jobId, { tool_id: Number(toolId), issued_to: Number(toolIssuedTo), quantity: Number(toolQty) || 1 });
                setToolId("");
                setToolQty("1");
              })
            }
          >
            Issue tool
          </Button>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-1 pr-2">Code</th>
                  <th className="py-1 pr-2">Name</th>
                  <th className="py-1 pr-2">Qty</th>
                  <th className="py-1 pr-2">T/A/OS</th>
                  <th className="py-1 pr-2">Responsible</th>
                  <th className="py-1 pr-2">Returned</th>
                  <th className="py-1">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => {
                  const tool = a.tool_issuance?.tool;
                  const form = returnForms[a.id] ?? { condition_in: "good", damage_notes: "" };
                  return (
                    <tr key={a.id} className="border-b align-top">
                      <td className="py-2 pr-2">{tool?.tool_code ?? "—"}</td>
                      <td className="py-2 pr-2">{tool?.name ?? "—"}</td>
                      <td className="py-2 pr-2">{a.tool_issuance?.quantity ?? 1}</td>
                      <td className="py-2 pr-2 text-xs">
                        {tool ? `${tool.total_qty ?? "—"}/${tool.available_qty ?? "—"}/${tool.on_site_qty ?? "—"}` : "—"}
                      </td>
                      <td className="py-2 pr-2">{a.tool_issuance?.issued_to_user?.name ?? a.tool_issuance?.issued_to ?? "—"}</td>
                      <td className="py-2 pr-2">{a.returned_at ? "Yes" : "No"}</td>
                      <td className="py-2">
                        {!a.returned_at && (
                          <div className="flex min-w-[200px] flex-col gap-1">
                            <Input
                              placeholder="Condition in"
                              value={form.condition_in}
                              onChange={(e) => setReturnForms((p) => ({ ...p, [a.id]: { ...form, condition_in: e.target.value } }))}
                            />
                            <Input
                              placeholder="Damage notes"
                              value={form.damage_notes}
                              onChange={(e) => setReturnForms((p) => ({ ...p, [a.id]: { ...form, damage_notes: e.target.value } }))}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                runAction(() =>
                                  returnTool(a.id, {
                                    condition_in: form.condition_in || undefined,
                                    damage_notes: form.damage_notes || undefined,
                                  }),
                                )
                              }
                            >
                              Return
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {assignments.length === 0 && <p className="text-sm text-muted-foreground">No tools issued.</p>}
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}
