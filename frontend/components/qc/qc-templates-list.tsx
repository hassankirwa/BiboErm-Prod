"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  QC_CONTEXT_LABELS,
  type QcChecklistTemplate,
} from "@/lib/api/qc";

type QcTemplatesListProps = {
  templates: QcChecklistTemplate[];
  loading?: boolean;
  onEdit?: (template: QcChecklistTemplate) => void;
};

export function QcTemplatesList({ templates, loading, onEdit }: QcTemplatesListProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Loading templates...
        </CardContent>
      </Card>
    );
  }

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No templates found.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Context</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">{template.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {QC_CONTEXT_LABELS[template.context] ?? template.context}
                  </Badge>
                </TableCell>
                <TableCell>
                  {template.is_system ? (
                    <Badge>System</Badge>
                  ) : template.project ? (
                    <Link
                      href={`/projects/${template.project.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {template.project.reference}
                    </Link>
                  ) : template.project_id ? (
                    <span className="text-sm">Project #{template.project_id}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Global</span>
                  )}
                </TableCell>
                <TableCell>{template.items?.length ?? 0}</TableCell>
                <TableCell>
                  <Badge variant={template.is_active ? "default" : "secondary"}>
                    {template.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {onEdit && !template.is_system ? (
                    <Button variant="ghost" size="sm" onClick={() => onEdit(template)}>
                      Edit
                    </Button>
                  ) : template.is_system ? (
                    <span className="text-xs text-muted-foreground">Read-only</span>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
