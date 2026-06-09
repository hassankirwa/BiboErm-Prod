"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PermissionGate } from "@/components/auth/permission-gate";
import {
  getProject,
  getProjectDocuments,
  uploadProjectDocument,
  type ProjectDetail,
  type ProjectDocument,
} from "@/lib/api/projects";
import { ApiError } from "@/lib/api/errors";
import { toast } from "sonner";
import { MediaImage } from "@/components/media/media-image";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  ImageIcon,
  Loader2,
  Upload,
} from "lucide-react";
import {
  acquireAuthenticatedFileObjectUrl,
  isPrivateFileApiUrl,
  releaseAuthenticatedFileObjectUrl,
} from "@/lib/authenticated-file";
import { cn } from "@/lib/utils";

const DOCUMENT_TYPES = [
  { value: "design", label: "Design drawing / image" },
  { value: "works_plan", label: "Works plan" },
  { value: "client_attachment", label: "Client attachment" },
];

const ACCEPTED_FILES = "image/*,.pdf,.dwg,.dxf";

function isImageFilename(filename: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(filename);
}

function designDocumentCount(documents: ProjectDocument[]): number {
  return documents.filter((doc) =>
    ["design", "design_pdf", "design_dwg"].includes(doc.type),
  ).length;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [docType, setDocType] = useState("design");

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
    setDocType("design");
    fileInputRef.current?.click();
  }, [uploadTrigger]);

  const isDesignStage = projectStage === "final_design_approval";
  const designCount = designDocumentCount(documents);
  const designDocs = documents.filter((doc) =>
    ["design", "works_plan", "client_attachment"].includes(doc.type),
  );

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const response = await uploadProjectDocument(projectId, file, docType);
      setDocuments((prev) => [response.data, ...prev]);
      toast.success("Document uploaded.");
      if (onProjectUpdated) {
        const refreshed = await getProject(projectId);
        onProjectUpdated(refreshed.data);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to upload document.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleFileSelected(file: File | null | undefined) {
    if (file) void handleUpload(file);
  }

  return (
    <div className="space-y-6">
      {!loading ? (
        designCount > 0 ? (
          <Alert className="border-success/30 bg-success/10 text-success [&>svg]:text-success">
            <CheckCircle2 />
            <AlertTitle>
              {designCount === 1
                ? "1 design document on file"
                : `${designCount} design documents on file`}
            </AlertTitle>
            {isDesignStage ? (
              <AlertDescription className="text-success/80">
                {designDocs.length > designCount
                  ? `${designDocs.length} total documents uploaded — ready to advance to BOM once approved.`
                  : "Upload complete — you can advance to BOM once the design is approved."}
              </AlertDescription>
            ) : designDocs.length > designCount ? (
              <AlertDescription className="text-success/80">
                {designDocs.length - designCount} additional supporting document
                {designDocs.length - designCount === 1 ? "" : "s"} also on file.
              </AlertDescription>
            ) : null}
          </Alert>
        ) : isDesignStage ? (
          <Alert className="border-warning/30 bg-warning/10 text-warning [&>svg]:text-warning">
            <AlertCircle />
            <AlertTitle>Final design approval — upload required</AlertTitle>
            <AlertDescription className="text-warning/90">
              Upload at least one design PDF or drawing before advancing to BOM.
            </AlertDescription>
          </Alert>
        ) : designDocs.length === 0 ? (
          <Alert>
            <AlertCircle />
            <AlertTitle>No design documents yet</AlertTitle>
            <AlertDescription>
              Upload drawings, works plans, or client attachments below.
            </AlertDescription>
          </Alert>
        ) : null
      ) : null}

      {!readOnly ? (
      <PermissionGate permission="projects.documents.upload">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload design / documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:max-w-xs">
              <Label htmlFor="design-doc-type">Document type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger id="design-doc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (!uploading) fileInputRef.current?.click();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                if (!uploading) setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                if (uploading) return;
                handleFileSelected(event.dataTransfer.files[0]);
              }}
              onClick={() => {
                if (!uploading) fileInputRef.current?.click();
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
                uploading && "pointer-events-none opacity-60",
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/30",
              )}
            >
              {uploading ? (
                <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
              ) : (
                <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
              )}
              <p className="text-sm font-medium">
                {uploading ? "Uploading…" : "Drop file here or click to upload"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Images, PDF, DWG, or DXF
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FILES}
                className="hidden"
                disabled={uploading}
                onChange={(event) => {
                  handleFileSelected(event.target.files?.[0]);
                }}
              />
            </div>
          </CardContent>
        </Card>
      </PermissionGate>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Design gallery & files</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : designDocs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No design documents uploaded yet.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {designDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="overflow-hidden rounded-lg border border-border"
                >
                  {isImageFilename(doc.filename) ? (
                    <MediaImage
                      src={doc.url}
                      alt={doc.filename}
                      className="h-40 w-full bg-muted object-cover"
                      fallback={
                        <div className="flex h-40 items-center justify-center bg-muted">
                          <ImageIcon className="h-10 w-10 text-muted-foreground" />
                        </div>
                      }
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center bg-muted">
                      <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  <div className="space-y-2 p-3">
                    <p className="truncate text-sm font-medium">{doc.filename}</p>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {doc.type.replace(/_/g, " ")} v{doc.version}
                      </Badge>
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={doc.url && isPrivateFileApiUrl(doc.url) ? "#" : doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={
                            doc.url && isPrivateFileApiUrl(doc.url)
                              ? (event) => {
                                  event.preventDefault();
                                  void acquireAuthenticatedFileObjectUrl(doc.url).then(
                                    (objectUrl) => {
                                      if (!objectUrl) return;

                                      window.open(objectUrl, "_blank", "noopener,noreferrer");
                                      window.setTimeout(
                                        () => releaseAuthenticatedFileObjectUrl(doc.url),
                                        30_000,
                                      );
                                    },
                                  );
                                }
                              : undefined
                          }
                        >
                          <Download className="mr-1 h-3.5 w-3.5" />
                          Open
                        </a>
                      </Button>
                    </div>
                    {doc.uploaded_by_user ? (
                      <p className="text-[10px] text-muted-foreground">
                        by {doc.uploaded_by_user.name}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
