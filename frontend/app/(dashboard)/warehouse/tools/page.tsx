"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createTool,
  issueTool,
  listToolIncidents,
  listToolIssuances,
  listTools,
  returnTool,
  updateToolIncident,
  type Tool,
  type ToolIncident,
  type ToolIssuance,
} from "@/lib/api/warehouse";
import { listProjects, type ProjectSummary } from "@/lib/api/projects";
import { fetchUsers, type ApiUserDetail } from "@/lib/api/users";
import { getApiErrorMessage } from "@/lib/api/errors";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const selectClassName =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50";

const INSTALL_STAGES = new Set([
  "qc_pre_installation",
  "in_transit",
  "installation",
  "site_qc",
  "snagging",
]);

function formatStage(stage?: string | null) {
  return (stage ?? "—").replace(/_/g, " ");
}

export default function WarehouseToolsPage() {
  const [tab, setTab] = useState("register");
  const [items, setItems] = useState<Tool[]>([]);
  const [issuances, setIssuances] = useState<ToolIssuance[]>([]);
  const [incidents, setIncidents] = useState<ToolIncident[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [issuancesLoading, setIssuancesLoading] = useState(true);
  const [users, setUsers] = useState<ApiUserDetail[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [returningIssuanceId, setReturningIssuanceId] = useState<number | null>(null);
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnForm, setReturnForm] = useState({
    disposition: "returned" as "returned" | "damaged" | "lost" | "replaced",
    notes: "",
    replacement_name: "",
    replacement_code: "",
  });
  const [issuingToolId, setIssuingToolId] = useState<number | null>(null);
  const [issueForProjectId, setIssueForProjectId] = useState<number | null>(null);
  const [issueSubmitting, setIssueSubmitting] = useState(false);
  const [issueForm, setIssueForm] = useState<{
    issued_to: string;
    project_id: string;
    /** toolId -> quantity string */
    selected: Record<number, string>;
  }>({
    issued_to: "",
    project_id: "",
    selected: {},
  });
  const [form, setForm] = useState({
    tool_code: "",
    name: "",
    tool_type: "",
    condition: "good",
    purchase_date: "",
    tracking_mode: "serialized" as "serialized" | "quantity",
    total_qty: "1",
  });

  const resetIssueForm = () => {
    setIssuingToolId(null);
    setIssueForProjectId(null);
    setIssueSubmitting(false);
    setIssueForm({ issued_to: "", project_id: "", selected: {} });
  };

  const availableTools = useMemo(
    () => items.filter((tool) => (tool.available_qty ?? 0) > 0),
    [items],
  );

  const selectedToolIds = useMemo(
    () => Object.keys(issueForm.selected).map(Number),
    [issueForm.selected],
  );

  const issueDialogOpen = issuingToolId !== null || issueForProjectId !== null;

  const loadTools = useCallback(() => {
    setLoading(true);
    listTools()
      .then((res) => setItems(res.data))
      .catch((error: Error) => toast.error(error.message || "Failed to load tools."))
      .finally(() => setLoading(false));
  }, []);

  const loadIssuances = useCallback(() => {
    setIssuancesLoading(true);
    listToolIssuances({ open_only: true })
      .then((res) => setIssuances(res.data))
      .catch((error: Error) => toast.error(error.message || "Failed to load issuances."))
      .finally(() => setIssuancesLoading(false));
  }, []);

  const loadIncidents = useCallback(() => {
    setIncidentsLoading(true);
    listToolIncidents()
      .then((res) => setIncidents(res.data))
      .catch((error: Error) => toast.error(getApiErrorMessage(error, "Failed to load incidents.")))
      .finally(() => setIncidentsLoading(false));
  }, []);

  const reloadAll = useCallback(() => {
    loadTools();
    loadIssuances();
    loadIncidents();
  }, [loadTools, loadIssuances, loadIncidents]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  useEffect(() => {
    Promise.all([fetchUsers({ status: "active" }), listProjects({ per_page: 100 })])
      .then(([usersRes, projectsRes]) => {
        setUsers(usersRes.data);
        setProjects(projectsRes.data);
      })
      .catch((error: Error) => toast.error(error.message || "Failed to load issue options."))
      .finally(() => setOptionsLoading(false));
  }, []);

  const installationProjects = useMemo(() => {
    return projects.filter((p) => INSTALL_STAGES.has(p.stage));
  }, [projects]);

  const installationIssuances = useMemo(() => {
    return issuances.filter((i) => i.project && INSTALL_STAGES.has(i.project.stage));
  }, [issuances]);

  const issuancesByProject = useMemo(() => {
    const map = new Map<
      number,
      { project: NonNullable<ToolIssuance["project"]>; rows: ToolIssuance[] }
    >();
    for (const row of installationIssuances) {
      if (!row.project) continue;
      const existing = map.get(row.project.id);
      if (existing) {
        existing.rows.push(row);
      } else {
        map.set(row.project.id, { project: row.project, rows: [row] });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.project.reference.localeCompare(b.project.reference),
    );
  }, [installationIssuances]);

  const projectsNeedingTools = useMemo(() => {
    const withTools = new Set(issuancesByProject.map((g) => g.project.id));
    return installationProjects
      .filter((p) => !withTools.has(p.id))
      .sort((a, b) => a.reference.localeCompare(b.reference));
  }, [installationProjects, issuancesByProject]);

  const issueProjectOptions = useMemo(() => {
    const preferred = projects.filter((p) => INSTALL_STAGES.has(p.stage));
    const others = projects.filter((p) => !INSTALL_STAGES.has(p.stage));
    return [...preferred, ...others];
  }, [projects]);

  const openIssueForTool = (toolId: number, projectId?: number) => {
    setIssuingToolId(toolId);
    setIssueForProjectId(projectId ?? null);
    setIssueForm({
      issued_to: "",
      project_id: projectId ? String(projectId) : "",
      selected: { [toolId]: "1" },
    });
  };

  const openIssueForProject = (projectId: number) => {
    setIssuingToolId(null);
    setIssueForProjectId(projectId);
    setIssueForm({
      issued_to: "",
      project_id: String(projectId),
      selected: {},
    });
  };

  const toggleIssueTool = (tool: Tool, checked: boolean) => {
    setIssueForm((current) => {
      const next = { ...current.selected };
      if (checked) {
        next[tool.id] = next[tool.id] ?? "1";
      } else {
        delete next[tool.id];
      }
      return { ...current, selected: next };
    });
  };

  const setIssueToolQty = (toolId: number, quantity: string) => {
    setIssueForm((current) => {
      if (!(toolId in current.selected)) return current;
      return {
        ...current,
        selected: { ...current.selected, [toolId]: quantity },
      };
    });
  };

  const selectAllAvailableTools = () => {
    const selected: Record<number, string> = {};
    for (const tool of availableTools) {
      selected[tool.id] = issueForm.selected[tool.id] ?? "1";
    }
    setIssueForm((current) => ({ ...current, selected }));
  };

  const clearSelectedTools = () => {
    setIssueForm((current) => ({ ...current, selected: {} }));
  };

  const submit = async () => {
    try {
      await createTool({
        tool_code: form.tool_code,
        name: form.name,
        tool_type: form.tool_type || undefined,
        condition: form.condition,
        purchase_date: form.purchase_date || undefined,
        tracking_mode: form.tracking_mode,
        total_qty: form.tracking_mode === "quantity" ? Number(form.total_qty) || 1 : 1,
      });
      toast.success("Tool created.");
      setForm({
        tool_code: "",
        name: "",
        tool_type: "",
        condition: "good",
        purchase_date: "",
        tracking_mode: "serialized",
        total_qty: "1",
      });
      reloadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create tool.");
    }
  };

  const handleIssue = async () => {
    if (!issueForm.issued_to || !issueForm.project_id || selectedToolIds.length === 0) {
      return;
    }

    setIssueSubmitting(true);
    const failedIds = new Set<number>();
    let succeeded = 0;

    for (const toolId of selectedToolIds) {
      const qty = Number(issueForm.selected[toolId]) || 1;
      try {
        await issueTool(toolId, {
          issued_to: Number(issueForm.issued_to),
          project_id: Number(issueForm.project_id),
          quantity: qty,
        });
        succeeded += 1;
      } catch (error) {
        failedIds.add(toolId);
        if (failedIds.size === 1) {
          toast.error(
            error instanceof Error ? error.message : `Failed to issue tool #${toolId}.`,
          );
        }
      }
    }

    if (succeeded > 0 && failedIds.size === 0) {
      toast.success(
        succeeded === 1 ? "Tool issued to project." : `${succeeded} tools issued to project.`,
      );
      resetIssueForm();
      reloadAll();
      return;
    }

    if (succeeded > 0) {
      toast.warning(`Issued ${succeeded}, ${failedIds.size} failed — retry the remaining tools.`);
      setIssueForm((current) => {
        const remaining: Record<number, string> = {};
        for (const id of failedIds) {
          remaining[id] = current.selected[id] ?? "1";
        }
        return { ...current, selected: remaining };
      });
      reloadAll();
    }

    setIssueSubmitting(false);
  };

  const openReturnDialog = (issuanceId: number) => {
    setReturningIssuanceId(issuanceId);
    setReturnForm({
      disposition: "returned",
      notes: "",
      replacement_name: "",
      replacement_code: "",
    });
  };

  const applySilentReturn = (
    issuanceId: number,
    toolId: number,
    conditionIn?: string | null,
    disposition?: "returned" | "damaged" | "lost" | "replaced",
  ) => {
    setIssuances((prev) => prev.filter((row) => row.id !== issuanceId));
    setItems((prev) =>
      prev.map((tool) => {
        if (tool.id !== toolId) return tool;
        const qty = tool.active_issuance?.quantity ?? 1;
        const onSite = Math.max(0, (tool.on_site_qty ?? 0) - qty);
        const lostOrRetired = disposition === "lost" || conditionIn === "lost" || conditionIn === "retired";
        const damaged =
          disposition === "damaged" ||
          disposition === "replaced" ||
          conditionIn === "damaged";
        const restoreAvailable = !lostOrRetired && !damaged;
        return {
          ...tool,
          is_issued:
            tool.tracking_mode === "serialized"
              ? false
              : onSite > 0,
          on_site_qty: onSite,
          available_qty: restoreAvailable
            ? Math.max(0, (tool.available_qty ?? 0) + qty)
            : tool.available_qty,
          total_qty: lostOrRetired
            ? Math.max(0, (tool.total_qty ?? 1) - (tool.tracking_mode === "quantity" ? qty : 0))
            : tool.total_qty,
          qty_in_repair: damaged && !lostOrRetired
            ? (tool.qty_in_repair ?? 0) + (tool.tracking_mode === "quantity" ? qty : 0)
            : tool.qty_in_repair,
          active_issuance: tool.active_issuance?.id === issuanceId ? null : tool.active_issuance,
          condition: conditionIn ?? tool.condition,
        };
      }),
    );
  };

  const handleReturn = async () => {
    if (!returningIssuanceId) return;

    const toolId =
      items.find((tool) => tool.active_issuance?.id === returningIssuanceId)?.id ??
      issuances.find((row) => row.id === returningIssuanceId)?.tool_id;

    if (!toolId) {
      toast.error("Could not resolve tool for return.");
      return;
    }

    if (
      (returnForm.disposition === "damaged" ||
        returnForm.disposition === "lost" ||
        returnForm.disposition === "replaced") &&
      !returnForm.notes.trim()
    ) {
      toast.error("Add notes for damage, loss, or replacement.");
      return;
    }

    setReturnSubmitting(true);
    try {
      const res = await returnTool(returningIssuanceId, {
        disposition: returnForm.disposition,
        damage_notes: returnForm.notes.trim() || undefined,
        create_replacement: returnForm.disposition === "replaced",
        replacement:
          returnForm.disposition === "replaced"
            ? {
                name: returnForm.replacement_name || undefined,
                tool_code: returnForm.replacement_code || undefined,
              }
            : undefined,
      });
      applySilentReturn(returningIssuanceId, toolId, res.condition_in, returnForm.disposition);
      if (res.incident) {
        setIncidents((prev) => [
          res.incident as ToolIncident,
          ...prev.filter((i) => i.id !== res.incident?.id),
        ]);
      }
      setReturningIssuanceId(null);
      toast.success(
        returnForm.disposition === "lost"
          ? "Tool marked lost — install can complete."
          : returnForm.disposition === "replaced"
            ? "Tool returned and replacement registered."
            : returnForm.disposition === "damaged"
              ? "Tool returned with damage logged."
              : "Tool returned.",
      );
      void listTools().then((r) => setItems(r.data)).catch(() => undefined);
      void listToolIncidents().then((r) => setIncidents(r.data)).catch(() => undefined);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to return tool."));
    } finally {
      setReturnSubmitting(false);
    }
  };

  const canIssue = (tool: Tool) =>
    (tool.available_qty ?? 0) > 0 &&
    tool.condition !== "lost" &&
    tool.condition !== "retired" &&
    tool.condition !== "damaged";
  const canReturn = (tool: Tool) => Boolean(tool.active_issuance?.id);
  const returningTool =
    items.find((tool) => tool.active_issuance?.id === returningIssuanceId) ??
    items.find((tool) => tool.id === issuances.find((i) => i.id === returningIssuanceId)?.tool_id) ??
    null;

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Tools"
        subtitle="Register tools, track project issuances, and support field installation"
      />

      <div className="space-y-4 p-6">
        <Tabs value={tab} onValueChange={setTab} className="gap-4">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="register">Register</TabsTrigger>
            <TabsTrigger value="issuances">
              Open issuances
              {issuances.length > 0 ? (
                <Badge variant="secondary" className="ml-2">{issuances.length}</Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="installation">
              Installation projects
              {projectsNeedingTools.length > 0 ? (
                <Badge variant="secondary" className="ml-2">{projectsNeedingTools.length}</Badge>
              ) : issuancesByProject.length > 0 ? (
                <Badge variant="secondary" className="ml-2">{issuancesByProject.length}</Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="incidents">
              Damage / replacements
              {incidents.filter((i) => i.status === "open" || i.status === "in_repair").length > 0 ? (
                <Badge variant="secondary" className="ml-2">
                  {incidents.filter((i) => i.status === "open" || i.status === "in_repair").length}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="register" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
              <Card>
                <CardHeader>
                  <CardTitle>Register tool</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Tool code"
                    value={form.tool_code}
                    onChange={(event) => setForm((current) => ({ ...current, tool_code: event.target.value }))}
                  />
                  <Input
                    placeholder="Tool name"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  />
                  <Input
                    placeholder="Tool type"
                    value={form.tool_type}
                    onChange={(event) => setForm((current) => ({ ...current, tool_type: event.target.value }))}
                  />
                  <Input
                    placeholder="Condition"
                    value={form.condition}
                    onChange={(event) => setForm((current) => ({ ...current, condition: event.target.value }))}
                  />
                  <select
                    className={selectClassName}
                    value={form.tracking_mode}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        tracking_mode: event.target.value as "serialized" | "quantity",
                      }))
                    }
                  >
                    <option value="serialized">Serialized (1 unit)</option>
                    <option value="quantity">Quantity tracked</option>
                  </select>
                  {form.tracking_mode === "quantity" ? (
                    <Input
                      type="number"
                      min={1}
                      placeholder="Total quantity"
                      value={form.total_qty}
                      onChange={(event) => setForm((current) => ({ ...current, total_qty: event.target.value }))}
                    />
                  ) : null}
                  <Input
                    type="date"
                    value={form.purchase_date}
                    onChange={(event) => setForm((current) => ({ ...current, purchase_date: event.target.value }))}
                  />
                  <Button className="w-full" disabled={!form.tool_code || !form.name} onClick={submit}>
                    Register tool
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tool register</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Loading tools…</p>
                  ) : (
                    <div className="rounded-md border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tool</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Mode</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Avail</TableHead>
                            <TableHead>On site</TableHead>
                            <TableHead>Repair</TableHead>
                            <TableHead>Condition</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((tool) => (
                            <TableRow key={tool.id}>
                              <TableCell>
                                <div className="font-medium">{tool.name}</div>
                                <div className="text-xs text-muted-foreground">{tool.tool_code}</div>
                              </TableCell>
                              <TableCell>{tool.tool_type ?? "—"}</TableCell>
                              <TableCell className="capitalize">{tool.tracking_mode ?? "serialized"}</TableCell>
                              <TableCell>{tool.total_qty ?? 1}</TableCell>
                              <TableCell>{tool.available_qty ?? 0}</TableCell>
                              <TableCell>{tool.on_site_qty ?? 0}</TableCell>
                              <TableCell>{tool.qty_in_repair ?? 0}</TableCell>
                              <TableCell>{tool.condition ?? "—"}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className={
                                    tool.is_issued ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                                  }
                                >
                                  {tool.is_issued ? "Issued" : "Available"}
                                </Badge>
                              </TableCell>
                              <TableCell className="space-x-2 text-right">
                                {canReturn(tool) ? (
                                  <Button
                                    size="sm"
                                    onClick={() => openReturnDialog(tool.active_issuance!.id)}
                                  >
                                    Return
                                  </Button>
                                ) : null}
                                {canIssue(tool) ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openIssueForTool(tool.id)}
                                  >
                                    Issue
                                  </Button>
                                ) : null}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="issuances" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Open issuances</CardTitle>
              </CardHeader>
              <CardContent>
                {issuancesLoading ? (
                  <p className="text-sm text-muted-foreground">Loading issuances…</p>
                ) : issuances.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No open tool issuances.</p>
                ) : (
                  <div className="rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tool</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Stage</TableHead>
                          <TableHead>Responsible</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Issued</TableHead>
                          <TableHead>Field job</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {issuances.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <div className="font-medium">{row.tool?.name ?? "—"}</div>
                              <div className="text-xs text-muted-foreground">{row.tool?.tool_code}</div>
                            </TableCell>
                            <TableCell>
                              {row.project ? (
                                <Link
                                  href={`/projects/${row.project.id}`}
                                  className="text-primary hover:underline"
                                >
                                  {row.project.reference}
                                </Link>
                              ) : (
                                "—"
                              )}
                              {row.project?.name ? (
                                <div className="text-xs text-muted-foreground">{row.project.name}</div>
                              ) : null}
                            </TableCell>
                            <TableCell className="capitalize">{formatStage(row.project?.stage)}</TableCell>
                            <TableCell>{row.issued_to_user?.name ?? row.issued_to}</TableCell>
                            <TableCell>{row.quantity}</TableCell>
                            <TableCell>{row.issue_date ?? "—"}</TableCell>
                            <TableCell>
                              {row.field_job ? (
                                <Link
                                  href={`/field-installation/jobs/${row.field_job.id}`}
                                  className="text-primary hover:underline"
                                >
                                  {row.field_job.reference}
                                </Link>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" onClick={() => openReturnDialog(row.id)}>
                                Return
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="installation" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Install-stage projects
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">{installationProjects.length}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Needs tools
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold text-warning">
                  {projectsNeedingTools.length}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tools out
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">{issuancesByProject.length}</CardContent>
              </Card>
            </div>

            {optionsLoading || issuancesLoading ? (
              <p className="text-sm text-muted-foreground">Loading installation projects…</p>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Needs tools issued</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Installation-stage projects with no open tool issuances.
                    </p>
                  </CardHeader>
                  <CardContent>
                    {projectsNeedingTools.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        All install-stage projects have tools issued
                        {installationProjects.length === 0 ? " (none in install stages yet)." : "."}
                      </p>
                    ) : (
                      <div className="rounded-md border border-border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Project</TableHead>
                              <TableHead>Stage</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {projectsNeedingTools.map((project) => (
                              <TableRow key={project.id}>
                                <TableCell>
                                  <Link
                                    href={`/projects/${project.id}`}
                                    className="font-medium text-primary hover:underline"
                                  >
                                    {project.reference}
                                  </Link>
                                  <div className="text-xs text-muted-foreground">{project.name}</div>
                                </TableCell>
                                <TableCell className="capitalize">{formatStage(project.stage)}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="bg-warning/10 text-warning">
                                    No tools out
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    disabled={availableTools.length === 0}
                                    onClick={() => openIssueForProject(project.id)}
                                  >
                                    Issue tools
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    {projectsNeedingTools.length > 0 && availableTools.length === 0 ? (
                      <p className="mt-3 text-sm text-muted-foreground">
                        No available tools in the register. Register or return tools first.
                      </p>
                    ) : null}
                  </CardContent>
                </Card>

                {issuancesByProject.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Projects with tools out</h3>
                    {issuancesByProject.map(({ project, rows }) => (
                      <Card key={project.id}>
                        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                          <div>
                            <CardTitle className="text-base">
                              <Link href={`/projects/${project.id}`} className="hover:underline">
                                {project.reference}
                              </Link>
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {project.name} ·{" "}
                              <span className="capitalize">{formatStage(project.stage)}</span>
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">
                              {rows.length} tool{rows.length === 1 ? "" : "s"} out
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={availableTools.length === 0}
                              onClick={() => openIssueForProject(project.id)}
                            >
                              Issue more
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-md border border-border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Tool</TableHead>
                                  <TableHead>Responsible</TableHead>
                                  <TableHead>Qty</TableHead>
                                  <TableHead>Issued</TableHead>
                                  <TableHead>Field job</TableHead>
                                  <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {rows.map((row) => (
                                  <TableRow key={row.id}>
                                    <TableCell>
                                      <div className="font-medium">{row.tool?.name ?? "—"}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {row.tool?.tool_code}
                                      </div>
                                    </TableCell>
                                    <TableCell>{row.issued_to_user?.name ?? row.issued_to}</TableCell>
                                    <TableCell>{row.quantity}</TableCell>
                                    <TableCell>{row.issue_date ?? "—"}</TableCell>
                                    <TableCell>
                                      {row.field_job ? (
                                        <Link
                                          href={`/field-installation/jobs/${row.field_job.id}`}
                                          className="text-primary hover:underline"
                                        >
                                          {row.field_job.reference}
                                        </Link>
                                      ) : (
                                        "—"
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        size="sm"
                                        onClick={() => openReturnDialog(row.id)}
                                      >
                                        Return
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </TabsContent>

          <TabsContent value="incidents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Damage / loss / replacement registry</CardTitle>
              </CardHeader>
              <CardContent>
                {incidentsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading incidents…</p>
                ) : incidents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No tool incidents yet. Damaged, lost, or replaced returns appear here.
                  </p>
                ) : (
                  <div className="rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tool</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Responsible</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead>Replacement</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incidents.map((incident) => (
                          <TableRow key={incident.id}>
                            <TableCell>
                              <div className="font-medium">{incident.tool?.name ?? `Tool #${incident.tool_id}`}</div>
                              <div className="text-xs text-muted-foreground">{incident.tool?.tool_code}</div>
                            </TableCell>
                            <TableCell className="capitalize">{incident.type}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="capitalize">
                                {incident.status.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell>{incident.responsible_user?.name ?? incident.responsible_user_id}</TableCell>
                            <TableCell className="max-w-[220px] truncate text-muted-foreground">
                              {incident.notes || "—"}
                            </TableCell>
                            <TableCell>
                              {incident.replacement_tool
                                ? `${incident.replacement_tool.tool_code} · ${incident.replacement_tool.name}`
                                : "—"}
                            </TableCell>
                            <TableCell className="space-x-2 text-right">
                              {incident.status === "open" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    void updateToolIncident(incident.id, { status: "in_repair" })
                                      .then(() => loadIncidents())
                                      .then(() => toast.success("Marked in repair."))
                                      .catch((e) => toast.error(getApiErrorMessage(e, "Update failed.")))
                                  }
                                >
                                  Start repair
                                </Button>
                              ) : null}
                              {incident.status === "open" || incident.status === "in_repair" ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      void updateToolIncident(incident.id, {
                                        status: "replaced",
                                        create_replacement: true,
                                        resolution_notes: "Replacement registered from registry.",
                                      })
                                        .then(() => {
                                          loadIncidents();
                                          loadTools();
                                          toast.success("Replacement registered.");
                                        })
                                        .catch((e) =>
                                          toast.error(getApiErrorMessage(e, "Replacement failed.")),
                                        )
                                    }
                                  >
                                    Register replacement
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      void updateToolIncident(incident.id, {
                                        status: "written_off",
                                        resolution_notes: "Written off / lost.",
                                      })
                                        .then(() => loadIncidents())
                                        .then(() => toast.success("Written off."))
                                        .catch((e) =>
                                          toast.error(getApiErrorMessage(e, "Update failed.")),
                                        )
                                    }
                                  >
                                    Write off
                                  </Button>
                                </>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={returningIssuanceId !== null}
        onOpenChange={(open) => {
          if (!open) setReturningIssuanceId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return / close tool issuance</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {returningTool ? (
              <p className="text-sm text-muted-foreground">
                {returningTool.name} · {returningTool.tool_code}
              </p>
            ) : null}
            <div>
              <Label>Outcome</Label>
              <select
                className={selectClassName}
                value={returnForm.disposition}
                onChange={(e) =>
                  setReturnForm((current) => ({
                    ...current,
                    disposition: e.target.value as typeof returnForm.disposition,
                  }))
                }
              >
                <option value="returned">Returned (good/fair)</option>
                <option value="damaged">Returned damaged — log damage</option>
                <option value="lost">Mark lost — do not block install complete</option>
                <option value="replaced">Mark replaced — register replacement</option>
              </select>
            </div>
            {returnForm.disposition !== "returned" ? (
              <div>
                <Label>Notes</Label>
                <Textarea
                  placeholder="Damage / loss / replacement details…"
                  value={returnForm.notes}
                  onChange={(e) => setReturnForm((current) => ({ ...current, notes: e.target.value }))}
                />
              </div>
            ) : null}
            {returnForm.disposition === "replaced" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label>Replacement code (optional)</Label>
                  <Input
                    value={returnForm.replacement_code}
                    onChange={(e) =>
                      setReturnForm((current) => ({ ...current, replacement_code: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Replacement name (optional)</Label>
                  <Input
                    value={returnForm.replacement_name}
                    onChange={(e) =>
                      setReturnForm((current) => ({ ...current, replacement_name: e.target.value }))
                    }
                  />
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={returnSubmitting} onClick={() => setReturningIssuanceId(null)}>
              Cancel
            </Button>
            <Button disabled={returnSubmitting} onClick={() => void handleReturn()}>
              {returnSubmitting ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={issueDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetIssueForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {issueForProjectId
                ? "Issue tools to installation project"
                : "Issue tools to project"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {issueForProjectId ? (
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                {(() => {
                  const project =
                    projects.find((p) => p.id === issueForProjectId) ??
                    issueProjectOptions.find((p) => p.id === issueForProjectId);
                  return project
                    ? `${project.reference} · ${project.name} · ${formatStage(project.stage)}`
                    : `Project #${issueForProjectId}`;
                })()}
              </div>
            ) : (
              <>
                <select
                  className={selectClassName}
                  value={issueForm.project_id}
                  disabled={optionsLoading || issueSubmitting}
                  onChange={(event) =>
                    setIssueForm((current) => ({ ...current, project_id: event.target.value }))
                  }
                >
                  <option value="">
                    {optionsLoading ? "Loading projects…" : "Select project (required)…"}
                  </option>
                  {issueProjectOptions.map((project) => (
                    <option key={project.id} value={project.id}>
                      {INSTALL_STAGES.has(project.stage) ? "★ " : ""}
                      {project.reference} · {project.name} · {formatStage(project.stage)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Installation-stage projects are marked with ★ and listed first.
                </p>
              </>
            )}

            <select
              className={selectClassName}
              value={issueForm.issued_to}
              disabled={optionsLoading || issueSubmitting}
              onChange={(event) => setIssueForm((current) => ({ ...current, issued_to: event.target.value }))}
            >
              <option value="">{optionsLoading ? "Loading users…" : "Issue to user (responsible)"}</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} · {user.email}
                </option>
              ))}
            </select>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  Tools to issue
                  {selectedToolIds.length > 0 ? (
                    <span className="ml-2 text-muted-foreground font-normal">
                      ({selectedToolIds.length} selected)
                    </span>
                  ) : null}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={availableTools.length === 0 || issueSubmitting}
                    onClick={selectAllAvailableTools}
                  >
                    Select all
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={selectedToolIds.length === 0 || issueSubmitting}
                    onClick={clearSelectedTools}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {loading ? (
                <p className="text-sm text-muted-foreground">Loading tools…</p>
              ) : availableTools.length === 0 ? (
                <p className="text-sm text-muted-foreground">No available tools in the register.</p>
              ) : (
                <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                  {availableTools.map((tool) => {
                    const checked = tool.id in issueForm.selected;
                    const qty = issueForm.selected[tool.id] ?? "1";
                    return (
                      <label
                        key={tool.id}
                        className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          className="size-4 shrink-0"
                          checked={checked}
                          disabled={issueSubmitting}
                          onChange={(event) => toggleIssueTool(tool, event.target.checked)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{tool.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {tool.tool_code} · avail {tool.available_qty ?? 0}
                            {tool.tool_type ? ` · ${tool.tool_type}` : ""}
                          </div>
                        </div>
                        {tool.tracking_mode === "quantity" ? (
                          <Input
                            type="number"
                            min={1}
                            max={tool.available_qty ?? 1}
                            className="h-8 w-20"
                            value={qty}
                            disabled={!checked || issueSubmitting}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => setIssueToolQty(tool.id, event.target.value)}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">×1</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={issueSubmitting} onClick={resetIssueForm}>
              Cancel
            </Button>
            <Button
              disabled={
                issueSubmitting ||
                !issueForm.issued_to ||
                !issueForm.project_id ||
                selectedToolIds.length === 0
              }
              onClick={() => void handleIssue()}
            >
              {issueSubmitting
                ? "Issuing…"
                : selectedToolIds.length > 1
                  ? `Issue ${selectedToolIds.length} tools`
                  : "Issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
