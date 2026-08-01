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
        abort_unless(
            request()->user()->can('projects.documents.view')
                || request()->user()->can('projects.manage')
                || request()->user()->can('production.view'),
            403
        );

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
        abort_unless(
            request()->user()->can('projects.documents.view')
                || request()->user()->can('projects.manage')
                || request()->user()->can('production.view'),
            403
        );

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

    public function update(Request $request, Project $project, ProjectDocument $document): JsonResponse
    {
        $this->authorize('update', $project);
        abort_unless($request->user()->can('projects.documents.upload') || $request->user()->can('projects.manage'), 403);

        if ((int) $document->project_id !== $project->id) {
            abort(404);
        }

        $validated = $request->validate([
            'bom_line_ids' => ['required', 'array'],
            'bom_line_ids.*' => ['integer'],
        ]);

        $bomLineIds = array_values(array_unique(array_map('intval', $validated['bom_line_ids'])));
        $bom = $project->latestBom()->with('lines')->first();

        if ($bomLineIds !== [] && $bom === null) {
            return response()->json([
                'message' => 'No BOM is available to tag on this project.',
            ], 422);
        }

        if ($bom !== null && $bomLineIds !== []) {
            $validIds = $bom->lines->pluck('id')->map(fn ($id) => (int) $id)->all();
            $invalid = array_values(array_diff($bomLineIds, $validIds));
            if ($invalid !== []) {
                return response()->json([
                    'message' => 'One or more BOM lines do not belong to this project\'s latest BOM.',
                    'invalid_bom_line_ids' => $invalid,
                ], 422);
            }
        }

        $metadata = is_array($document->metadata) ? $document->metadata : [];
        $metadata['bom_tags'] = [
            'bom_id' => $bom?->id,
            'bom_line_ids' => $bomLineIds,
            'tagged_at' => now()->toIso8601String(),
            'tagged_by' => $request->user()->id,
        ];

        $document->update(['metadata' => $metadata]);

        return response()->json([
            'data' => $this->serialize($document->fresh()->load('uploader')),
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
            'metadata' => $document->metadata,
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
