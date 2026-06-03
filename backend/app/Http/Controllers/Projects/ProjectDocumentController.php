<?php

namespace App\Http\Controllers\Projects;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectDocument;
use App\Services\Media\FileStorageService;
use App\Support\BiboStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectDocumentController extends Controller
{
    public function __construct(
        protected FileStorageService $files,
    ) {}

    public function index(Project $project): JsonResponse
    {
        $this->authorize('view', $project);
        abort_unless(request()->user()->can('projects.documents.view') || request()->user()->can('projects.manage'), 403);

        $documents = $project->documents()->with('uploader')->get();

        return response()->json([
            'data' => $documents->map(fn (ProjectDocument $document) => $this->serialize($document))->all(),
        ]);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);
        abort_unless($request->user()->can('projects.documents.upload') || $request->user()->can('projects.manage'), 403);

        $validated = $request->validate([
            'file' => ['required', 'file', 'max:10240'],
            'type' => ['required', 'string', 'max:64'],
        ]);

        $stored = $this->files->store(
            $validated['file'],
            'project-documents',
            'project-'.$project->id
        );

        $version = ((int) ProjectDocument::query()
            ->where('project_id', $project->id)
            ->where('type', $validated['type'])
            ->max('version')) + 1;

        $document = ProjectDocument::query()->create([
            'project_id' => $project->id,
            'type' => $validated['type'],
            'filename' => $validated['file']->getClientOriginalName(),
            'path' => $stored['path'],
            'version' => $version,
            'uploaded_by' => $request->user()->id,
        ]);

        return response()->json([
            'data' => $this->serialize($document->load('uploader')),
        ], 201);
    }

    public function download(Project $project, ProjectDocument $document): JsonResponse
    {
        $this->authorize('view', $project);
        abort_unless(request()->user()->can('projects.documents.view') || request()->user()->can('projects.manage'), 403);

        if ((int) $document->project_id !== $project->id) {
            abort(404);
        }

        return response()->json([
            'data' => [
                'id' => $document->id,
                'filename' => $document->filename,
                'url' => BiboStorage::resolvePrivateApiUrl($document->path),
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function serialize(ProjectDocument $document): array
    {
        return [
            'id' => $document->id,
            'project_id' => $document->project_id,
            'type' => $document->type,
            'filename' => $document->filename,
            'path' => $document->path,
            'version' => $document->version,
            'uploaded_by' => $document->uploaded_by,
            'uploaded_by_user' => $document->relationLoaded('uploader') && $document->uploader ? [
                'id' => $document->uploader->id,
                'name' => $document->uploader->name,
                'email' => $document->uploader->email,
            ] : null,
            'url' => BiboStorage::resolvePrivateApiUrl($document->path),
            'created_at' => $document->created_at?->toIso8601String(),
        ];
    }
}
