<?php

namespace App\Http\Controllers\Crm\Deals;

use App\Enums\Crm\SiteVisitStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Crm\DealResource;
use App\Models\Deal;
use App\Models\SiteVisit;
use App\Services\Crm\SiteVisits\SiteVisitWorkflowService;
use App\Services\Media\FileStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class DealSiteAssessmentController extends Controller
{
    public function __construct(
        protected FileStorageService $files,
        protected SiteVisitWorkflowService $workflowService,
    ) {}

    public function update(Request $request, Deal $deal): JsonResponse
    {
        $this->authorize('manageSiteAssessment', $deal);

        $validated = $request->validate([
            'doors_count' => ['nullable', 'integer', 'min:0'],
            'doors' => ['nullable', 'array'],
            'doors.*.label' => ['required', 'string', 'max:100'],
            'doors.*.width_ft' => ['nullable', 'numeric', 'min:0'],
            'doors.*.height_ft' => ['nullable', 'numeric', 'min:0'],
            'doors.*.notes' => ['nullable', 'string', 'max:1000'],
            'windows_count' => ['nullable', 'integer', 'min:0'],
            'windows' => ['nullable', 'array'],
            'windows.*.label' => ['required', 'string', 'max:100'],
            'windows.*.width_ft' => ['nullable', 'numeric', 'min:0'],
            'windows.*.height_ft' => ['nullable', 'numeric', 'min:0'],
            'windows.*.notes' => ['nullable', 'string', 'max:1000'],
            'balconies_count' => ['nullable', 'integer', 'min:0'],
            'balconies' => ['nullable', 'array'],
            'balconies.*.label' => ['required', 'string', 'max:100'],
            'balconies.*.shape' => ['nullable', 'string', 'in:rectangle,l_shape,pentagon,hexagon,irregular'],
            'balconies.*.width_ft' => ['nullable', 'numeric', 'min:0'],
            'balconies.*.height_ft' => ['nullable', 'numeric', 'min:0'],
            'balconies.*.notes' => ['nullable', 'string', 'max:1000'],
            'balconies.*.dimensions_description' => ['nullable', 'string', 'max:1000'],
            'balconies.*.side_measurements_ft' => ['nullable', 'array'],
            'balconies.*.images' => ['nullable', 'array'],
            'bathrooms_count' => ['nullable', 'integer', 'min:0'],
            'bathrooms' => ['nullable', 'array'],
            'bathrooms.*.label' => ['required', 'string', 'max:100'],
            'bathrooms.*.shape' => ['nullable', 'string', 'in:rectangle,l_shape,pentagon,hexagon,irregular'],
            'bathrooms.*.width_ft' => ['nullable', 'numeric', 'min:0'],
            'bathrooms.*.height_ft' => ['nullable', 'numeric', 'min:0'],
            'bathrooms.*.notes' => ['nullable', 'string', 'max:1000'],
            'bathrooms.*.dimensions_description' => ['nullable', 'string', 'max:1000'],
            'bathrooms.*.side_measurements_ft' => ['nullable', 'array'],
            'bathrooms.*.images' => ['nullable', 'array'],
            'additional_images' => ['nullable', 'array'],
            'additional_images.*.path' => ['required', 'string', 'max:512'],
            'additional_images.*.url' => ['nullable', 'string', 'max:1024'],
            'additional_images.*.original_name' => ['required', 'string', 'max:255'],
            'operational_notes' => ['nullable', 'string', 'max:5000'],
            'access_constraints' => ['nullable', 'string', 'max:5000'],
            'fabrication_concerns' => ['nullable', 'string', 'max:5000'],
        ]);

        $deal->update(['site_assessment' => $validated]);
        $deal->refresh();

        $openStatuses = [
            SiteVisitStatus::Scheduled->value,
            SiteVisitStatus::Assigned->value,
            SiteVisitStatus::InProgress->value,
            SiteVisitStatus::MeasurementsCaptured->value,
        ];

        $visit = SiteVisit::query()
            ->where('deal_id', $deal->id)
            ->whereIn('status', $openStatuses)
            ->orderByDesc('id')
            ->first();

        if ($visit && $this->workflowService->assessmentHasMeasurableData($validated)) {
            $this->workflowService->syncDealAssessmentToVisit($visit, $request->user(), $validated);
        }

        return response()->json(['data' => new DealResource($deal)]);
    }

    public function storeImage(Request $request, Deal $deal): JsonResponse
    {
        $this->authorize('manageSiteAssessment', $deal);

        $validated = $request->validate([
            'file' => ['required', 'file', 'max:10240'],
        ]);

        $stored = $this->files->store(
            $validated['file'],
            'site-assessment',
            'deal-'.$deal->id
        );

        return response()->json([
            'data' => [
                'path' => $stored['path'],
                'url' => $stored['url'],
                'original_name' => $validated['file']->getClientOriginalName(),
            ],
        ], 201);
    }

    public function destroyImage(Request $request, Deal $deal): JsonResponse
    {
        $this->authorize('manageSiteAssessment', $deal);

        $validated = $request->validate([
            'path' => ['required', 'string', 'max:512'],
        ]);

        $path = ltrim(str_replace('\\', '/', $validated['path']), '/');
        $expectedPrefix = "private/site-assessment/deal-{$deal->id}/";

        if (! str_starts_with($path, $expectedPrefix)) {
            throw ValidationException::withMessages([
                'path' => ['Invalid image path for this deal.'],
            ]);
        }

        $this->files->delete($path);

        return response()->json(['data' => ['deleted' => true]]);
    }
}
