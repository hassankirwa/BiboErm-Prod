<?php

namespace App\Http\Controllers\Projects;

use App\Enums\ProjectStage;
use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\Media\FileStorageService;
use App\Services\Projects\ProjectStageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ProjectSiteAssessmentController extends Controller
{
    public function __construct(
        protected FileStorageService $files,
        protected ProjectStageService $stages,
    ) {}

    public function storeImage(Request $request, Project $project): JsonResponse
    {
        $this->authorize('recordSiteAssessmentNotes', $project);
        $this->assertEditableStage($project);

        $validated = $request->validate([
            'file' => ['required', 'file', 'max:10240'],
        ]);

        $stored = $this->files->store(
            $validated['file'],
            'site-assessment',
            'project-'.$project->id
        );

        return response()->json([
            'data' => [
                'path' => $stored['path'],
                'url' => $stored['url'],
                'original_name' => $validated['file']->getClientOriginalName(),
            ],
        ], 201);
    }

    public function destroyImage(Request $request, Project $project): JsonResponse
    {
        $this->authorize('recordSiteAssessmentNotes', $project);
        $this->assertEditableStage($project);

        $validated = $request->validate([
            'path' => ['required', 'string', 'max:512'],
        ]);

        $path = ltrim(str_replace('\\', '/', $validated['path']), '/');
        $expectedPrefix = "private/site-assessment/project-{$project->id}/";

        if (! str_starts_with($path, $expectedPrefix)) {
            throw ValidationException::withMessages([
                'path' => ['Invalid image path for this project.'],
            ]);
        }

        $this->files->delete($path);

        return response()->json(['data' => ['deleted' => true]]);
    }

    protected function assertEditableStage(Project $project): void
    {
        if ($this->stages->currentStage($project) !== ProjectStage::SiteAssessment) {
            throw ValidationException::withMessages([
                'stage' => ['Site assessment data can only be updated while the project is in site assessment.'],
            ]);
        }
    }
}
