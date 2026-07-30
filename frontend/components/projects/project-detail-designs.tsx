"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionGate } from "@/components/auth/permission-gate";
import { FabricationOpeningPreviewDialog } from "@/components/projects/fabrication-opening-preview-dialog";
import {
  getProject,
  getProjectDocuments,
  type ProjectDetail,
  type ProjectDocument,
} from "@/lib/api/projects";
import { importProjectFabricationList } from "@/lib/api/projects/design";
import { ApiError } from "@/lib/api/errors";
import { toast } from "sonner";
import { MediaImage } from "@/components/media/media-image";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FABRICATION_ACCEPT =
  ".xls,.xlsx,.csv,.txt,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function isImageFilename(filename: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(filename);
}

type ProjectDetailDesignsProps = {
  projectId: number;
  projectStage?: string;
  readOnly?: boolean;
  onProjectUpdated?: (project: ProjectDetail) => void;
  uploadTrigger?: number;
};

export function ProjectDetailDesigns({
  projectId,
  projectStage,
  readOnly = false,
  onProjectUpdated,
  uploadTrigger = 0,
}: ProjectDetailDesignsProps) {
  const fabricationInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [importingFabrication, setImportingFabrication] = useState(false);
  const [fabDragOver, setFabDragOver] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);

  async function loadDocuments() {
    setLoading(true);
    try {
      const response = await getProjectDocuments(projectId);
      setDocuments(response.data ?? []);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load documents.");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDocuments();
  }, [projectId]);

  useEffect(() => {
    if (uploadTrigger <= 0) return;
    fabricationInputRef.current?.click();
  }, [uploadTrigger]);

  const isDesignStage = projectStage === "final_design_approval";
  const fabricationDocs = documents.filter((doc) => doc.type === "fabrication");
  const fabricationDesigns = documents.filter(
    (doc) => doc.type === "design" && doc.metadata?.source === "fabrication",
  );
  const openingCount = fabricationDesigns.length;

  async function refreshProject() {
    if (!onProjectUpdated) return;
    const refreshed = await getProject(projectId);
    onProjectUpdated(refreshed.data);
  }

  async function handleFabricationImport(file: File) {
    setImportingFabrication(true);
    try {
      const result = await importProjectFabricationList(projectId, file);
      const { created = 0, updated = 0, unchanged = 0, removed = 0, images_saved } =
        result.summary;
      const parts = [
        created > 0 ? `${created} added` : null,
        updated > 0 ? `${updated} updated` : null,
        unchanged > 0 ? `${unchanged} unchanged` : null,
        removed > 0 ? `${removed} removed` : null,
      ].filter(Boolean);
      toast.success(
        parts.length > 0
          ? `Fabrication sync: ${parts.join(" · ")} (${images_saved} images saved).`
          : `Synced ${result.summary.designs_saved} openings (${images_saved} images saved).`,
      );
      await loadDocuments();
      await refreshProject();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to import fabrication list.",
      );
    } finally {
      setImportingFabrication(false);
      if (fabricationInputRef.current) fabricationInputRef.current.value = "";
    }
  }

  function handleDocumentTagged(updated: ProjectDocument) {
    setDocuments((prev) => prev.map((doc) => (doc.id === updated.id ? updated : doc)));
    setPreviewDoc(updated);
  }

  return (
    <div className="space-y-6">
      {!loading ? (
        openingCount > 0 ? (
          <Alert className="border-success/30 bg-success/10 text-success [&>svg]:text-success">
            <CheckCircle2 />
            <AlertTitle>
              {openingCount === 1
                ? "1 fabrication opening on file"
                : `${openingCount} fabrication openings on file`}
            </AlertTitle>
            <AlertDescription className="text-success/80">
              {isDesignStage
                ? "Elevations and descriptions extracted — ready for production once approved."
                : "Extracted for the production team."}
            </AlertDescription>
          </Alert>
        ) : isDesignStage ? (
          <Alert className="border-warning/30 bg-warning/10 text-warning [&>svg]:text-warning">
            <AlertCircle />
            <AlertTitle>Final design approval — fabrication list required</AlertTitle>
            <AlertDescription className="text-warning/90">
              Upload a WinCAD fabrication list to extract openings before advancing to BOM.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertCircle />
            <AlertTitle>No fabrication openings yet</AlertTitle>
            <AlertDescription>
              Upload a WinCAD fabrication list to extract elevations and descriptions for
              production.
            </AlertDescription>
          </Alert>
        )
      ) : null}

      {!readOnly ? (
        <PermissionGate permission="projects.documents.upload">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import fabrication list</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Upload a WinCAD fabrication workbook. We extract each opening&apos;s elevation
                image, code, series, dimensions, and material description for the production team.
              </p>
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    if (!importingFabrication) fabricationInputRef.current?.click();
                  }
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!importingFabrication) setFabDragOver(true);
                }}
                onDragLeave={() => setFabDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setFabDragOver(false);
                  if (importingFabrication) return;
                  const file = event.dataTransfer.files[0];
                  if (file) void handleFabricationImport(file);
                }}
                onClick={() => {
                  if (!importingFabrication) fabricationInputRef.current?.click();
                }}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
                  importingFabrication && "pointer-events-none opacity-60",
                  fabDragOver
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/30",
                )}
              >
                {importingFabrication ? (
                  <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
                ) : (
                  <FileSpreadsheet className="mb-3 h-10 w-10 text-muted-foreground" />
                )}
                <p className="text-sm font-medium">
                  {importingFabrication
                    ? "Extracting openings & images…"
                    : "Drop fabrication list or click to upload"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  .xls, .xlsx, .csv · syncs by opening code (keeps BOM tags)
                </p>
                <input
                  ref={fabricationInputRef}
                  type="file"
                  accept={FABRICATION_ACCEPT}
                  className="hidden"
                  disabled={importingFabrication}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleFabricationImport(file);
                  }}
                />
              </div>
              {fabricationDocs[0] ? (
                <p className="text-xs text-muted-foreground">
                  Current workbook:{" "}
                  <span className="font-medium">{fabricationDocs[0].filename}</span>
                  {fabricationDocs[0].metadata?.summary?.total_items
                    ? ` · ${fabricationDocs[0].metadata.summary.total_items} openings`
                    : null}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </PermissionGate>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fabrication openings for production</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : fabricationDesigns.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No openings extracted yet. Upload a fabrication list above.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {fabricationDesigns.map((doc) => {
                const meta = doc.metadata;
                const title =
                  meta?.code != null
                    ? `${meta.code}${meta.series ? ` · ${meta.series}` : ""}`
                    : doc.filename;
                const description = meta?.description ?? null;
                const showImage =
                  isImageFilename(doc.filename) || meta?.has_elevation_image === true;
                const taggedCount = meta?.bom_tags?.bom_line_ids?.length ?? 0;

                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setPreviewDoc(doc)}
                    className="overflow-hidden rounded-lg border border-border text-left transition-colors hover:border-primary/40 hover:bg-muted/20"
                  >
                    {showImage ? (
                      <MediaImage
                        src={doc.url}
                        alt={title}
                        className="h-40 w-full bg-muted object-contain"
                        fallback={
                          <div className="flex h-40 items-center justify-center bg-muted">
                            <ImageIcon className="h-10 w-10 text-muted-foreground" />
                          </div>
                        }
                      />
                    ) : (
                      <div className="flex h-40 flex-col items-center justify-center gap-2 bg-muted px-4 text-center">
                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          No elevation image in workbook
                        </p>
                      </div>
                    )}
                    <div className="space-y-2 p-3">
                      <p className="text-sm font-medium leading-snug">{title}</p>
                      {description ? (
                        <p className="line-clamp-3 text-xs text-muted-foreground">
                          {description}
                        </p>
                      ) : (
                        <p className="truncate text-xs text-muted-foreground">{doc.filename}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-emerald-600 text-[10px]">Fabrication</Badge>
                        {taggedCount > 0 ? (
                          <Badge variant="outline" className="text-[10px]">
                            BOM · {taggedCount}
                          </Badge>
                        ) : null}
                        <span className="ml-auto inline-flex items-center text-xs text-primary">
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          Open
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <FabricationOpeningPreviewDialog
        open={previewDoc != null}
        onOpenChange={(next) => {
          if (!next) setPreviewDoc(null);
        }}
        projectId={projectId}
        document={previewDoc}
        readOnly={readOnly}
        onTagged={handleDocumentTagged}
      />
    </div>
  );
}
