"use client";

import { useEffect, useState } from "react";
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
import {
  createTool,
  issueTool,
  listTools,
  returnTool,
  type Tool,
} from "@/lib/api/warehouse";
import { listProjects, type ProjectSummary } from "@/lib/api/projects";
import { fetchUsers, type ApiUserDetail } from "@/lib/api/users";
import { toast } from "sonner";
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

export default function WarehouseToolsPage() {
  const [items, setItems] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<ApiUserDetail[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [issuingToolId, setIssuingToolId] = useState<number | null>(null);
  const [issueForm, setIssueForm] = useState({ issued_to: "", project_id: "" });
  const [form, setForm] = useState({
    tool_code: "",
    name: "",
    tool_type: "",
    condition: "good",
    purchase_date: "",
  });

  const load = () => {
    setLoading(true);
    listTools()
      .then((res) => setItems(res.data))
      .catch((error: Error) => toast.error(error.message || "Failed to load tools."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    Promise.all([fetchUsers({ status: "active" }), listProjects({ per_page: 100 })])
      .then(([usersRes, projectsRes]) => {
        setUsers(usersRes.data);
        setProjects(projectsRes.data);
      })
      .catch((error: Error) => toast.error(error.message || "Failed to load issue options."))
      .finally(() => setOptionsLoading(false));
  }, []);

  const submit = async () => {
    try {
      await createTool({
        tool_code: form.tool_code,
        name: form.name,
        tool_type: form.tool_type || undefined,
        condition: form.condition,
        purchase_date: form.purchase_date || undefined,
      });
      toast.success("Tool created.");
      setForm({ tool_code: "", name: "", tool_type: "", condition: "good", purchase_date: "" });
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create tool.");
    }
  };

  const handleIssue = async () => {
    if (!issuingToolId || !issueForm.issued_to) {
      return;
    }

    try {
      await issueTool(issuingToolId, {
        issued_to: Number(issueForm.issued_to),
        project_id: issueForm.project_id ? Number(issueForm.project_id) : undefined,
      });
      toast.success("Tool issued.");
      setIssuingToolId(null);
      setIssueForm({ issued_to: "", project_id: "" });
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to issue tool.");
    }
  };

  const handleReturn = async (tool: Tool) => {
    if (!tool.active_issuance?.id) {
      toast.error("No active issuance found.");
      return;
    }

    const condition = window.prompt("Condition on return (good, fair, damaged, retired):", tool.condition ?? "good");
    const damageNotes = condition && ["damaged", "retired"].includes(condition)
      ? window.prompt("Damage notes:") ?? ""
      : "";

    try {
      await returnTool(tool.active_issuance.id, {
        condition_in: condition || undefined,
        damage_notes: damageNotes || undefined,
      });
      toast.success("Tool returned.");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to return tool.");
    }
  };

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader title="Tools" subtitle="Register, issue, and return warehouse tools" />
      <div className="grid gap-6 p-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Register Tool</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Tool code" value={form.tool_code} onChange={(event) => setForm((current) => ({ ...current, tool_code: event.target.value }))} />
            <Input placeholder="Tool name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <Input placeholder="Tool type" value={form.tool_type} onChange={(event) => setForm((current) => ({ ...current, tool_type: event.target.value }))} />
            <Input placeholder="Condition" value={form.condition} onChange={(event) => setForm((current) => ({ ...current, condition: event.target.value }))} />
            <Input type="date" value={form.purchase_date} onChange={(event) => setForm((current) => ({ ...current, purchase_date: event.target.value }))} />
            <Button className="w-full" disabled={!form.tool_code || !form.name} onClick={submit}>
              Register tool
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tool Register</CardTitle>
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
                        <TableCell>{tool.condition ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={tool.is_issued ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}>
                            {tool.is_issued ? "Issued" : "Available"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {tool.is_issued ? (
                            <Button size="sm" onClick={() => handleReturn(tool)}>Return</Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setIssuingToolId(tool.id);
                                setIssueForm({ issued_to: "", project_id: "" });
                              }}
                            >
                              Issue
                            </Button>
                          )}
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

      <Dialog
        open={issuingToolId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIssuingToolId(null);
            setIssueForm({ issued_to: "", project_id: "" });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue tool</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <select
              className={selectClassName}
              value={issueForm.issued_to}
              disabled={optionsLoading}
              onChange={(event) => setIssueForm((current) => ({ ...current, issued_to: event.target.value }))}
            >
              <option value="">{optionsLoading ? "Loading users…" : "Issue to user"}</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} · {user.email}
                </option>
              ))}
            </select>
            <select
              className={selectClassName}
              value={issueForm.project_id}
              disabled={optionsLoading}
              onChange={(event) => setIssueForm((current) => ({ ...current, project_id: event.target.value }))}
            >
              <option value="">{optionsLoading ? "Loading projects…" : "Project (optional)"}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.reference} · {project.name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssuingToolId(null)}>
              Cancel
            </Button>
            <Button disabled={!issueForm.issued_to} onClick={handleIssue}>
              Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
