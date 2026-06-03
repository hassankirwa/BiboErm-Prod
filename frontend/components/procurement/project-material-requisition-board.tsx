"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatProjectStage, type ProjectMaterialLine, type ProjectMaterialShortageEntry } from "@/lib/api/projects";

type ProjectMaterialRequisitionBoardProps = {
  entries: ProjectMaterialShortageEntry[];
  mode: "actionable" | "requisitioned";
  creatingProjectId?: number | null;
  onCreate?: (projectId: number, lineIds: number[], notes?: string) => Promise<void>;
  emptyMessage: string;
};

export function ProjectMaterialRequisitionBoard({
  entries,
  mode,
  creatingProjectId = null,
  onCreate,
  emptyMessage,
}: ProjectMaterialRequisitionBoardProps) {
  const [selectedByProject, setSelectedByProject] = useState<Record<number, number[]>>({});
  const [notesByProject, setNotesByProject] = useState<Record<number, string>>({});

  const visibleEntries = useMemo(
    () =>
      entries
        .map((entry) => ({
          ...entry,
          visible_lines:
            mode === "actionable" ? entry.actionable_lines ?? [] : entry.requisitioned_lines ?? [],
        }))
        .filter((entry) => entry.visible_lines.length > 0),
    [entries, mode],
  );

  if (visibleEntries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  const toggleLine = (projectId: number, lineId: number, checked: boolean) => {
    setSelectedByProject((current) => {
      const selected = new Set(current[projectId] ?? []);
      if (checked) {
        selected.add(lineId);
      } else {
        selected.delete(lineId);
      }
      return { ...current, [projectId]: Array.from(selected) };
    });
  };

  const selectAll = (projectId: number, lines: ProjectMaterialLine[], checked: boolean) => {
    setSelectedByProject((current) => ({
      ...current,
      [projectId]: checked ? lines.map((line) => line.bom_line_id) : [],
    }));
  };

  return (
    <div className="space-y-6">
      {visibleEntries.map((entry) => {
        const selected = selectedByProject[entry.project.id] ?? [];
        const notes = notesByProject[entry.project.id] ?? "";
        const allSelected =
          entry.visible_lines.length > 0 && selected.length === entry.visible_lines.length;

        return (
          <Card key={`${mode}-${entry.project.id}`}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">
                  <Link
                    href={`/projects/${entry.project.id}`}
                    className="text-primary hover:underline"
                  >
                    {entry.project.name}
                  </Link>
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {entry.project.reference}
                  {entry.project.account ? ` · ${entry.project.account.name}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{formatProjectStage(entry.project.stage)}</Badge>
                <Badge variant="secondary">
                  {entry.visible_lines.length} line{entry.visible_lines.length === 1 ? "" : "s"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {mode === "actionable" && onCreate ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed px-3 py-2 text-sm">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked) =>
                        selectAll(entry.project.id, entry.visible_lines, Boolean(checked))
                      }
                    />
                    <span>Select all actionable lines</span>
                  </label>
                  <span className="text-muted-foreground">
                    {selected.length} selected for requisition
                  </span>
                </div>
              ) : null}

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {mode === "actionable" && onCreate ? <TableHead className="w-12">Pick</TableHead> : null}
                      <TableHead>Material</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead className="text-right">Required</TableHead>
                      <TableHead className="text-right">Reserved</TableHead>
                      <TableHead className="text-right">To Requisition</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Requisitions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entry.visible_lines.map((line) => (
                      <TableRow key={`${entry.project.id}-${line.bom_line_id}`}>
                        {mode === "actionable" && onCreate ? (
                          <TableCell>
                            <Checkbox
                              checked={selected.includes(line.bom_line_id)}
                              onCheckedChange={(checked) =>
                                toggleLine(entry.project.id, line.bom_line_id, Boolean(checked))
                              }
                            />
                          </TableCell>
                        ) : null}
                        <TableCell>{line.material_name}</TableCell>
                        <TableCell>{line.material_code ?? "—"}</TableCell>
                        <TableCell className="text-right">{line.required_qty}</TableCell>
                        <TableCell className="text-right">{line.reserved_qty}</TableCell>
                        <TableCell className="text-right font-medium">
                          {line.is_procurement_only && Number(line.quantity_to_requisition) > 0
                            ? line.quantity_to_requisition
                            : line.quantity_to_requisition}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {line.is_procurement_only ? (
                              <Badge variant="outline" className="text-[10px]">
                                Procurement only
                              </Badge>
                            ) : null}
                            {line.is_glass ? (
                              <Badge variant="outline" className="text-[10px]">
                                Glass
                              </Badge>
                            ) : null}
                            {line.is_addon ? (
                              <Badge variant="outline" className="text-[10px]">
                                Add-on
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          {line.requisitions.length === 0 ? (
                            <span className="text-xs text-muted-foreground">None</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {line.requisitions.map((requisition) => (
                                <Badge key={requisition.id} variant="secondary" className="text-[10px]">
                                  {requisition.reference}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {mode === "actionable" && onCreate ? (
                <div className="space-y-3 rounded-md border p-4">
                  <Textarea
                    value={notes}
                    onChange={(event) =>
                      setNotesByProject((current) => ({
                        ...current,
                        [entry.project.id]: event.target.value,
                      }))
                    }
                    placeholder="Optional note for this project requisition"
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button
                      disabled={selected.length === 0 || creatingProjectId === entry.project.id}
                      onClick={() => onCreate(entry.project.id, selected, notes.trim() || undefined)}
                    >
                      {creatingProjectId === entry.project.id
                        ? "Creating requisition..."
                        : "Create requisition"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
